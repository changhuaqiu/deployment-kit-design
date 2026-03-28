"""
编排器使用示例

演示如何使用编排器协调技能执行
"""

import sys
from pathlib import Path

# 添加父目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core import Orchestrator


def example_execute_single_skill():
    """示例1：执行单个技能"""
    print("\n" + "=" * 70)
    print("示例 1: 执行单个技能")
    print("=" * 70)

    # 创建编排器
    project_dir = Path(__file__).parent.parent.parent
    skills_dir = project_dir / 'deploy-kit' / 'skills'

    orchestrator = Orchestrator(
        project_dir=project_dir,
        skills_dir=skills_dir
    )

    # 准备上下文
    context = {
        'appid': 'test-app',
        'params': {
            'name': 'Deployment Kit'
        }
    }

    # 执行技能
    result = orchestrator.execute_skill('hello-skill', context)

    print(f"\n✓ 技能执行完成:")
    print(f"  状态: {result['status']}")
    print(f"  消息: {result['message']}")
    print(f"  数据: {result['data']}")


def example_execute_workflow():
    """示例2：执行工作流"""
    print("\n" + "=" * 70)
    print("示例 2: 执行工作流")
    print("=" * 70)

    # 创建编排器
    project_dir = Path(__file__).parent.parent.parent
    skills_dir = project_dir / 'deploy-kit' / 'skills'

    orchestrator = Orchestrator(
        project_dir=project_dir,
        skills_dir=skills_dir
    )

    # 定义工作流
    workflow_skills = ['hello-skill', 'hello-skill']  # 重复执行演示

    context = {
        'appid': 'test-app',
        'params': {
            'name': 'World'
        }
    }

    # 执行工作流
    result = orchestrator.execute_workflow(
        workflow_name='test-workflow',
        skills=workflow_skills,
        context=context,
        options={'stop_on_error': True}
    )

    print(f"\n✓ 工作流执行完成:")
    print(f"  名称: {result['workflow_name']}")
    print(f"  状态: {result['status']}")
    print(f"  总技能数: {result['total_skills']}")
    print(f"  完成数: {result['completed_skills']}")
    print(f"  失败数: {len(result['failed_skills'])}")

    print("\n执行详情:")
    for step_result in result['results']:
        print(f"  - {step_result['skill']}: {step_result['status']}")


def example_orchestrator_status():
    """示例3：查看编排器状态"""
    print("\n" + "=" * 70)
    print("示例 3: 查看编排器状态")
    print("=" * 70)

    # 创建编排器
    project_dir = Path(__file__).parent.parent.parent
    skills_dir = project_dir / 'deploy-kit' / 'skills'

    orchestrator = Orchestrator(
        project_dir=project_dir,
        skills_dir=skills_dir
    )

    # 获取状态
    status = orchestrator.get_status()

    print(f"\n编排器状态:")
    print(f"  项目目录: {status['project_dir']}")
    print(f"  可用技能数: {status['skills_count']}")
    print(f"  可用技能: {', '.join(status['skills_list'])}")

    if status['workflow']['workflow_id']:
        print(f"\n工作流状态:")
        workflow = status['workflow']
        print(f"  ID: {workflow['workflow_id']}")
        print(f"  名称: {workflow['workflow_name']}")
        print(f"  状态: {workflow['status']}")
        print(f"  进度: {workflow['total_progress']*100:.0f}%")
        print(f"  已完成: {', '.join(workflow['completed_skills'])}")
        print(f"  待执行: {', '.join(workflow['pending_skills'])}")

    print(f"\n可以恢复: {status['can_resume']}")


def example_skill_capabilities():
    """示例4：查看技能能力"""
    print("\n" + "=" * 70)
    print("示例 4: 查看技能能力")
    print("=" * 70)

    # 创建编排器
    project_dir = Path(__file__).parent.parent.parent
    skills_dir = project_dir / 'deploy-kit' / 'skills'

    orchestrator = Orchestrator(
        project_dir=project_dir,
        skills_dir=skills_dir
    )

    # 查看所有技能的能力
    print("\n技能能力列表:")
    for skill_name, skill in orchestrator.skills.items():
        print(f"\n  {skill_name}:")
        print(f"    版本: {skill.version}")
        print(f"    描述: {skill.description}")
        print(f"    能力: {', '.join(skill.capabilities)}")
        print(f"    前置条件: {skill.pre_conditions}")

        if skill.inputs:
            print(f"    输入:")
            for param, definition in skill.inputs.items():
                required = '必需' if definition.get('required') else '可选'
                print(f"      - {param} ({definition['type']}, {required})")

        if skill.outputs:
            print(f"    输出:")
            for output, definition in skill.outputs.items():
                print(f"      - {output} ({definition['type']})")


def main():
    """运行所有示例"""
    print("\n" + "=" * 70)
    print("Deployment Kit - 编排器示例")
    print("=" * 70)

    try:
        example_skill_capabilities()
        example_orchestrator_status()
        example_execute_single_skill()
        example_execute_workflow()

        print("\n" + "=" * 70)
        print("所有示例运行完成！")
        print("=" * 70)

    except Exception as e:
        print(f"\n✗ 示例运行失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
