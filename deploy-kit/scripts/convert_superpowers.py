import os
import yaml
import re
from pathlib import Path
import shutil

def parse_markdown_skill(md_path: Path):
    """解析 superpowers markdown 技能"""
    content = md_path.read_text(encoding='utf-8')
    
    # 提取 YAML frontmatter
    frontmatter_match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    metadata = {}
    if frontmatter_match:
        try:
            metadata = yaml.safe_load(frontmatter_match.group(1))
        except yaml.YAMLError:
            pass
            
    # 如果没有 name，用目录名
    if 'name' not in metadata:
        metadata['name'] = md_path.parent.name
        
    # 如果没有 description，提取第一段文字
    if 'description' not in metadata:
        content_no_frontmatter = re.sub(r'^---\n.*?\n---\n*', '', content, flags=re.DOTALL)
        paragraphs = [p.strip() for p in content_no_frontmatter.split('\n\n') if p.strip() and not p.startswith('#')]
        metadata['description'] = paragraphs[0] if paragraphs else "No description provided."
        
    return metadata, content

def generate_deploy_kit_skill(source_dir: Path, target_dir: Path):
    """将 superpowers 技能转换为 deploy-kit 技能格式"""
    if not source_dir.exists():
        print(f"Source directory not found: {source_dir}")
        return
        
    for skill_md in source_dir.glob('*/SKILL.md'):
        skill_dir = skill_md.parent
        skill_name = skill_dir.name
        
        print(f"Processing skill: {skill_name}")
        
        # 解析元数据
        metadata, content = parse_markdown_skill(skill_md)
        
        # 创建目标目录
        target_skill_dir = target_dir / skill_name
        target_skill_dir.mkdir(parents=True, exist_ok=True)
        
        # 1. 生成 skill.yaml
        dk_metadata = {
            'name': metadata.get('name', skill_name),
            'version': '1.0.0',
            'description': metadata.get('description', ''),
            'capabilities': ['agentic_workflow'],
            'parameters': {}
        }
        
        with open(target_skill_dir / 'skill.yaml', 'w', encoding='utf-8') as f:
            yaml.dump(dk_metadata, f, allow_unicode=True, sort_keys=False)
            
        # 2. 复制说明文档
        with open(target_skill_dir / 'prompt.md', 'w', encoding='utf-8') as f:
            f.write(content)
            
        # 3. 复制其他相关文件
        for item in skill_dir.iterdir():
            if item.name != 'SKILL.md' and item.is_file():
                shutil.copy2(item, target_skill_dir / item.name)
                
        # 4. 生成 main.py (SkillBase 的实现)
        main_py_content = f'''from pathlib import Path
from typing import Dict, Any

from core.skill_base import SkillBase
import structlog

logger = structlog.get_logger(__name__)

class Skill(SkillBase):
    """
    {dk_metadata['description']}
    """
    
    def __init__(self, metadata: Dict[str, Any]):
        super().__init__(metadata)
        self.prompt_path = Path(__file__).parent / 'prompt.md'
        
    def validate_pre_conditions(self, context: Dict[str, Any]) -> None:
        """校验前置条件"""
        pass
        
    def validate_inputs(self, context: Dict[str, Any]) -> None:
        """校验输入参数"""
        pass
        
    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """执行技能"""
        logger.info("executing_superpowers_skill", skill=self.name)
        
        prompt_content = ""
        if self.prompt_path.exists():
            prompt_content = self.prompt_path.read_text(encoding='utf-8')
            
        return {{
            "status": "success",
            "message": f"Successfully loaded instructions for {{self.name}}",
            "instructions": prompt_content
        }}
'''
        with open(target_skill_dir / 'main.py', 'w', encoding='utf-8') as f:
            f.write(main_py_content)
            
        print(f"Successfully converted skill: {skill_name}")

if __name__ == '__main__':
    source_dir = Path(r'C:\\Users\\qiufa\\Desktop\\deploy\\deployment-kit-design\\deploy-kit\\skills\\custom\\superpowers\\superpowers-main\\skills')
    target_dir = Path(r'C:\\Users\\qiufa\\Desktop\\deploy\\deployment-kit-design\\deploy-kit\\skills\\custom')
    
    generate_deploy_kit_skill(source_dir, target_dir)
