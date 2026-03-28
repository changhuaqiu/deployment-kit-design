"""
技能加载器使用示例

演示如何使用技能加载器
"""

import sys
from pathlib import Path

# 添加父目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.skill_loader import SkillLoader, create_skill_loader


def example_load_all_skills():
    """示例1：加载所有技能"""
    print("\n" + "=" * 70)
    print("示例 1: 加载所有技能")
    print("=" * 70)

    # 创建技能加载器
    skills_dir = Path(__file__).parent.parent / 'skills'
    loader = create_skill_loader(
        builtin_dir=skills_dir / 'builtin',
        custom_dir=skills_dir / 'custom'
    )

    # 加载所有技能
    skills = loader.load_all_skills()

    print(f"\n✓ 已加载 {len(skills)} 个技能:")
    for skill_name, skill in skills.items():
        print(f"\n  {skill_name}:")
        print(f"    版本: {skill.version}")
        print(f"    描述: {skill.description}")
        print(f"    能力: {', '.join(skill.capabilities)}")


def example_load_single_skill():
    """示例2：加载单个技能"""
    print("\n" + "=" * 70)
    print("示例 2: 加载单个技能")
    print("=" * 70)

    skills_dir = Path(__file__).parent.parent / 'skills'
    loader = create_skill_loader(builtin_dir=skills_dir / 'builtin')

    # 加载单个技能
    skill_dir = skills_dir / 'builtin' / 'hello-skill'
    skill = loader.load_skill(skill_dir)

    print(f"\n✓ 已加载技能:")
    print(f"  名称: {skill.name}")
    print(f"  版本: {skill.version}")
    print(f"  描述: {skill.description}")
    print(f"  作者: {skill.author}")
    print(f"  能力: {skill.capabilities}")


def example_execute_skill():
    """示例3：执行技能"""
    print("\n" + "=" * 70)
    print("示例 3: 执行技能")
    print("=" * 70)

    skills_dir = Path(__file__).parent.parent / 'skills'
    loader = create_skill_loader(builtin_dir=skills_dir / 'builtin')

    # 加载技能
    skills = loader.load_all_skills()
    skill = skills['hello-skill']

    # 准备上下文
    context = {
        'appid': 'test-app',
        'params': {
            'name': 'Deployment Kit'
        }
    }

    # 执行技能
    print(f"\n执行技能: {skill.name}")
    result = skill.execute(context)

    print(f"\n✓ 执行结果:")
    print(f"  状态: {result['status']}")
    print(f"  消息: {result['message']}")
    print(f"  数据: {result['data']}")


def example_skill_info():
    """示例4：获取技能信息（不加载）"""
    print("\n" + "=" * 70)
    print("示例 4: 获取技能信息")
    print("=" * 70)

    skills_dir = Path(__file__).parent.parent / 'skills'
    loader = create_skill_loader(builtin_dir=skills_dir / 'builtin')

    # 获取技能信息
    info = loader.get_skill_info('hello-skill')

    if info:
        print(f"\n技能信息:")
        print(f"  名称: {info['name']}")
        print(f"  版本: {info['version']}")
        print(f"  描述: {info['description']}")
        print(f"  作者: {info['author']}")
        print(f"  能力: {info['capabilities']}")

        if info['inputs']:
            print(f"\n  输入参数:")
            for param_name, param_def in info['inputs'].items():
                required = '必需' if param_def.get('required') else '可选'
                print(f"    - {param_name} ({param_def['type']}, {required})")
                print(f"      {param_def.get('description', '')}")

        if info['outputs']:
            print(f"\n  输出参数:")
            for output_name, output_def in info['outputs'].items():
                print(f"    - {output_name} ({output_def['type']})")
                print(f"      {output_def.get('description', '')}")


def example_list_skills():
    """示例5：列出所有技能"""
    print("\n" + "=" * 70)
    print("示例 5: 列出所有技能")
    print("=" * 70)

    skills_dir = Path(__file__).parent.parent / 'skills'
    loader = create_skill_loader(builtin_dir=skills_dir / 'builtin')

    # 列出技能
    skill_names = loader.list_skills()

    print(f"\n可用技能 ({len(skill_names)} 个):")
    for skill_name in skill_names:
        info = loader.get_skill_info(skill_name)
        print(f"  - {skill_name} (v{info['version']})")
        print(f"    {info['description']}")


def main():
    """运行所有示例"""
    print("\n" + "=" * 70)
    print("Deployment Kit - 技能加载器示例")
    print("=" * 70)

    try:
        example_list_skills()
        example_load_all_skills()
        example_load_single_skill()
        example_execute_skill()
        example_skill_info()

        print("\n" + "=" * 70)
        print("所有示例运行完成！")
        print("=" * 70)

    except Exception as e:
        print(f"\n✗ 示例运行失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
