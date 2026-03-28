"""
技能基类 - 所有技能的抽象接口

核心特性：
1. 统一的执行接口
2. 前置条件验证
3. 执行钩子（before/after/error）
4. 元数据声明
5. 上下文管理

遵循 harness-engineering 原则：
- 技能自我声明能力
- 统一数据流
- 约束通过不变量强制执行
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import structlog

logger = structlog.get_logger(__name__)


class SkillBase(ABC):
    """
    技能基类（抽象接口）

    所有技能必须继承此类并实现 execute() 方法
    """

    def __init__(self, metadata: Dict[str, Any]):
        """
        初始化技能

        Args:
            metadata: 技能元数据（从 skill.yaml 加载）
        """
        # 基本信息
        self.name = metadata['name']
        self.version = metadata['version']
        self.description = metadata['description']
        self.author = metadata.get('author', 'unknown')

        # 前置条件
        self.pre_conditions = metadata.get('pre_conditions', {})

        # 能力声明
        self.capabilities = metadata.get('capabilities', [])

        # 输入输出定义
        self.inputs = metadata.get('inputs', {})
        self.outputs = metadata.get('outputs', {})

        # 执行统计
        self.stats = {
            'total_executions': 0,
            'successful_executions': 0,
            'failed_executions': 0,
            'last_execution': None
        }

    @abstractmethod
    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行技能（子类必须实现）

        Args:
            context: 执行上下文
                {
                    'appid': str,
                    'cache_dir': str,
                    'dependencies': dict,
                    'state': dict,
                    'params': dict
                }

        Returns:
            技能执行结果
                {
                    'status': 'success' | 'failed',
                    'data': any,
                    'message': str,
                    'progress': dict  # 可选
                }

        Raises:
            SkillExecutionError: 技能执行失败
            SkillPreConditionError: 前置条件不满足
        """
        pass

    def validate_pre_conditions(self, context: Dict[str, Any]) -> bool:
        """
        验证前置条件

        Args:
            context: 执行上下文

        Returns:
            是否满足前置条件

        Raises:
            SkillPreConditionError: 前置条件不满足
        """
        logger.debug(
            "validating_pre_conditions",
            skill=self.name,
            conditions=self.pre_conditions
        )

        for condition_name, condition_value in self.pre_conditions.items():
            if condition_name == 'requires_cache':
                if not context.get('cache_exists'):
                    raise SkillPreConditionError(
                        self.name,
                        f"技能 {self.name} 需要缓存，但缓存不存在"
                    )

            elif condition_name == 'requires_appid':
                if not context.get('appid'):
                    raise SkillPreConditionError(
                        self.name,
                        f"技能 {self.name} 需要 appid 参数"
                    )

            elif condition_name == 'requires_dependencies':
                if not context.get('dependencies'):
                    raise SkillPreConditionError(
                        self.name,
                        f"技能 {self.name} 需要依赖关系"
                    )

            elif condition_name == 'requires_mcp':
                # MCP 可用性检查
                pass

            # 可以添加更多前置条件检查

        return True

    def validate_inputs(self, context: Dict[str, Any]) -> bool:
        """
        验证输入参数

        Args:
            context: 执行上下文

        Returns:
            输入是否有效
        """
        if not self.inputs:
            return True

        # 检查必需的输入
        params = context.get('params', {})

        for input_name, input_def in self.inputs.items():
            if input_def.get('required', False):
                if input_name not in params:
                    raise ValueError(
                        f"技能 {self.name} 缺少必需参数: {input_name}"
                    )

            # 类型检查
            if input_name in params:
                expected_type = input_def.get('type')
                if expected_type:
                    self._validate_type(
                        params[input_name],
                        expected_type,
                        input_name
                    )

        return True

    def _validate_type(self, value: Any, expected_type: str, param_name: str):
        """验证参数类型"""
        type_mapping = {
            'string': str,
            'integer': int,
            'float': float,
            'boolean': bool,
            'array': list,
            'object': dict
        }

        expected_python_type = type_mapping.get(expected_type)
        if expected_python_type and not isinstance(value, expected_python_type):
            raise ValueError(
                f"参数 {param_name} 类型错误: "
                f"期望 {expected_type}, 实际 {type(value).__name__}"
            )

    def before_execute(self, context: Dict[str, Any]) -> None:
        """
        执行前钩子（可选重写）

        用于：
        - 日志记录
        - 资源准备
        - 状态检查
        """
        logger.info(
            "skill_executing",
            skill=self.name,
            version=self.version,
            appid=context.get('appid')
        )

    def after_execute(
        self,
        context: Dict[str, Any],
        result: Dict[str, Any]
    ) -> None:
        """
        执行后钩子（可选重写）

        用于：
        - 结果验证
        - 清理工作
        - 统计更新
        """
        # 更新统计
        self.stats['total_executions'] += 1
        self.stats['last_execution'] = datetime.now(timezone.utc).isoformat()

        if result.get('status') == 'success':
            self.stats['successful_executions'] += 1
        else:
            self.stats['failed_executions'] += 1

        logger.info(
            "skill_executed",
            skill=self.name,
            status=result.get('status'),
            duration=result.get('duration_seconds')
        )

    def on_error(
        self,
        context: Dict[str, Any],
        error: Exception
    ) -> None:
        """
        错误处理钩子（可选重写）

        用于：
        - 错误日志
        - 清理工作
        - 错误恢复

        Args:
            context: 执行上下文
            error: 捕获的异常
        """
        logger.error(
            "skill_error",
            skill=self.name,
            error_type=type(error).__name__,
            error_message=str(error)
        )

    def get_progress(self) -> Optional[Dict[str, Any]]:
        """
        获取当前进度（可选实现）

        Returns:
            进度信息
                {
                    'percentage': float,  # 0-100
                    'message': str
                }
        """
        return None

    def get_capabilities(self) -> List[str]:
        """获取技能能力列表"""
        return self.capabilities.copy()

    def get_stats(self) -> Dict[str, Any]:
        """获取执行统计"""
        return self.stats.copy()

    def __repr__(self) -> str:
        return f"Skill({self.name}@{self.version})"


# ==================== 技能异常 ====================

class SkillError(Exception):
    """技能基础错误"""
    pass


class SkillPreConditionError(SkillError):
    """前置条件错误"""
    def __init__(self, skill: str, message: str):
        super().__init__(f"[{skill}] {message}")
        self.skill = skill


class SkillExecutionError(SkillError):
    """技能执行错误"""
    def __init__(self, skill: str, message: str, details: dict = None):
        super().__init__(f"[{skill}] {message}")
        self.skill = skill
        self.details = details or {}


class SkillInputError(SkillError):
    """输入参数错误"""
    def __init__(self, skill: str, param: str, message: str):
        super().__init__(f"[{skill}] 参数 {param}: {message}")
        self.skill = skill
        self.param = param
