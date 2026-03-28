"""
缓存管理器使用示例

演示如何使用增强的缓存管理器
"""

import sys
import json
from pathlib import Path

# 添加父目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.cache_manager import CacheManager
from core.exceptions import CacheNotFoundError, CacheExpiredError


def example_save_cache():
    """示例：保存缓存数据"""
    print("=" * 70)
    print("示例 1: 保存缓存数据")
    print("=" * 70)

    # 创建缓存管理器
    cache_manager = CacheManager(data_dir='.deployment-kit')

    # 模拟资源数据
    resources = {
        "resources": {
            "ads": [
                {"id": "ads-001", "name": "my-cluster", "flavor": "s2.large.2"}
            ],
            "config": [
                {"id": "config-001", "key": "ENV", "value": "test"}
            ]
        },
        "manifest": {
            "total_resources": 2,
            "resource_types": ["ads", "config"]
        }
    }

    # 模拟清单
    manifest = {
        "appid": "my-app",
        "total_resources": 2,
        "timestamp": "2026-03-28T10:30:00Z"
    }

    # 保存缓存（带完整元数据）
    metadata = cache_manager.save_with_metadata(
        appid='my-app',
        resources=resources,
        manifest=manifest,
        metadata={
            'source': {
                'fetch_method': 'batch_concurrent',
                'mcp_endpoint': 'mcp.huaweicloud.com'
            }
        }
    )

    print("\n✓ 缓存已保存")
    print(f"  应用ID: {metadata['appid']}")
    print(f"  创建时间: {metadata['cache_info']['created_at']}")
    print(f"  过期时间: {metadata['cache_info']['expires_at']}")
    print(f"  TTL: {metadata['cache_info']['ttl']} 秒")
    print(f"  版本信息:")
    for component, version in metadata['cache_info']['versions'].items():
        print(f"    {component}: {version}")
    print(f"  校验和:")
    print(f"    状态哈希: {metadata['cache_info']['integrity']['state_hash'][:20]}...")
    print(f"    资源校验: {metadata['cache_info']['integrity']['resources_checksum'][:20]}...")

    return metadata


def example_validate_cache():
    """示例：验证缓存"""
    print("\n" + "=" * 70)
    print("示例 2: 验证缓存")
    print("=" * 70)

    cache_manager = CacheManager(data_dir='.deployment-kit')

    # 验证缓存
    validation = cache_manager.validate_cache('my-app')

    print(f"\n验证结果: {validation['valid']}")
    print(f"  原因: {validation['reason']}")
    print(f"  可使用: {validation['can_use']}")
    print(f"  新鲜: {validation['fresh']}")
    print(f"  建议: {validation['recommendation']}")

    if validation['valid']:
        print("\n详细信息:")
        details = validation['details']
        print(f"  创建时间: {details['created_at']}")
        print(f"  过期时间: {details['expires_at']}")
        print(f"  访问次数: {details['access_count']}")


def example_load_cache():
    """示例：加载缓存"""
    print("\n" + "=" * 70)
    print("示例 3: 加载缓存")
    print("=" * 70)

    cache_manager = CacheManager(data_dir='.deployment-kit')

    try:
        # 加载缓存（会自动验证）
        resources = cache_manager.load('my-app')

        if resources:
            print("\n✓ 缓存加载成功")
            print(f"  资源类型: {list(resources['resources'].keys())}")
            print(f"  总资源数: {resources['manifest']['total_resources']}")

            # 显示一些资源
            for resource_type, items in resources['resources'].items():
                print(f"\n  {resource_type}:")
                for item in items[:2]:  # 只显示前2个
                    print(f"    - {item.get('id', 'N/A')}: {item.get('name', 'N/A')}")
        else:
            print("\n✗ 缓存加载失败")

    except Exception as e:
        print(f"\n✗ 加载失败: {e}")


def example_cache_status():
    """示例：获取缓存状态（CLI友好）"""
    print("\n" + "=" * 70)
    print("示例 4: 获取缓存状态（CLI友好）")
    print("=" * 70)

    cache_manager = CacheManager(data_dir='.deployment-kit')

    status = cache_manager.get_status('my-app')

    print(f"\n缓存状态: {status['status']}")
    print(f"  应用ID: {status['appid']}")
    print(f"  创建时间: {status['created_at']}")
    print(f"  过期时间: {status['expires_at']}")
    print(f"  新鲜: {status['fresh']}")

    print("\n版本信息:")
    for component, version in status['versions'].items():
        print(f"  {component}: {version}")

    print("\n完整性:")
    integrity = status['integrity']
    print(f"  状态哈希: {integrity['state_hash'][:30]}...")
    print(f"  资源校验: {integrity['resources_checksum'][:30]}...")
    print(f"  清单校验: {integrity['manifest_checksum'][:30]}...")

    print("\n使用统计:")
    stats = status['usage_stats']
    print(f"  最后访问: {stats['last_accessed']}")
    print(f"  访问次数: {stats['access_count']}")

    print("\n来源信息:")
    source = status['source']
    print(f"  MCP端点: {source['mcp_endpoint']}")
    print(f"  获取方法: {source['fetch_method']}")
    print(f"  资源类型: {', '.join(source['resource_types'])}")


