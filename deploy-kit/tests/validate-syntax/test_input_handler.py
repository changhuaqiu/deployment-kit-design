"""
InputHandler 测试

测试输入处理器的各种场景
"""

import os
import tempfile
import zipfile
import pytest
from skills.builtin.validate_syntax.scripts.input_handler import InputHandler
from core.exceptions import SkillExecutionError


class TestInputHandler:
    """InputHandler 测试类"""

    def test_prepare_directory_directly(self):
        """测试：直接使用目录（最简单场景）"""
        # Arrange
        handler = InputHandler()
        with tempfile.TemporaryDirectory() as temp_dir:
            # 创建一些测试文件
            test_file = os.path.join(temp_dir, 'test.yaml')
            with open(test_file, 'w') as f:
                f.write('test: value\n')

            # Act
            result = handler.prepare_artifact(temp_dir)

            # Assert
            assert result == temp_dir
            assert os.path.exists(result)

    def test_extract_local_zip_file(self):
        """测试：解压本地 ZIP 文件"""
        # Arrange
        handler = InputHandler()
        with tempfile.TemporaryDirectory() as temp_dir:
            # 创建测试 ZIP 文件
            zip_path = os.path.join(temp_dir, 'test.zip')
            with zipfile.ZipFile(zip_path, 'w') as zf:
                zf.writestr('main.yaml', 'key: value\n')
                zf.writestr('app/config.yaml', 'app: test\n')

            # Act
            result = handler.prepare_artifact(zip_path)

            # Assert
            assert os.path.exists(result)
            assert os.path.isdir(result)
            assert os.path.exists(os.path.join(result, 'main.yaml'))
            assert os.path.exists(os.path.join(result, 'app', 'config.yaml'))

    def test_download_zip_from_url(self, requests_mock):
        """测试：从 URL 下载 ZIP"""
        # Arrange
        handler = InputHandler()
        zip_content = b'PK\x03\x04'  # 简单的 ZIP 文件头

        # Mock HTTP 请求
        requests_mock.get(
            'http://example.com/test.zip',
            content=zip_content
        )

        # Act
        result = handler.prepare_artifact('http://example.com/test.zip')

        # Assert
        assert os.path.exists(result)
        assert os.path.isdir(result)

    def test_raise_error_for_invalid_url(self, requests_mock):
        """测试：无效 URL 抛出异常"""
        # Arrange
        handler = InputHandler()
        requests_mock.get(
            'http://example.com/missing.zip',
            status_code=404
        )

        # Act & Assert
        with pytest.raises(SkillExecutionError) as exc_info:
            handler.prepare_artifact('http://example.com/missing.zip')

        assert 'not found' in str(exc_info.value).lower()

    def test_raise_error_for_corrupted_zip(self):
        """测试：损坏的 ZIP 文件抛出异常"""
        # Arrange
        handler = InputHandler()
        with tempfile.TemporaryDirectory() as temp_dir:
            # 创建损坏的 ZIP 文件
            zip_path = os.path.join(temp_dir, 'corrupted.zip')
            with open(zip_path, 'wb') as f:
                f.write(b'This is not a zip file')

            # Act & Assert
            with pytest.raises(SkillExecutionError) as exc_info:
                handler.prepare_artifact(zip_path)

            assert 'format' in str(exc_info.value).lower() or 'corrupt' in str(exc_info.value).lower()

    def test_raise_error_for_nonexistent_path(self):
        """测试：不存在的路径抛出异常"""
        # Arrange
        handler = InputHandler()

        # Act & Assert
        with pytest.raises(SkillExecutionError) as exc_info:
            handler.prepare_artifact('/nonexistent/path')

        assert 'not found' in str(exc_info.value).lower() or 'exist' in str(exc_info.value).lower()
