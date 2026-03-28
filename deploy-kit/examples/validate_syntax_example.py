"""
validate-syntax 技能使用示例

演示如何使用 validate-syntax 技能校验 XaC 制品中的 YAML 文件
"""

import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from skills.builtin.validate-syntax.scripts.main import Skill


def example_validate_directory():
    """示例 1: 校验目录中的 YAML 文件"""
    print("=" * 60)
    print("示例 1: 校验目录")
    print("=" * 60)

    # 创建技能实例
    skill = Skill({
        'name': 'validate-syntax',
        'version': '1.0.0'
    })

    # 准备上下文
    context = {
        'appid': 'test-app',
        'params': {
            'artifact_source': './test-data/xac'  # 替换为实际路径
        }
    }

    # 执行技能
    try:
        result = skill.execute(context)

        if result['status'] == 'success':
            validation = result['data']['validation_result']

            print(f"\n✓ 校验完成")
            print(f"  总文件数: {validation['total_files']}")
            print(f"  有效文件: {validation['valid_files']}")
            print(f"  无效文件: {validation['invalid_files']}")
            print(f"  结果: {'✓ 通过' if validation['valid'] else '✗ 失败'}")

            if validation['errors']:
                print(f"\n错误详情:")
                for error in validation['errors']:
                    line_info = f":{error['line']}" if 'line' in error else ""
                    print(f"  ✗ {error['file']}{line_info}")
                    print(f"    {error['error']}")
        else:
            print(f"\n✗ 执行失败: {result['message']}")

    except Exception as e:
        print(f"\n✗ 错误: {e}")

    finally:
        # 清理资源
        skill.cleanup()


def example_validate_zip():
    """示例 2: 校验 ZIP 文件"""
    print("\n" + "=" * 60)
    print("示例 2: 校验 ZIP 文件")
    print("=" * 60)

    skill = Skill({
        'name': 'validate-syntax',
        'version': '1.0.0'
    })

    context = {
        'appid': 'test-app',
        'params': {
            'artifact_source': './test-data/xac-artifact.zip'  # 替换为实际路径
        }
    }

    try:
        result = skill.execute(context)

        if result['status'] == 'success':
            validation = result['data']['validation_result']
            artifact_info = result['data']['artifact_info']

            print(f"\n✓ 校验完成")
            print(f"  源类型: {artifact_info['source_type']}")
            print(f"  处理路径: {artifact_info['processed_path']}")
            print(f"  找到文件: {len(artifact_info['yaml_files_found'])}")
            print(f"\n校验结果:")
            print(f"  有效: {validation['valid_files']}/{validation['total_files']}")
            print(f"  无效: {validation['invalid_files']}")
        else:
            print(f"\n✗ 执行失败: {result['message']}")

    except Exception as e:
        print(f"\n✗ 错误: {e}")

    finally:
        skill.cleanup()


def example_validate_with_timeout():
    """示例 3: 校验远程 URL（带超时）"""
    print("\n" + "=" * 60)
    print("示例 3: 校验远程 URL")
    print("=" * 60)

    skill = Skill({
        'name': 'validate-syntax',
        'version': '1.0.0'
    })

    context = {
        'appid': 'test-app',
        'params': {
            'artifact_source': 'http://example.com/xac-artifact.zip',
            'download_timeout': 600  # 10 分钟超时
        }
    }

    try:
        result = skill.execute(context)

        if result['status'] == 'success':
            print(f"\n✓ 校验完成: {result['message']}")
        else:
            print(f"\n✗ 执行失败: {result['message']}")

    except Exception as e:
        print(f"\n✗ 错误: {e}")

    finally:
        skill.cleanup()


def create_test_data():
    """创建测试数据"""
    import tempfile
    import yaml

    # 创建临时测试目录
    test_dir = './test-data/xac'
    os.makedirs(test_dir, exist_ok=True)

    # 创建测试 YAML 文件
    files = {
        'main.yaml': {
            'application': 'test-app',
            'environment': 'test'
        },
        'config.yaml': {
            'database': {
                'host': 'localhost',
                'port': 5432
            }
        },
        'invalid.yaml': 'key: value\n  bad_indent: true\n'  # 故意的错误
    }

    for filename, content in files.items():
        filepath = os.path.join(test_dir, filename)

        if isinstance(content, dict):
            with open(filepath, 'w') as f:
                yaml.dump(content, f)
        else:
            with open(filepath, 'w') as f:
                f.write(content)

    print(f"\n✓ 测试数据已创建: {test_dir}")


if __name__ == '__main__':
    # 创建测试数据
    create_test_data()

    # 运行示例
    example_validate_directory()

    # 其他示例需要实际的数据
    # example_validate_zip()
    # example_validate_with_timeout()
