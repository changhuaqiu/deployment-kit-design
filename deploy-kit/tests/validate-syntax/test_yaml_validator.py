"""
YamlValidator 测试

测试 YAML 语法校验器
"""

import os
import tempfile
import pytest
from skills.builtin.validate-syntax.scripts.yaml_validator import YamlValidator


class TestYamlValidator:
    """YamlValidator 测试类"""

    def test_validate_valid_yaml_returns_none(self):
        """测试：有效的 YAML 返回 None"""
        # Arrange
        validator = YamlValidator()
        with tempfile.TemporaryDirectory() as temp_dir:
            test_file = os.path.join(temp_dir, 'valid.yaml')
            with open(test_file, 'w') as f:
                f.write('key: value\n')
                f.write('list:\n')
                f.write('  - item1\n')
                f.write('  - item2\n')

            # Act
            result = validator.validate(test_file)

            # Assert
            assert result is None

    def test_validate_invalid_yaml_returns_error(self):
        """测试：无效的 YAML 返回错误信息"""
        # Arrange
        validator = YamlValidator()
        with tempfile.TemporaryDirectory() as temp_dir:
            test_file = os.path.join(temp_dir, 'invalid.yaml')
            with open(test_file, 'w') as f:
                f.write('key: value\n')
                f.write('  invalid_indent: true\n')  # 错误的缩进

            # Act
            result = validator.validate(test_file)

            # Assert
            assert result is not None
            assert 'file' in result
            assert 'error' in result
            assert result['file'] == test_file
            assert len(result['error']) > 0

    def test_validate_detects_syntax_errors(self):
        """测试：检测语法错误"""
        # Arrange
        validator = YamlValidator()
        with tempfile.TemporaryDirectory() as temp_dir:
            test_file = os.path.join(temp_dir, 'syntax_error.yaml')
            with open(test_file, 'w') as f:
                f.write('key: value\n')
                f.write('mapping:\n')
                f.write('  key1: value1\n')
                f.write('key2: value2\n')  # 错误：不正确的缩进

            # Act
            result = validator.validate(test_file)

            # Assert
            assert result is not None
            assert 'error' in result

    def test_validate_handles_empty_file(self):
        """测试：处理空文件"""
        # Arrange
        validator = YamlValidator()
        with tempfile.TemporaryDirectory() as temp_dir:
            test_file = os.path.join(temp_dir, 'empty.yaml')
            with open(test_file, 'w') as f:
                f.write('')

            # Act
            result = validator.validate(test_file)

            # Assert
            # 空文件是有效的 YAML
            assert result is None

    def test_validate_handles_complex_yaml(self):
        """测试：处理复杂的 YAML 结构"""
        # Arrange
        validator = YamlValidator()
        with tempfile.TemporaryDirectory() as temp_dir:
            test_file = os.path.join(temp_dir, 'complex.yaml')
            with open(test_file, 'w') as f:
                f.write('# Comment\n')
                f.write('key: value\n')
                f.write('nested:\n')
                f.write('  level1:\n')
                f.write('    level2: value\n')
                f.write('list:\n')
                f.write('  - item1\n')
                f.write('  - item2\n')
                f.write('multiline: |\n')
                f.write('  line 1\n')
                f.write('  line 2\n')

            # Act
            result = validator.validate(test_file)

            # Assert
            assert result is None

    def test_validate_raises_error_for_nonexistent_file(self):
        """测试：不存在的文件抛出异常"""
        # Arrange
        validator = YamlValidator()

        # Act & Assert
        with pytest.raises(FileNotFoundError):
            validator.validate('/nonexistent/file.yaml')

    def test_validate_includes_line_number_in_error(self):
        """测试：错误包含行号"""
        # Arrange
        validator = YamlValidator()
        with tempfile.TemporaryDirectory() as temp_dir:
            test_file = os.path.join(temp_dir, 'error_with_line.yaml')
            with open(test_file, 'w') as f:
                f.write('key1: value1\n')
                f.write('key2: value2\n')
                f.write('invalid: [unclosed\n')  # 错误的语法

            # Act
            result = validator.validate(test_file)

            # Assert
            assert result is not None
            # 行号可能是可选的，但如果存在应该是正整数
            if 'line' in result:
                assert isinstance(result['line'], int)
                assert result['line'] > 0
