"""
Deployment Kit 核心异常类

定义所有自定义异常，便于智能体理解和处理
"""


class DeploymentKitError(Exception):
    """Deployment Kit 基础异常"""
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details or {}
        super().__init__(message)

    def to_dict(self) -> dict:
        """转换为字典（便于序列化）"""
        return {
            'error_type': self.__class__.__name__,
            'message': self.message,
            'details': self.details
        }


# ==================== 缓存相关异常 ====================

class CacheError(DeploymentKitError):
    """缓存基础错误"""
    pass


class CacheNotFoundError(CacheError):
    """缓存不存在"""
    def __init__(self, appid: str):
        super().__init__(
            f"缓存不存在: {appid}",
            {'appid': appid}
        )


class CacheExpiredError(CacheError):
    """缓存已过期"""
    def __init__(self, appid: str, age_seconds: float):
        super().__init__(
            f"缓存已过期: {appid} (过期 {age_seconds:.0f} 秒)",
            {'appid': appid, 'age_seconds': age_seconds}
        )


class CacheCorruptedError(CacheError):
    """缓存数据损坏"""
    def __init__(self, appid: str, reason: str):
        super().__init__(
            f"缓存数据损坏: {appid} - {reason}",
            {'appid': appid, 'reason': reason}
        )


class CacheValidationError(CacheError):
    """缓存验证失败"""
    def __init__(self, appid: str, validation_errors: list):
        super().__init__(
            f"缓存验证失败: {appid}",
            {'appid': appid, 'validation_errors': validation_errors}
        )


# ==================== MCP 相关异常 ====================

class MCPError(DeploymentKitError):
    """MCP 基础错误"""
    pass


class MCPConnectionError(MCPError):
    """MCP 连接错误（可重试）"""
    def __init__(self, endpoint: str, message: str):
        super().__init__(
            f"MCP 连接失败: {endpoint} - {message}",
            {'endpoint': endpoint, 'retryable': True}
        )


class MCPTimeoutError(MCPError):
    """MCP 超时错误（可重试）"""
    def __init__(self, tool: str, timeout: int):
        super().__init__(
            f"MCP 工具超时: {tool} (超时 {timeout} 秒)",
            {'tool': tool, 'timeout': timeout, 'retryable': True}
        )


class MCPResponseError(MCPError):
    """MCP 响应错误"""
    def __init__(self, tool: str, message: str):
        super().__init__(
            f"MCP 响应错误: {tool} - {message}",
            {'tool': tool}
        )


# ==================== 验证相关异常 ====================

class ValidationError(DeploymentKitError):
    """验证基础错误"""
    pass


class XaCSyntaxError(ValidationError):
    """XaC 语法错误"""
    def __init__(self, file: str, line: int, message: str):
        super().__init__(
            f"XaC 语法错误: {file}:{line} - {message}",
            {'file': file, 'line': line, 'retryable': False}
        )


class DependencyError(ValidationError):
    """依赖关系错误"""
    def __init__(self, message: str, dependencies: list = None):
        super().__init__(
            f"依赖关系错误: {message}",
            {'dependencies': dependencies or []}
        )


# ==================== 技能相关异常 ====================

class SkillError(DeploymentKitError):
    """技能基础错误"""
    pass


class SkillExecutionError(SkillError):
    """技能执行错误"""
    def __init__(self, skill: str, message: str, auto_fixable: bool = False):
        super().__init__(
            f"技能执行失败: {skill} - {message}",
            {'skill': skill, 'auto_fixable': auto_fixable}
        )


class SkillPreConditionError(SkillError):
    """技能前置条件错误"""
    def __init__(self, skill: str, condition: str):
        super().__init__(
            f"技能前置条件不满足: {skill} - {condition}",
            {'skill': skill, 'condition': condition}
        )


# ==================== 工作流相关异常 ====================

class WorkflowError(DeploymentKitError):
    """工作流基础错误"""
    pass


class WorkflowValidationError(WorkflowError):
    """工作流验证错误"""
    def __init__(self, workflow: str, message: str):
        super().__init__(
            f"工作流验证失败: {workflow} - {message}",
            {'workflow': workflow}
        )


class WorkflowExecutionError(WorkflowError):
    """工作流执行错误"""
    def __init__(self, workflow: str, step: str, message: str):
        super().__init__(
            f"工作流执行失败: {workflow} - {step} - {message}",
            {'workflow': workflow, 'step': step}
        )
