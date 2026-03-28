"""
缓存管理器 - 增强版

核心特性：
1. 完整的版本管理（HEAM、Terraform、MCP服务）
2. 数据完整性校验（SHA256）
3. 智能验证（版本兼容性、数据完整性、过期检查）
4. 智能体友好的错误提示
"""

import json
import hashlib
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, List
import structlog

logger = structlog.get_logger(__name__)


class CacheValidationError(Exception):
    """缓存验证错误"""
    def __init__(self, reason: str, details: Dict = None):
        self.reason = reason
        self.details = details or {}
        super().__init__(reason)


class CacheManager:
    """
    增强的缓存管理器

    遵循 harness-engineering 原则：
    - 所有数据带版本和校验和
    - 智能体可自动判断缓存有效性
    - 提供详细的验证信息
    """

    def __init__(self, data_dir: Path):
        """
        初始化缓存管理器

        Args:
            data_dir: 项目数据目录（.deployment-kit/）
        """
        self.data_dir = Path(data_dir)
        self.cache_dir = self.data_dir / 'cache'

    def save_with_metadata(
        self,
        appid: str,
        resources: Dict[str, Any],
        manifest: Dict[str, Any],
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        保存缓存数据（带完整元数据）

        Args:
            appid: 应用ID
            resources: 资源数据
            manifest: 资源清单
            metadata: 额外的元数据

        Returns:
            保存的元数据
        """
        app_cache_dir = self.cache_dir / appid
        app_cache_dir.mkdir(parents=True, exist_ok=True)

        # 1. 保存资源数据
        resources_file = app_cache_dir / 'resources.json'
        resources_file.write_text(
            json.dumps(resources, indent=2, ensure_ascii=False),
            encoding='utf-8'
        )

        # 2. 保存清单
        manifest_file = app_cache_dir / 'manifest.json'
        manifest_file.write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False),
            encoding='utf-8'
        )

        # 3. 生成增强的元数据
        enhanced_metadata = self._generate_metadata(
            appid=appid,
            resources=resources,
            manifest=manifest,
            additional_metadata=metadata
        )

        # 4. 保存元数据
        metadata_file = app_cache_dir / 'metadata.json'
        metadata_file.write_text(
            json.dumps(enhanced_metadata, indent=2, ensure_ascii=False),
            encoding='utf-8'
        )

        logger.info(
            "cache_saved",
            appid=appid,
            cache_dir=str(app_cache_dir),
            resources_count=len(resources.get('resources', {})),
            ttl=enhanced_metadata['cache_info']['ttl']
        )

        return enhanced_metadata

    def _generate_metadata(
        self,
        appid: str,
        resources: Dict,
        manifest: Dict,
        additional_metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """生成增强的缓存元数据"""

        now = datetime.now(timezone.utc)
        ttl = 3600  # 1小时默认TTL
        expires_at = datetime.fromtimestamp(now.timestamp() + ttl, timezone.utc)

        # 计算校验和
        resources_json = json.dumps(resources, sort_keys=True)
        resources_checksum = hashlib.sha256(resources_json.encode()).hexdigest()

        manifest_json = json.dumps(manifest, sort_keys=True)
        manifest_checksum = hashlib.sha256(manifest_json.encode()).hexdigest()

        # 组合校验和
        state_hash = hashlib.sha256(
            f"{resources_checksum}{manifest_checksum}".encode()
        ).hexdigest()

        # 构建元数据
        metadata = {
            "appid": appid,
            "cache_info": {
                "created_at": now.isoformat(),
                "last_accessed": now.isoformat(),
                "ttl": ttl,
                "expires_at": expires_at.isoformat(),
                "size_bytes": len(resources_json.encode()) + len(manifest_json.encode()),

                # 版本信息
                "versions": self._get_versions(),

                # 完整性校验
                "integrity": {
                    "state_hash": f"sha256:{state_hash}",
                    "resources_checksum": f"sha256:{resources_checksum}",
                    "manifest_checksum": f"sha256:{manifest_checksum}",
                    "metadata_checksum": ""  # 稍后填充
                },

                # 来源信息
                "source": self._get_source_info(resources),

                # 使用统计
                "usage_stats": {
                    "last_accessed": now.isoformat(),
                    "access_count": 0,
                    "last_validation": now.isoformat()
                }
            }
        }

        # 合并额外的元数据
        if additional_metadata:
            metadata['cache_info'].update(additional_metadata)

        # 计算自身的校验和
        metadata_json = json.dumps(metadata, sort_keys=True)
        metadata_checksum = hashlib.sha256(metadata_json.encode()).hexdigest()
        metadata['cache_info']['integrity']['metadata_checksum'] = f"sha256:{metadata_checksum}"

        return metadata

    def _get_versions(self) -> Dict[str, str]:
        """获取当前环境的版本信息"""
        # TODO: 实际实现需要检测环境
        # 这里返回模拟版本
        return {
            "heam_protocol": "1.2.0",
            "terraform": "1.5.7",
            "mcp_service": "1.0.0",
            "deployment_kit": "1.0.0"
        }

    def _get_source_info(self, resources: Dict) -> Dict[str, Any]:
        """获取数据来源信息"""
        resource_types = list(resources.get('resources', {}).keys())

        return {
            "mcp_endpoint": "mcp.huaweicloud.com",
            "fetch_method": "batch_concurrent",
            "resource_types": resource_types,
            "resource_count": len(resource_types)
        }

    def validate_cache(self, appid: str) -> Dict[str, Any]:
        """
        验证缓存是否可用（智能体可调用）

        这是智能体判断缓存有效性的主要接口

        Returns:
            {
                'valid': bool,
                'reason': str,
                'can_use': bool,
                'fresh': bool,
                'recommendation': str,
                'details': dict
            }
        """
        app_cache_dir = self.cache_dir / appid
        metadata_file = app_cache_dir / 'metadata.json'

        # 检查1: 缓存是否存在
        if not metadata_file.exists():
            return {
                'valid': False,
                'reason': 'cache_not_found',
                'can_use': False,
                'fresh': False,
                'recommendation': f'运行: dk discover --appid {appid}',
                'details': {
                    'cache_dir': str(app_cache_dir)
                }
            }

        # 加载元数据
        try:
            metadata = json.loads(metadata_file.read_text(encoding='utf-8'))
        except Exception as e:
            logger.error("metadata_load_failed", appid=appid, error=str(e))
            return {
                'valid': False,
                'reason': 'metadata_corrupted',
                'can_use': False,
                'fresh': False,
                'recommendation': f'缓存元数据损坏，运行: dk discover --appid {appid} --fresh',
                'details': {'error': str(e)}
            }

        # 检查2: 版本兼容性
        version_check = self._check_versions(metadata)
        if not version_check['compatible']:
            return {
                'valid': False,
                'reason': 'version_incompatible',
                'can_use': False,
                'fresh': False,
                'recommendation': f'HEAM/Terraform版本不兼容，运行: dk discover --appid {appid} --fresh',
                'details': version_check
            }

        # 检查3: 数据完整性
        integrity_check = self._check_integrity(appid, metadata)
        if not integrity_check['passed']:
            return {
                'valid': False,
                'reason': 'integrity_check_failed',
                'can_use': False,
                'fresh': False,
                'recommendation': f'缓存数据已损坏，运行: dk discover --appid {appid} --fresh',
                'details': integrity_check
            }

        # 检查4: 是否过期
        expiry_check = self._check_expiry(metadata)
        if not expiry_check['fresh']:
            return {
                'valid': True,
                'reason': 'cache_expired',
                'can_use': True,  # 过期但仍可用
                'fresh': False,
                'recommendation': f'缓存已过期（{expiry_check["age_seconds"]/60:.0f}分钟），建议刷新: dk discover --appid {appid} --refresh',
                'details': expiry_check
            }

        # 所有检查通过
        # 更新访问统计
        self._update_access_stats(appid, metadata)

        return {
            'valid': True,
            'reason': 'all_checks_passed',
            'can_use': True,
            'fresh': True,
            'recommendation': '缓存有效，可直接使用',
            'details': {
                'created_at': metadata['cache_info']['created_at'],
                'expires_at': metadata['cache_info']['expires_at'],
                'access_count': metadata['cache_info']['usage_stats']['access_count']
            }
        }

    def _check_versions(self, metadata: Dict) -> Dict[str, Any]:
        """检查版本兼容性"""
        cached_versions = metadata['cache_info']['versions']
        current_versions = self._get_versions()

        issues = []

        # 检查 HEAM 协议版本
        if not self._is_compatible(
            current_versions['heam_protocol'],
            cached_versions['heam_protocol']
        ):
            issues.append({
                'component': 'heam_protocol',
                'current': current_versions['heam_protocol'],
                'cached': cached_versions['heam_protocol'],
                'compatible': False
            })

        # 检查 Terraform 版本
        if not self._is_compatible(
            current_versions['terraform'],
            cached_versions['terraform']
        ):
            issues.append({
                'component': 'terraform',
                'current': current_versions['terraform'],
                'cached': cached_versions['terraform'],
                'compatible': False
            })
        else:
            # 兼容，但可能有小版本差异
            if current_versions['terraform'] != cached_versions['terraform']:
                logger.info(
                    "terraform_version_mismatch",
                    current=current_versions['terraform'],
                    cached=cached_versions['terraform']
                )

        return {
            'compatible': len(issues) == 0,
            'issues': issues,
            'current_versions': current_versions,
            'cached_versions': cached_versions
        }

    def _is_compatible(self, current: str, cached: str) -> bool:
        """
        检查版本兼容性

        简单实现：主版本号相同即兼容
        TODO: 根据实际语义化版本规则实现
        """
        try:
            current_major = int(current.split('.')[0])
            cached_major = int(cached.split('.')[0])
            return current_major == cached_major
        except:
            # 如果版本解析失败，保守地认为兼容
            return True

    def _check_integrity(self, appid: str, metadata: Dict) -> Dict[str, Any]:
        """检查数据完整性"""
        app_cache_dir = self.cache_dir / appid
        integrity = metadata['cache_info']['integrity']
        errors = []

        # 检查 resources.json 的哈希
        resources_file = app_cache_dir / 'resources.json'
        if resources_file.exists():
            current_hash = self._calculate_file_hash(resources_file)
            expected_hash = integrity['resources_checksum']

            if current_hash != expected_hash:
                errors.append({
                    'file': 'resources.json',
                    'expected': expected_hash,
                    'actual': current_hash
                })

        # 检查 manifest.json 的哈希
        manifest_file = app_cache_dir / 'manifest.json'
        if manifest_file.exists():
            current_hash = self._calculate_file_hash(manifest_file)
            expected_hash = integrity['manifest_checksum']

            if current_hash != expected_hash:
                errors.append({
                    'file': 'manifest.json',
                    'expected': expected_hash,
                    'actual': current_hash
                })

        # 检查 metadata.json 自身的哈希
        metadata_file = app_cache_dir / 'metadata.json'
        if metadata_file.exists():
            # 重新计算不包含 metadata_checksum 的哈希
            metadata_content = json.loads(metadata_file.read_text(encoding='utf-8'))
            metadata_content['cache_info']['integrity']['metadata_checksum'] = ""
            metadata_json = json.dumps(metadata_content, sort_keys=True)
            current_hash = f"sha256:{hashlib.sha256(metadata_json.encode()).hexdigest()}"
            expected_hash = integrity['metadata_checksum']

            if current_hash != expected_hash:
                errors.append({
                    'file': 'metadata.json',
                    'expected': expected_hash,
                    'actual': current_hash
                })

        return {
            'passed': len(errors) == 0,
            'errors': errors
        }

    def _calculate_file_hash(self, file_path: Path) -> str:
        """计算文件的 SHA256 哈希"""
        content = file_path.read_text(encoding='utf-8')
        return f"sha256:{hashlib.sha256(content.encode()).hexdigest()}"

    def _check_expiry(self, metadata: Dict) -> Dict[str, Any]:
        """检查是否过期"""
        expires_at_str = metadata['cache_info']['expires_at']
        expires_at = datetime.fromisoformat(expires_at_str)
        now = datetime.now(timezone.utc)

        age_seconds = (now - expires_at).total_seconds()

        return {
            'fresh': now < expires_at,
            'expires_at': expires_at_str,
            'age_seconds': max(0, age_seconds),
            'expired_by_seconds': max(0, age_seconds) if age_seconds > 0 else 0
        }

    def _update_access_stats(self, appid: str, metadata: Dict):
        """更新访问统计"""
        app_cache_dir = self.cache_dir / appid
        metadata_file = app_cache_dir / 'metadata.json'

        now = datetime.now(timezone.utc).isoformat()

        # 更新统计信息
        metadata['cache_info']['last_accessed'] = now
        metadata['cache_info']['usage_stats']['last_accessed'] = now
        metadata['cache_info']['usage_stats']['access_count'] += 1

        # 保存
        metadata_file.write_text(
            json.dumps(metadata, indent=2, ensure_ascii=False),
            encoding='utf-8'
        )

    def load(self, appid: str) -> Optional[Dict[str, Any]]:
        """
        加载缓存数据

        Args:
            appid: 应用ID

        Returns:
            缓存数据，如果不存在或无效返回 None
        """
        # 先验证缓存
        validation = self.validate_cache(appid)

        if not validation['can_use']:
            logger.warning(
                "cache_invalid",
                appid=appid,
                reason=validation['reason']
            )
            return None

        # 加载数据
        app_cache_dir = self.cache_dir / appid
        resources_file = app_cache_dir / 'resources.json'

        if not resources_file.exists():
            return None

        return json.loads(resources_file.read_text(encoding='utf-8'))

    def exists(self, appid: str) -> bool:
        """检查缓存是否存在"""
        return (self.cache_dir / appid).exists()

    def get_status(self, appid: str) -> Dict[str, Any]:
        """
        获取缓存状态（CLI可调用）

        Returns:
            缓存状态信息，用于友好展示
        """
        validation = self.validate_cache(appid)

        if not validation['can_use']:
            return {
                'exists': False,
                'status': 'not_available',
                **validation
            }

        app_cache_dir = self.cache_dir / appid
        metadata_file = app_cache_dir / 'metadata.json'
        metadata = json.loads(metadata_file.read_text(encoding='utf-8'))

        cache_info = metadata['cache_info']

        return {
            'exists': True,
            'status': 'available' if validation['fresh'] else 'expired',
            'appid': appid,
            'created_at': cache_info['created_at'],
            'expires_at': cache_info['expires_at'],
            'fresh': validation['fresh'],
            'versions': cache_info['versions'],
            'integrity': cache_info['integrity'],
            'usage_stats': cache_info['usage_stats'],
            'source': cache_info['source']
        }
