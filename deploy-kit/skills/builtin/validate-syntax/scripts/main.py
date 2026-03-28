"""
validate-syntax 技能主类

协调各个组件，管理执行流程
"""

import os
from typing import Dict, Any
import structlog

from core.skill_base import SkillBase, SkillExecutionError
from .input_handler import InputHandler, ArtifactNotFoundError, ArtifactFormatError
from .yaml_scanner import YamlScanner
from .yaml_validator import YamlValidator


logger = structlog.get_logger(__name__)


class ValidationError(SkillExecutionError):
    """验证失败"""
    pass


class Skill(SkillBase):
    """
    validate-syntax 技能主类

    职责：
    1. 协调 InputHandler、YamlScanner、YamlValidator
    2. 管理执行流程
    3. 生成最终报告
    """

    def __init__(self, metadata: Dict[str, Any]):
        """
        初始化技能

        Args:
            metadata: 技能元数据
        """
        super().__init__(metadata)

        # 创建组件
        self.input_handler = InputHandler()
        self.yaml_scanner = YamlScanner()
        self.yaml_validator = YamlValidator()

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行技能

        Args:
            context: 执行上下文
                {
                    'appid': str,
                    'params': {
                        'artifact_source': str,      # 必需
                        'download_timeout': int       # 可选，默认 300
                    }
                }

        Returns:
            {
                'status': 'success' | 'failed',
                'data': {
                    'validation_result': {
                        'valid': bool,
                        'total_files': int,
                        'valid_files': int,
                        'invalid_files': int,
                        'errors': [
                            {
                                'file': str,
                                'error': str,
                                'line': int
                            }
                        ]
                    },
                    'artifact_info': {
                        'source_type': 'url' | 'zip' | 'directory',
                        'processed_path': str,
                        'yaml_files_found': list
                    }
                },
                'message': str
            }
        """
        # 1. 验证输入参数
        params = context.get('params', {})
        artifact_source = params.get('artifact_source')

        if not artifact_source:
            raise ValidationError(
                'validate-syntax',
                'Missing required parameter: artifact_source'
            )

        # 2. 准备输入
        download_timeout = params.get('download_timeout', 300)

        logger.info(
            "validating_artifact",
            skill=self.name,
            artifact_source=artifact_source
        )

        try:
            working_dir = self.input_handler.prepare_artifact(
                artifact_source,
                timeout=download_timeout
            )

            # 检测源类型
            source_type = self.input_handler._detect_source_type(artifact_source)

        except (ArtifactNotFoundError, ArtifactFormatError) as e:
            # 输入准备失败
            logger.error(
                "artifact_preparation_failed",
                error=str(e)
            )
            return {
                'status': 'failed',
                'message': str(e)
            }

        # 3. 扫描 YAML 文件
        try:
            yaml_files = self.yaml_scanner.scan(working_dir)
        except ValueError as e:
            logger.error("scan_failed", error=str(e))
            return {
                'status': 'failed',
                'message': f"Failed to scan directory: {str(e)}"
            }

        # 检查是否找到 YAML 文件
        if not yaml_files:
            logger.warning("no_yaml_files_found")
            return {
                'status': 'failed',
                'message': 'No YAML files found in artifact'
            }

        # 4. 校验 YAML 文件
        total_files = len(yaml_files)
        valid_files = 0
        invalid_files = 0
        errors = []

        for yaml_file in yaml_files:
            file_path = os.path.join(working_dir, yaml_file)

            try:
                result = self.yaml_validator.validate(file_path)

                if result is None:
                    # 有效
                    valid_files += 1
                else:
                    # 无效
                    invalid_files += 1
                    errors.append(result)

            except Exception as e:
                # 意外错误
                logger.error(
                    "validation_error",
                    file=yaml_file,
                    error=str(e)
                )
                errors.append({
                    'file': yaml_file,
                    'error': f"Validation error: {str(e)}"
                })
                invalid_files += 1

        # 5. 生成报告
        validation_result = {
            'valid': invalid_files == 0,
            'total_files': total_files,
            'valid_files': valid_files,
            'invalid_files': invalid_files,
            'errors': errors
        }

        artifact_info = {
            'source_type': source_type,
            'processed_path': working_dir,
            'yaml_files_found': yaml_files
        }

        logger.info(
            "validation_complete",
            valid=validation_result['valid'],
            total_files=total_files,
            valid_files=valid_files,
            invalid_files=invalid_files
        )

        # 6. 返回结果
        if validation_result['valid']:
            return {
                'status': 'success',
                'data': {
                    'validation_result': validation_result,
                    'artifact_info': artifact_info
                },
                'message': f'All {total_files} YAML files are valid'
            }
        else:
            # 即使有错误，技能本身执行成功
            return {
                'status': 'success',
                'data': {
                    'validation_result': validation_result,
                    'artifact_info': artifact_info
                },
                'message': f'Found {invalid_files} invalid YAML file(s) out of {total_files}'
            }

    def cleanup(self):
        """清理资源"""
        if self.input_handler:
            self.input_handler.cleanup()

    def __del__(self):
        """析构时清理"""
        self.cleanup()
