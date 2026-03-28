"""
技能加载器 - 动态加载技能插件

核心特性：
1. 动态加载技能（无需修改核心代码）
2. 技能元数据解析
3. 技能生命周期管理
4. 技能版本管理

遵循 harness-engineering 原则：
- 插件化架构（开闭原则）
- 技能自我声明
- 自动发现和加载
"""

import importlib.util
import yaml
import json
from pathlib import Path
from typing import Dict, List, Optional
import structlog

from core.skill_base import SkillBase, SkillError
from core.exceptions import DeploymentKitError

logger = structlog.get_logger(__name__)


class SkillLoader:
    """
    技能加载器

    负责动态加载技能插件，支持：
    - 自动发现技能
    - 动态加载技能模块
    - 技能元数据解析
    - 技能缓存
    """

    def __init__(self, skills_dir: Path):
        """
        初始化技能加载器

        Args:
            skills_dir: 技能目录
                {
                    'builtin': Path,  # 内置技能
                    'custom': Path    # 自定义技能
                }
        """
        if isinstance(skills_dir, dict):
            self.builtin_dir = skills_dir.get('builtin')
            self.custom_dir = skills_dir.get('custom')
        else:
            self.builtin_dir = skills_dir
            self.custom_dir = None

        # 技能缓存
        self._skills_cache: Optional[Dict[str, SkillBase]] = None

    def load_all_skills(self) -> Dict[str, SkillBase]:
        """
        加载所有技能

        Returns:
            技能字典 {skill_name: skill_instance}
        """
        if self._skills_cache is not None:
            logger.debug("using_cached_skills")
            return self._skills_cache

        skills = {}

        # 加载内置技能
        if self.builtin_dir and self.builtin_dir.exists():
            builtin_skills = self._load_skills_from_dir(self.builtin_dir)
            skills.update(builtin_skills)
            logger.info(
                "builtin_skills_loaded",
                count=len(builtin_skills)
            )

        # 加载自定义技能
        if self.custom_dir and self.custom_dir.exists():
            custom_skills = self._load_skills_from_dir(self.custom_dir)
            skills.update(custom_skills)
            logger.info(
                "custom_skills_loaded",
                count=len(custom_skills)
            )

        self._skills_cache = skills

        logger.info(
            "skills_loaded",
            total_skills=len(skills),
            skill_names=list(skills.keys())
        )

        return skills

    def _load_skills_from_dir(self, skills_dir: Path) -> Dict[str, SkillBase]:
        """从目录加载技能"""
        skills = {}

        for skill_dir in skills_dir.iterdir():
            if not skill_dir.is_dir():
                continue

            # 检查是否是技能目录（包含 skill.yaml）
            skill_yaml = skill_dir / 'skill.yaml'
            if not skill_yaml.exists():
                continue

            try:
                skill = self.load_skill(skill_dir)
                skills[skill.name] = skill
            except Exception as e:
                logger.error(
                    "skill_load_failed",
                    skill_dir=str(skill_dir),
                    error=str(e)
                )

        return skills

    def load_skill(self, skill_dir: Path) -> SkillBase:
        """
        加载单个技能

        Args:
            skill_dir: 技能目录

        Returns:
            技能实例

        Raises:
            SkillError: 技能加载失败
        """
        # 1. 读取技能元数据
        metadata_file = skill_dir / 'skill.yaml'
        if not metadata_file.exists():
            raise SkillError(
                f"技能元数据文件不存在: {metadata_file}"
            )

        with open(metadata_file, 'r', encoding='utf-8') as f:
            metadata = yaml.safe_load(f)

        # 验证元数据
        self._validate_metadata(metadata)

        # 2. 动态加载技能模块
        module_file = skill_dir / 'main.py'
        if not module_file.exists():
            raise SkillError(
                f"技能模块文件不存在: {module_file}"
            )

        spec = importlib.util.spec_from_file_location(
            f"skill_{metadata['name']}",
            module_file
        )
        if spec is None or spec.loader is None:
            raise SkillError(
                f"无法加载技能模块: {module_file}"
            )

        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        # 3. 获取技能类并实例化
        if not hasattr(module, 'Skill'):
            raise SkillError(
                f"技能模块缺少 Skill 类: {module_file}"
            )

        skill_class = getattr(module, 'Skill')

        # 检查是否是 SkillBase 的子类
        from core.skill_base import SkillBase
        if not issubclass(skill_class, SkillBase):
            raise SkillError(
                f"技能类必须继承 SkillBase: {skill_class}"
            )

        # 实例化技能
        skill = skill_class(metadata)

        logger.info(
            "skill_loaded",
            name=skill.name,
            version=skill.version,
            capabilities=skill.capabilities
        )

        return skill

    def _validate_metadata(self, metadata: Dict) -> None:
        """验证技能元数据"""
        required_fields = ['name', 'version', 'description']

        for field in required_fields:
            if field not in metadata:
                raise SkillError(
                    f"技能元数据缺少必需字段: {field}"
                )

        # 验证名称格式
        if not metadata['name'].replace('-', '').replace('_', '').isalnum():
            raise SkillError(
                f"技能名称格式错误: {metadata['name']}"
            )

        # 验证版本格式
        version_parts = metadata['version'].split('.')
        if len(version_parts) < 2:
            raise SkillError(
                f"技能版本格式错误: {metadata['version']}"
            )

    def reload_skill(self, skill_name: str) -> SkillBase:
        """
        重新加载技能（用于开发调试）

        Args:
            skill_name: 技能名称

        Returns:
            重新加载的技能实例
        """
        # 清除缓存
        if self._skills_cache and skill_name in self._skills_cache:
            del self._skills_cache[skill_name]

        # 查找技能目录
        skill_dir = self._find_skill_dir(skill_name)
        if not skill_dir:
            raise SkillError(f"技能不存在: {skill_name}")

        # 重新加载
        skill = self.load_skill(skill_dir)

        # 更新缓存
        if self._skills_cache is not None:
            self._skills_cache[skill_name] = skill

        logger.info("skill_reloaded", skill=skill_name)
        return skill

    def _find_skill_dir(self, skill_name: str) -> Optional[Path]:
        """查找技能目录"""
        # 先在内置技能中查找
        if self.builtin_dir and self.builtin_dir.exists():
            skill_dir = self.builtin_dir / skill_name
            if skill_dir.exists() and (skill_dir / 'skill.yaml').exists():
                return skill_dir

        # 再在自定义技能中查找
        if self.custom_dir and self.custom_dir.exists():
            skill_dir = self.custom_dir / skill_name
            if skill_dir.exists() and (skill_dir / 'skill.yaml').exists():
                return skill_dir

        return None

    def get_skill_info(self, skill_name: str) -> Optional[Dict]:
        """
        获取技能信息（不加载技能）

        Args:
            skill_name: 技能名称

        Returns:
            技能信息，如果不存在返回 None
        """
        skill_dir = self._find_skill_dir(skill_name)
        if not skill_dir:
            return None

        metadata_file = skill_dir / 'skill.yaml'
        if not metadata_file.exists():
            return None

        with open(metadata_file, 'r', encoding='utf-8') as f:
            metadata = yaml.safe_load(f)

        return {
            'name': metadata['name'],
            'version': metadata['version'],
            'description': metadata['description'],
            'author': metadata.get('author'),
            'capabilities': metadata.get('capabilities', []),
            'inputs': metadata.get('inputs', {}),
            'outputs': metadata.get('outputs', {})
        }

    def list_skills(self) -> List[str]:
        """
        列出所有可用技能

        Returns:
            技能名称列表
        """
        skills = self.load_all_skills()
        return list(skills.keys())

    def invalidate_cache(self) -> None:
        """清除技能缓存"""
        self._skills_cache = None
        logger.debug("skill_cache_invalidated")


# ==================== 工厂函数 ====================

def create_skill_loader(
    builtin_dir: Path,
    custom_dir: Optional[Path] = None
) -> SkillLoader:
    """
    创建技能加载器（工厂函数）

    Args:
        builtin_dir: 内置技能目录
        custom_dir: 自定义技能目录（可选）

    Returns:
        SkillLoader 实例
    """
    skills_dir = {'builtin': builtin_dir}
    if custom_dir:
        skills_dir['custom'] = custom_dir

    return SkillLoader(skills_dir)
