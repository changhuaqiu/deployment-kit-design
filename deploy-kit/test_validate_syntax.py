"""
validate-syntax 技能快速测试
"""

import sys
from pathlib import Path

# 添加父目录到路径
sys.path.insert(0, str(Path(__file__).parent))

from core import Orchestrator


def test_validate_syntax():
    """测试 validate-syntax 技能"""
    print("\n" + "=" * 70)
    print("Deployment Kit - validate-syntax 技能测试")
    print("=" * 70)

    # 创建编排器
    project_dir = Path(__file__).parent.parent
    skills_dir = project_dir / 'deploy-kit' / 'skills'

    print(f"\n项目目录: {project_dir}")
    print(f"技能目录: {skills_dir}")

    try:
        orchestrator = Orchestrator(
            project_dir=project_dir,
        skills_dir=skills_dir
        )

        print("\n✓ 编排器初始化成功")
        print(f"  可用技能: {', '.join(orchestrator.skills.keys())}")

    except Exception as e:
        print(f"\n✗ 编排器初始化失败: {e}")
        import traceback
        traceback.print_exc()
        return 1

    # 测试1：校验正确的文件
    print("\n" + "-" * 70)
    print("测试 1: 校验正确的 YAML 文件")
    print("-" * 70)

    context = {
        'appid': 'test',
        'working_dir': str(project_dir),
        'params': {
            'target': 'deploy-kit/tests/xac/valid.yaml',
            'strict': False
        }
    }

    try:
        result = orchestrator.execute_skill('validate-syntax', context)
        data = result['data']

        print(f"\n结果: {data['valid']}")
        print(f"已检查文件: {data['checked_files']}")
        print(f"错误: {len(data['errors'])}")
        print(f"警告: {len(data['warnings'])}")

        if data['valid']:
            print("✅ 测试通过")
        else:
            print("✗ 测试失败")

    except Exception as e:
        print(f"✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()

    # 测试2：校验有错误的文件
    print("\n" + "-" * 70)
    print("测试 2: 校验有语法错误的 YAML 文件")
    print("-" * 70)

    context['params']['target'] = 'deploy-kit/tests/xac/invalid.yaml'

    try:
        result = orchestrator.execute_skill('validate-syntax', context)
        data = result['data']

        print(f"\n结果: {data['valid']}")
        print(f"已检查文件: {data['checked_files']}")
        print(f"错误: {len(data['errors'])}")

        if data['errors']:
            print("\n发现的错误:")
            for error in data['errors'][:3]:
                print(f"  - {error}")

        if not data['valid']:
            print("✅ 测试通过（正确检测到错误）")
        else:
            print("✗ 测试失败（未能检测到错误）")

    except Exception as e:
        print(f"✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()

    # 测试3：括号匹配检查
    print("\n" + "-" * 70)
    print("测试 3: 括号匹配检查")
    print("-" * 70)

    context['params']['target'] = 'deploy-kit/tests/xac/bracket_error.yaml'

    try:
        result = orchestrator.execute_skill('validate-syntax', context)
        data = result['data']

        print(f"\n结果: {data['valid']}")
        print(f"错误: {len(data['errors'])}")

        if data['errors']:
            print("\n发现的错误:")
            for error in data['errors']:
                print(f"  - {error}")

        if not data['valid']:
            print("✅ 测试通过（正确检测到括号错误）")
        else:
            print("✗ 测试失败（未能检测到括号错误）")

    except Exception as e:
        print(f"✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()

    # 测试4：目录校验
    print("\n" + "-" * 70)
    print("测试 4: 校验整个目录")
    print("-" * 70)

    context['params']['target'] = 'deploy-kit/tests/xac/'

    try:
        result = orchestrator.execute_skill('validate-syntax', context)
        data = result['data']

        print(f"\n结果: {data['valid']}")
        print(f"已检查文件: {data['checked_files']}")
        print(f"总错误: {len(data['errors'])}")
        print(f"总警告: {len(data['warnings'])}")

        print("✅ 测试通过")

    except Exception as e:
        print(f"✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()

    print("\n" + "=" * 70)
    print("所有测试完成！")
    print("=" * 70)


if __name__ == '__main__':
    test_validate_syntax()
