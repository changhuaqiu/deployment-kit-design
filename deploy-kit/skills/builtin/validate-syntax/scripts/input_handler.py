"""
输入处理器 - 准备 XaC 制品

处理不同类型的输入源：
- URL: 下载 ZIP
- ZIP 文件: 解压
- 目录: 直接使用
"""

import os
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Optional
import requests

from core.exceptions import SkillExecutionError


class ArtifactNotFoundError(SkillExecutionError):
    """制品不存在"""
    pass


class ArtifactAccessError(SkillExecutionError):
    """无法访问制品"""
    pass


class ArtifactFormatError(SkillExecutionError):
    """制品格式错误"""
    pass


class InputHandler:
    """
    输入处理器

    职责：
    1. 检测输入类型
    2. 下载/解压/验证输入源
    3. 返回统一的目录路径
    """

    def __init__(self):
        """初始化输入处理器"""
        self.temp_dir = None

    def prepare_artifact(self, source: str, timeout: int = 300) -> str:
        """
        准备制品，返回可扫描的目录路径

        Args:
            source: URL/ZIP/目录路径
            timeout: 下载超时时间（秒）

        Returns:
            目录路径（用于扫描 YAML 文件）

        Raises:
            ArtifactNotFoundError: 源不存在
            ArtifactAccessError: 无法访问
            ArtifactFormatError: 格式错误
        """
        # 1. 检测输入类型
        source_type = self._detect_source_type(source)

        # 2. 根据类型处理
        if source_type == 'url':
            return self._prepare_from_url(source, timeout)
        elif source_type == 'zip':
            return self._prepare_from_zip(source)
        else:  # directory
            return self._prepare_from_directory(source)

    def _detect_source_type(self, source: str) -> str:
        """
        检测输入源类型

        Returns:
            'url', 'zip', 或 'directory'
        """
        # URL 检测
        if source.startswith(('http://', 'https://')):
            return 'url'

        # 文件/路径检测
        path = Path(source)

        # ZIP 文件
        if path.is_file() and source.endswith('.zip'):
            return 'zip'

        # 目录或其他
        return 'directory'

    def _prepare_from_url(self, url: str, timeout: int) -> str:
        """
        从 URL 下载并解压 ZIP

        Args:
            url: ZIP 文件 URL
            timeout: 超时时间（秒）

        Returns:
            解压后的目录路径
        """
        # 1. 下载 ZIP
        try:
            response = requests.get(url, timeout=timeout, stream=True)
            response.raise_for_status()

            # 检查是否是 404
            if response.status_code == 404:
                raise ArtifactNotFoundError(
                    f"validate-syntax",
                    f"Artifact not found: {url}"
                )

        except requests.exceptions.RequestException as e:
            if '404' in str(e) or 'Not Found' in str(e):
                raise ArtifactNotFoundError(
                    f"validate-syntax",
                    f"Artifact not found: {url}"
                )
            else:
                raise ArtifactAccessError(
                    f"validate-syntax",
                    f"Failed to download artifact: {str(e)}"
                )

        # 2. 保存到临时文件
        self.temp_dir = tempfile.mkdtemp(prefix='dk-xac-')
        zip_path = os.path.join(self.temp_dir, 'artifact.zip')

        with open(zip_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        # 3. 解压
        return self._extract_zip(zip_path, self.temp_dir)

    def _prepare_from_zip(self, zip_path: str) -> str:
        """
        解压本地 ZIP 文件

        Args:
            zip_path: ZIP 文件路径

        Returns:
            解压后的目录路径
        """
        # 检查文件是否存在
        if not os.path.exists(zip_path):
            raise ArtifactNotFoundError(
                f"validate-syntax",
                f"ZIP file not found: {zip_path}"
            )

        # 创建临时目录
        self.temp_dir = tempfile.mkdtemp(prefix='dk-xac-')

        # 解压
        return self._extract_zip(zip_path, self.temp_dir)

    def _prepare_from_directory(self, dir_path: str) -> str:
        """
        直接使用目录

        Args:
            dir_path: 目录路径

        Returns:
            目录路径
        """
        # 检查目录是否存在
        if not os.path.exists(dir_path):
            raise ArtifactNotFoundError(
                f"validate-syntax",
                f"Directory not found: {dir_path}"
            )

        if not os.path.isdir(dir_path):
            raise ArtifactFormatError(
                f"validate-syntax",
                f"Path is not a directory: {dir_path}"
            )

        return dir_path

    def _extract_zip(self, zip_path: str, target_dir: str) -> str:
        """
        解压 ZIP 文件

        Args:
            zip_path: ZIP 文件路径
            target_dir: 目标目录

        Returns:
            解压后的目录路径

        Raises:
            ArtifactFormatError: ZIP 文件损坏或格式错误
        """
        try:
            with zipfile.ZipFile(zip_path, 'r') as zf:
                # 安全检查：防止路径遍历攻击
                for member in zf.namelist():
                    if os.path.isabs(member) or '..' in member:
                        raise ArtifactFormatError(
                            f"validate-syntax",
                            f"Unsafe ZIP archive: contains absolute paths or path traversal"
                        )

                # 解压
                zf.extractall(target_dir)

            # 返回目标目录
            return target_dir

        except zipfile.BadZipFile as e:
            raise ArtifactFormatError(
                f"validate-syntax",
                f"Corrupted ZIP file: {str(e)}"
            )
        except Exception as e:
            if isinstance(e, ArtifactFormatError):
                raise
            raise ArtifactFormatError(
                f"validate-syntax",
                f"Failed to extract ZIP: {str(e)}"
            )

    def cleanup(self):
        """清理临时文件"""
        if self.temp_dir and os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
            self.temp_dir = None

    def __del__(self):
        """析构时清理"""
        self.cleanup()
