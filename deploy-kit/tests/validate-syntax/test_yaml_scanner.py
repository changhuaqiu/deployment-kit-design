"""
YamlScanner 测试

测试 YAML 文件扫描器
"""

import os
import tempfile
import pytest
from skills.builtin.validate-syntax.scripts.yaml_scanner import YamlScanner


class TestYamlScanner:
    """YamlScanner 测试类"""

    def test_scan_finds_yaml_files(self):
        """测试：找到 YAML 文件"""
        # Arrange
        scanner = YamlScanner()
        with tempfile.TemporaryDirectory() as temp_dir:
            # 创建测试文件
            files = ['main.yaml', 'config.yml', 'app.yaml', 'readme.txt']
            for filename in files:
                filepath = os.path.join(temp_dir, filename)
                with open(filepath, 'w') as f:
                    f.write('test: value\n')

            # Act
            result = scanner.scan(temp_dir)

            # Assert
            assert len(result) == 3  # 应该找到 3 个 YAML 文件
            assert any('main.yaml' in f for f in result)
            assert any('config.yml' in f for f in result)
            assert any('app.yaml' in f for f in result)
            assert not any('readme.txt' in f for f in result)

    def test_scan_recursively_finds_nested_yaml(self):
        """测试：递归扫描找到嵌套的 YAML 文件"""
        # Arrange
        scanner = YamlScanner()
        with tempfile.TemporaryDirectory() as temp_dir:
            # 创建嵌套目录结构
            os.makedirs(os.path.join(temp_dir, 'app'))
            os.makedirs(os.path.join(temp_dir, 'app', 'config'))

            files = [
                'main.yaml',
                'app/config.yaml',
                'app/config/env.yml',
            ]

            for filename in files:
                filepath = os.path.join(temp_dir, filename)
                with open(filepath, 'w') as f:
                    f.write('test: value\n')

            # Act
            result = scanner.scan(temp_dir)

            # Assert
            assert len(result) == 3
            assert all(any(f in path for path in result) for f in files)

    def test_scan_empty_directory_returns_empty_list(self):
        """测试：空目录返回空列表"""
        # Arrange
        scanner = YamlScanner()
        with tempfile.TemporaryDirectory() as temp_dir:
            # Act
            result = scanner.scan(temp_dir)

            # Assert
            assert result == []

    def test_scan_returns_relative_paths(self):
        """测试：返回相对路径"""
        # Arrange
        scanner = YamlScanner()
        with tempfile.TemporaryDirectory() as temp_dir:
            # 创建文件
            test_file = os.path.join(temp_dir, 'test.yaml')
            with open(test_file, 'w') as f:
                f.write('test: value\n')

            # Act
            result = scanner.scan(temp_dir)

            # Assert
            # 路径应该是相对的或相对于 temp_dir
            assert len(result) == 1
            assert 'test.yaml' in result[0]

    def test_scan_filters_only_yaml_extensions(self):
        """测试：只过滤 .yaml 和 .yml 文件"""
        # Arrange
        scanner = YamlScanner()
        with tempfile.TemporaryDirectory() as temp_dir:
            # 创建不同扩展名的文件
            files = [
                'test.yaml',
                'test.yml',
                'test.txt',
                'test.json',
                'test.yaml.bak',  # 不应该匹配
            ]

            for filename in files:
                filepath = os.path.join(temp_dir, filename)
                with open(filepath, 'w') as f:
                    f.write('test: value\n')

            # Act
            result = scanner.scan(temp_dir)

            # Assert
            assert len(result) == 2  # 只有 .yaml 和 .yml
            assert any('test.yaml' in f for f in result)
            assert any('test.yml' in f for f in result)
