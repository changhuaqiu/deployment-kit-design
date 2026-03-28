#!/usr/bin/env python3
"""
使用 skill_creator 创建 validate-syntax 技能
"""

import sys
from pathlib import Path

# 添加路径
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent / 'deploy-kit'))

from tools.skill_creator import SkillCreator

def main():
    """创建 validate-syntax 技能"""
    deploy_kit_dir = Path(__file__).parent / 'deploy-kit'
    skills_dir = deploy_kit_dir / 'skills'

    creator = SkillCreator(skills_dir)

    # 删除旧的技能（如果存在）
    old_skill_dir = skills_dir / 'builtin' / 'validate-syntax'
    if old_skill_dir.exists():
        import shutil
        shutil.rmtree(old_skill_dir)
        print(f"已删除旧技能目录: {old_skill_dir}")

    # 创建技能
    skill_dir = creator.create_skill(
        name='validate-syntax',
        description='语法校验技能 - 验证XaC代码的语法正确性',
        category='builtin',
        author='Deployment Kit Team',
        pre_conditions={
            'requires_cache': False  # 不需要缓存
        },
        capabilities=[
            'YAML文件语法校验',
            '括号匹配检查',
            '缩进检查',
            '友好的错误提示'
        ],
        inputs={
            'target': {
                'type': 'string',
                'required': False,
                'description': '校验目标（文件或目录，默认：xac/）'
            },
            'strict': {
                'type': 'boolean',
                'required': False,
                'description': '严格模式（额外的结构检查）'
            }
        },
        outputs={
            'valid': {
                'type': 'boolean',
                'description': '是否通过校验'
            },
            'errors': {
                'type': 'array',
                'description': '错误列表'
            },
            'warnings': {
                'type': 'array',
                'description': '警告列表'
            },
            'checked_files': {
                'type': 'integer',
                'description': '已检查的文件数'
            }
        }
    )

    print(f"\n✅ 技能创建完成: {skill_dir}")
    print(f"\n📝 现在可以实现技能逻辑:")
    print(f"   文件: {skill_dir / 'main.py'}")
    print(f"   当前状态: 模板代码，需要实现具体逻辑")

    print(f"\n💡 提示:")
    print(f"   1. 从 {old_skill_dir}/main.py 复制已实现的代码")
    print(f"   2. 粘贴到 {skill_dir / 'main.py'} 中")
    print(f"   3. 测试技能: dk validate-syntax")

    return 0


if __name__ == '__main__':
    sys.exit(main())
