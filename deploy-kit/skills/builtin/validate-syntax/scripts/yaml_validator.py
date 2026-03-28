"""
YAML 校验器 - 校验单个 YAML 文件的语法
"""

import os
from typing import Optional, Dict, Any
import yaml


class YamlValidator:
    """
    YAML 校验器

    职责：
    1. 读取 YAML 文件
    2. 使用 PyYAML.safe_load() 解析
    3. 捕获语法错误
    4. 返回详细的错误信息
    """

    def validate(self, file_path: str) -> Optional[Dict[str, Any]]:
        """
        校验单个 YAML 文件

        Args:
            file_path: 文件路径

        Returns:
            None if valid, otherwise:
            {
                'file': str,
                'error': str,
                'line': int (optional)
            }

        Raises:
            FileNotFoundError: 文件不存在
        """
        # 检查文件是否存在
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        if not os.path.isfile(file_path):
            raise ValueError(f"Path is not a file: {file_path}")

        # 读取并解析文件
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # 使用 safe_load（安全，防止 RCE）
            yaml.safe_load(content)

            # 没有错误，返回 None
            return None

        except yaml.YAMLError as e:
            # 解析错误信息
            error_info = {
                'file': file_path,
                'error': str(e)
            }

            # 尝试提取行号
            if hasattr(e, 'problem_mark'):
                mark = e.problem_mark
                if mark:
                    # PyYAML 的行号从 0 开始，转为从 1 开始
                    error_info['line'] = mark.line + 1

            return error_info

        except Exception as e:
            # 其他错误
            return {
                'file': file_path,
                'error': f"Unexpected error: {str(e)}"
            }
