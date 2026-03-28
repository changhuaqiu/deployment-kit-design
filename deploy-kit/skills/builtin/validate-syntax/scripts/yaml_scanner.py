"""
YAML 扫描器 - 递归扫描目录中的 YAML 文件
"""

import os
from pathlib import Path
from typing import List


class YamlScanner:
    """
    YAML 扫描器

    职责：
    1. 递归扫描目录
    2. 过滤 YAML 文件（.yaml, .yml）
    3. 返回文件列表
    """

    # YAML 文件扩展名
    YAML_EXTENSIONS = {'.yaml', '.yml'}

    def scan(self, directory: str) -> List[str]:
        """
        扫描目录，返回所有 YAML 文件路径

        Args:
            directory: 目录路径

        Returns:
            YAML 文件路径列表（相对路径）

        Raises:
            ValueError: 如果目录不存在
        """
        # 验证目录
        if not os.path.exists(directory):
            raise ValueError(f"Directory does not exist: {directory}")

        if not os.path.isdir(directory):
            raise ValueError(f"Path is not a directory: {directory}")

        # 扫描文件
        yaml_files = []

        for root, dirs, files in os.walk(directory):
            for filename in files:
                filepath = os.path.join(root, filename)

                # 检查扩展名
                if self._is_yaml_file(filepath):
                    # 返回相对路径
                    rel_path = os.path.relpath(filepath, directory)
                    yaml_files.append(rel_path)

        return yaml_files

    def _is_yaml_file(self, filepath: str) -> bool:
        """
        检查文件是否是 YAML 文件

        Args:
            filepath: 文件路径

        Returns:
            是否是 YAML 文件
        """
        ext = Path(filepath).suffix.lower()
        return ext in self.YAML_EXTENSIONS
