"""
状态管理器使用示例

演示如何使用增强的状态管理器
"""

import sys
import time
from pathlib import Path

# 添加父目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.state_manager import StateManager


def example_initialize():
    """示例1：初始化状态"""
    print("\n" + "=" * 70)
    print("示例 1: 初始化项目状态")
    print("=" * 70)

    state_manager = StateManager(data_dir='.deployment-kit')

    # 初始化状态
    state = state_manager.initialize(
        project_id='my-deployment-project',
        current_appid='my-app'
    )

    print("\n✓ 状态已初始化")
    print(f"  项目ID: {state['project_id']}")
    print(f"  初始化时间: {state['initialized_at']}")
    print(f"  当前应用: {state['current_appid']}")
    print(f"  工作流状态: {state['workflow_state']['status']}")


def example_workflow_lifecycle():
    """示例2：工作流生命周期"""
    print("\n" + "=" * 70)
    print("示例 2: 工作流生命周期")
    print("=" * 70)

    state_manager = StateManager(data_dir='.deployment-kit')

    # 开始工作流
    print("\n1. 开始工作流")
    state = state_manager.start_workflow(
        workflow_name='new-user-import',
        skills=['discover-resources', 'generate-xac', 'validate-syntax', 'deploy'],
        appid='my-app'
    )

    print(f"   工作流ID: {state['workflow_state']['workflow_id']}")
    print(f"   技能数量: {state['workflow_state']['total_skills']}")
    print(f"   状态: {state['workflow_state']['status']}")

    # 执行第一个技能
    print("\n2. 执行 discover-resources")
    state = state_manager.start_skill('discover-resources')
    time.sleep(1)  # 模拟执行
    state = state_manager.complete_skill(
        'discover-resources',
        result={'resources_discovered': 42},
        progress={'percentage': 100, 'message': 'Completed'}
    )

    print(f"   ✓ 完成，耗时: {state['skill_states'][0]['duration_seconds']:.2f} 秒")
    print(f"   总进度: {state['workflow_state']['total_progress']*100:.0f}%")

    # 执行第二个技能（模拟失败）
    print("\n3. 执行 generate-xac（模拟失败）")
    state = state_manager.start_skill('generate-xac', context={'mode': 'generate'})
    time.sleep(0.5)

    # 模拟失败
    try:
        raise Exception("MCP service timeout")
    except Exception as e:
        state = state_manager.fail_skill(
            'generate-xac',
            error=e,
            retryable=True,
            progress={'percentage': 45, 'message': 'Generating resources...'}
        )

    print(f"   ✗ 失败: {state['skill_states'][1]['error']['type']}")
    print(f"   错误: {state['skill_states'][1]['error']['message']}")
    print(f"   可重试: {state['skill_states'][1]['error']['retryable']}")
    print(f"   失败时进度: {state['skill_states'][1]['progress']['percentage']}%")


def example_resume():
    """示例3：断点续传"""
    print("\n" + "=" * 70)
    print("示例 3: 断点续传")
    print("=" * 70)

    state_manager = StateManager(data_dir='.deployment-kit')

    # 检查是否可以恢复
    can_resume = state_manager.can_resume()
    print(f"\n可以恢复: {can_resume}")

    if can_resume:
        # 获取恢复点
        resume_point = state_manager.get_resume_point()

        print("\n恢复点信息:")
        print(f"  技能: {resume_point['skill']}")
        print(f"  状态: {resume_point['status']}")
        print(f"  进度: {resume_point['progress']['percentage']}%")
        print(f"  消息: {resume_point['progress']['message']}")
        print(f"  重试次数: {resume_point['retry_count']}")

        if resume_point['error']:
            print(f"\n上次错误:")
            print(f"  类型: {resume_point['error']['type']}")
            print(f"  消息: {resume_point['error']['message']}")
            print(f"  可重试: {resume_point['error']['retryable']}")

        # 模拟重试
        print("\n开始重试...")
        state = state_manager.retry_skill('generate-xac')
        print(f"  ✓ 重试 {state['skill_states'][1]['retry_count']} 已开始")

        # 模拟成功
        time.sleep(1)
        state = state_manager.complete_skill(
            'generate-xac',
            result={'files_generated': 15},
            progress={'percentage': 100, 'message': 'Completed'}
        )

        print(f"  ✓ 技能完成")
        print(f"  总进度: {state['workflow_state']['total_progress']*100:.0f}%")


def example_progress_tracking():
    """示例4：进度跟踪"""
    print("\n" + "=" * 70)
    print("示例 4: 进度跟踪")
    print("=" * 70)

    state_manager = StateManager(data_dir='.deployment-kit')

    # 开始新技能
    state = state_manager.start_skill('validate-syntax')

    # 模拟进度更新
    for i, (percentage, message) in enumerate([
        (20, 'Parsing XaC files...'),
        (40, 'Validating syntax...'),
        (60, 'Checking dependencies...'),
        (80, 'Verifying references...'),
        (100, 'Validation complete')
    ]):
        time.sleep(0.3)
        state = state_manager.update_skill_progress('validate-syntax', percentage, message)
        print(f"  进度: {percentage}% - {message}")

    # 完成技能
    state = state_manager.complete_skill(
        'validate-syntax',
        result={'errors': 0, 'warnings': 2},
        progress={'percentage': 100, 'message': 'Completed'}
    )


def example_workflow_status():
    """示例5：工作流状态查询（CLI友好）"""
    print("\n" + "=" * 70)
    print("示例 5: 工作流状态查询")
    print("=" * 70)

    state_manager = StateManager(data_dir='.deployment-kit')

    # 获取工作流状态
    status = state_manager.get_workflow_status()

    print("\n工作流状态:")
    print(f"  ID: {status['workflow_id']}")
    print(f"  名称: {status['workflow_name']}")
    print(f"  状态: {status['status']}")
    print(f"  开始时间: {status['started_at']}")
    print(f"  总进度: {status['total_progress']*100:.0f}%")

    print("\n已完成的技能:")
    for skill in status['completed_skills']:
        print(f"  ✓ {skill}")

    print("\n待执行的技能:")
    for skill in status['pending_skills']:
        print(f"  ⏳ {skill}")

    print(f"\n可以恢复: {status['can_resume']}")


def example_complete_workflow():
    """示例6：完成工作流"""
    print("\n" + "=" * 70)
    print("示例 6: 完成工作流")
    print("=" * 70)

    state_manager = StateManager(data_dir='.deployment-kit')

    # 完成剩余技能
    remaining_skills = ['deploy']

    for skill in remaining_skills:
        print(f"\n执行 {skill}...")
        state = state_manager.start_skill(skill)
        time.sleep(0.5)
        state = state_manager.complete_skill(
            skill,
            result={'success': True},
            progress={'percentage': 100, 'message': 'Completed'}
        )
        print(f"  ✓ 完成")

    # 检查最终状态
    status = state_manager.get_workflow_status()

    print(f"\n工作流状态: {status['status']}")
    print(f"总进度: {status['total_progress']*100:.0f}%")
    print(f"可以恢复: {status['can_resume']}")

    if status['status'] == 'completed':
        print("\n🎉 工作流全部完成！")


def main():
    """运行所有示例"""
    print("\n" + "=" * 70)
    print("Deployment Kit - 状态管理器示例")
    print("=" * 70)

    try:
        example_initialize()
        example_workflow_lifecycle()
        example_resume()
        example_progress_tracking()
        example_workflow_status()
        example_complete_workflow()

        print("\n" + "=" * 70)
        print("所有示例运行完成！")
        print("=" * 70)

    except Exception as e:
        print(f"\n✗ 示例运行失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
