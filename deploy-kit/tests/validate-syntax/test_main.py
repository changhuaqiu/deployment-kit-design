"""
validate-syntax 技能主类测试

测试技能的完整执行流程
"""

import os
import tempfile
import zipfile
import pytest
from unittest.mock import Mock, patch
from skills.builtin.validate-syntax.scripts.main import Skill


class TestValidateSyntaxSkill:
    """validate-syntax 技能主类测试"""

    def test_execute_with_valid_yaml_directory(self):
        """测试：执行成功 - 有效的 YAML 目录"""
        # Arrange
        skill = Skill({'name': 'validate-syntax', 'version': '1.0.0'})
        with tempfile.TemporaryDirectory() as temp_dir:
            # 创建有效的 YAML 文件
            with open(os.path.join(temp_dir, 'valid.yaml'), 'w') as f:
                f.write('key: value\n')

            context = {
                'appid': 'test-app',
                'params': {
                    'artifact_source': temp_dir
                }
            }

            # Act
            result = skill.execute(context)

            # Assert
            assert result['status'] == 'success'
            assert 'data' in result
            assert result['data']['validation_result']['valid'] == True
            assert result['data']['validation_result']['total_files'] == 1
            assert result['data']['validation_result']['valid_files'] == 1
            assert result['data']['validation_result']['invalid_files'] == 0

    def test_execute_with_invalid_yaml_returns_errors(self):
        """测试：执行 - 检测到无效 YAML"""
        # Arrange
        skill = Skill({'name': 'validate-syntax', 'version': '1.0.0'})
        with tempfile.TemporaryDirectory() as temp_dir:
            # 创建一个有效的，一个无效的
            with open(os.path.join(temp_dir, 'valid.yaml'), 'w') as f:
                f.write('key: value\n')

            with open(os.path.join(temp_dir, 'invalid.yaml'), 'w') as f:
                f.write('key: value\n')
                f.write('  bad_indent: true\n')

            context = {
                'appid': 'test-app',
                'params': {
                    'artifact_source': temp_dir
                }
            }

            # Act
            result = skill.execute(context)

            # Assert
            assert result['status'] == 'success'  # 技能执行成功，但 YAML 有错误
            assert result['data']['validation_result']['valid'] == False
            assert result['data']['validation_result']['invalid_files'] == 1
            assert len(result['data']['validation_result']['errors']) == 1

    def test_execute_with_zip_file(self):
        """测试：执行 - 处理 ZIP 文件"""
        # Arrange
        skill = Skill({'name': 'validate-syntax', 'version': '1.0.0'})
        with tempfile.TemporaryDirectory() as temp_dir:
            # 创建测试 ZIP
            zip_path = os.path.join(temp_dir, 'test.zip')
            with zipfile.ZipFile(zip_path, 'w') as zf:
                zf.writestr('main.yaml', 'key: value\n')
                zf.writestr('config.yaml', 'app: test\n')

            context = {
                'appid': 'test-app',
                'params': {
                    'artifact_source': zip_path
                }
            }

            # Act
            result = skill.execute(context)

            # Assert
            assert result['status'] == 'success'
            assert result['data']['validation_result']['total_files'] == 2
            assert result['data']['validation_result']['valid'] == True
            assert result['data']['artifact_info']['source_type'] == 'zip'

    def test_execute_with_directory(self):
        """测试：执行 - 处理目录"""
        # Arrange
        skill = Skill({'name': 'validate-syntax', 'version': '1.0.0'})
        with tempfile.TemporaryDirectory() as temp_dir:
            # 创建测试文件
            with open(os.path.join(temp_dir, 'test.yaml'), 'w') as f:
                f.write('key: value\n')

            context = {
                'appid': 'test-app',
                'params': {
                    'artifact_source': temp_dir
                }
            }

            # Act
            result = skill.execute(context)

            # Assert
            assert result['status'] == 'success'
            assert result['data']['artifact_info']['source_type'] == 'directory'

    def test_execute_with_no_yaml_files(self):
        """测试：执行 - 没有 YAML 文件"""
        # Arrange
        skill = Skill({'name': 'validate-syntax', 'version': '1.0.0'})
        with tempfile.TemporaryDirectory() as temp_dir:
            # 创建非 YAML 文件
            with open(os.path.join(temp_dir, 'readme.txt'), 'w') as f:
                f.write('Some text\n')

            context = {
                'appid': 'test-app',
                'params': {
                    'artifact_source': temp_dir
                }
            }

            # Act
            result = skill.execute(context)

            # Assert
            assert result['status'] == 'failed'
            assert 'No YAML files found' in result['message']

    def test_execute_with_custom_timeout(self):
        """测试：执行 - 使用自定义超时"""
        # Arrange
        skill = Skill({'name': 'validate-syntax', 'version': '1.0.0'})
        with tempfile.TemporaryDirectory() as temp_dir:
            with open(os.path.join(temp_dir, 'test.yaml'), 'w') as f:
                f.write('key: value\n')

            context = {
                'appid': 'test-app',
                'params': {
                    'artifact_source': temp_dir,
                    'download_timeout': 600
                }
            }

            # Act
            result = skill.execute(context)

            # Assert
            assert result['status'] == 'success'

    def test_validate_pre_conditions_requires_artifact(self):
        """测试：前置条件验证 - 需要 artifact_source"""
        # Arrange
        skill = Skill({
            'name': 'validate-syntax',
            'version': '1.0.0',
            'pre_conditions': {
                'requires_artifact': True
            }
        })

        # Act & Assert - 缺少 artifact_source
        context = {
            'appid': 'test-app',
            'params': {}
        }

        # 应该抛出异常或返回失败
        try:
            result = skill.execute(context)
            # 如果没有异常，检查是否失败
            assert result['status'] == 'failed'
        except Exception as e:
            # 或者抛出异常
            assert 'artifact' in str(e).lower() or 'required' in str(e).lower()