def example_version_incompatibility():
    """示例：版本不兼容场景"""
    print("\n" + "=" * 70)
    print("示例 5: 版本不兼容场景（模拟）")
    print("=" * 70)

    cache_manager = CacheManager(data_dir='.deployment-kit')

    # 手动修改缓存元数据中的版本（模拟版本升级）
    app_cache_dir = Path('.deployment-kit/cache/my-app')
    metadata_file = app_cache_dir / 'metadata.json'

    if metadata_file.exists():
        metadata = json.loads(metadata_file.read_text(encoding='utf-8'))

        # 模拟 HEAM 协议升级到 2.0.0
        old_version = metadata['cache_info']['versions']['heam_protocol']
        metadata['cache_info']['versions']['heam_protocol'] = '2.0.0'

        # 保存修改后的元数据
        metadata_file.write_text(json.dumps(metadata, indent=2, ensure_ascii=False))

        print(f"\n已将 HEAM 协议版本从 {old_version} 升级到 2.0.0")

        # 现在验证缓存
        validation = cache_manager.validate_cache('my-app')

        print(f"\n验证结果: {validation['valid']}")
        print(f"  原因: {validation['reason']}")
        print(f"  可使用: {validation['can_use']}")
        print(f"  建议: {validation['recommendation']}")

        if not validation['valid']:
            print("\n版本不兼容详情:")
            for issue in validation['details'].get('issues', []):
                print(f"  - 组件: {issue['component']}")
                print(f"    当前版本: {issue['current']}")
                print(f"    缓存版本: {issue['cached']}")
                print(f"    兼容: {issue['compatible']}")

        # 恢复原版本
        metadata['cache_info']['versions']['heam_protocol'] = old_version
        metadata_file.write_text(json.dumps(metadata, indent=2, ensure_ascii=False))
        print(f"\n已恢复 HEAM 协议版本到 {old_version}")


def example_corrupted_cache():
    """示例：缓存损坏场景"""
    print("\n" + "=" * 70)
    print("示例 6: 缓存损坏场景（模拟）")
    print("=" * 70)

    cache_manager = CacheManager(data_dir='.deployment-kit')

    # 备份原始文件
    app_cache_dir = Path('.deployment-kit/cache/my-app')
    resources_file = app_cache_dir / 'resources.json'
    backup_file = app_cache_dir / 'resources.json.bak'

    if resources_file.exists():
        # 备份
        import shutil
        shutil.copy(resources_file, backup_file)

        # 修改文件（模拟损坏）
        with open(resources_file, 'w') as f:
            f.write("{corrupted data")

        print("\n已损坏 resources.json 文件")

        # 验证缓存
        validation = cache_manager.validate_cache('my-app')

        print(f"\n验证结果: {validation['valid']}")
        print(f"  原因: {validation['reason']}")
        print(f"  可使用: {validation['can_use']}")
        print(f"  建议: {validation['recommendation']}")

        if not validation['valid'] and validation['reason'] == 'integrity_check_failed':
            print("\n完整性检查详情:")
            for error in validation['details'].get('errors', []):
                print(f"  - 文件: {error['file']}")
                print(f"    期望校验: {error['expected'][:30]}...")
                print(f"    实际校验: {error['actual'][:30]}...")

        # 恢复文件
        shutil.move(backup_file, resources_file)
        print("\n已恢复 resources.json 文件")


def main():
    """运行所有示例"""
    print("\n" + "=" * 70)
    print("Deployment Kit - 缓存管理器示例")
    print("=" * 70)

    try:
        # 示例1: 保存缓存
        example_save_cache()

        # 示例2: 验证缓存
        example_validate_cache()

        # 示例3: 加载缓存
        example_load_cache()

        # 示例4: 获取状态
        example_cache_status()

        # 示例5: 版本不兼容（模拟）
        example_version_incompatibility()

        # 示例6: 缓存损坏（模拟）
        example_corrupted_cache()

        print("\n" + "=" * 70)
        print("所有示例运行完成！")
        print("=" * 70)

    except Exception as e:
        print(f"\n✗ 示例运行失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
