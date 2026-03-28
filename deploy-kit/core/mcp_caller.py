"""
MCP 调用器 - 智能体可靠调用

核心特性：
1. 自动并发调用（提升性能）
2. 自动重试（指数退避）
3. 错误分类和处理
4. 超时保护
5. 部分失败容忍

遵循 harness-engineering 原则：
- 智能体运行6+小时必须可靠
- 自动处理临时性错误
- 详细的日志记录
"""

import asyncio
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timezone
import structlog

from core.exceptions import (
    MCPConnectionError,
    MCPTimeoutError,
    MCPResponseError,
    DeploymentKitError
)

logger = structlog.get_logger(__name__)


# ==================== MCP 客户端模拟 ====================

class MCPClientMock:
    """
    MCP 客户端模拟器（用于演示）

    实际实现时，替换为真实的 MCP 客户端
    """

    async def call(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """模拟 MCP 调用"""
        # 模拟网络延迟
        await asyncio.sleep(0.5)

        # 模拟不同的工具
        if tool_name == 'get_resource_stats':
            return {
                'appid': params['appid'],
                'types': ['ads', 'config', 'vpc', 'security_group'],
                'total_resources': 42
            }
        elif tool_name == 'get_ads_list':
            return {
                'resources': [
                    {'id': 'ads-001', 'name': 'cluster-1', 'flavor': 's2.large.2'},
                    {'id': 'ads-002', 'name': 'cluster-2', 'flavor': 's2.xlarge.4'}
                ]
            }
        elif tool_name.startswith('get_'):
            resource_type = tool_name.replace('get_', '').replace('_list', '')
            return {
                'resources': [
                    {'id': f'{resource_type}-001', 'name': f'resource-1'}
                ]
            }
        else:
            raise ValueError(f"未知工具: {tool_name}")


# 全局 MCP 客户端实例
mcp_client = MCPClientMock()


# ==================== 错误分类 ====================

def classify_mcp_error(error: Exception) -> str:
    """
    分类 MCP 错误

    Returns:
        错误类型：'retryable' | 'fatal' | 'unknown'
    """
    error_message = str(error).lower()
    error_type = type(error).__name__

    # 网络相关错误（可重试）
    if any(keyword in error_message for keyword in [
        'timeout', 'timed out', 'connection', 'network', 'temporary'
    ]):
        return 'retryable'

    # 认证相关错误（不可重试）
    if any(keyword in error_message for keyword in [
        'authentication', 'authorization', 'unauthorized', 'forbidden'
    ]):
        return 'fatal'

    # 服务端错误（5xx，可重试）
    if '500' in error_message or '502' in error_message or '503' in error_message:
        return 'retryable'

    # 客户端错误（4xx，不可重试）
    if '400' in error_message or '404' in error_message:
        return 'fatal'

    # 默认认为是可重试的（保守策略）
    return 'retryable'


# ==================== MCP 调用器 ====================

class MCPCaller:
    """
    MCP 调用器（智能体可靠调用）

    特性：
    - 并发调用提升性能
    - 自动重试（指数退避）
    - 错误分类和处理
    - 超时保护
    - 部分失败容忍
    """

    def __init__(
        self,
        max_concurrent: int = 5,
        max_retries: int = 3,
        default_timeout: int = 30
    ):
        """
        初始化 MCP 调用器

        Args:
            max_concurrent: 最大并发数
            max_retries: 最大重试次数
            default_timeout: 默认超时时间（秒）
        """
        self.max_concurrent = max_concurrent
        self.max_retries = max_retries
        self.default_timeout = default_timeout
        self.semaphore = asyncio.Semaphore(max_concurrent)

        # 统计信息
        self.stats = {
            'total_calls': 0,
            'successful_calls': 0,
            'failed_calls': 0,
            'retried_calls': 0,
            'timeout_calls': 0
        }

    async def call_tool(
        self,
        tool_name: str,
        params: Dict[str, Any],
        timeout: Optional[int] = None,
        retries: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        调用单个 MCP 工具（带重试）

        Args:
            tool_name: 工具名称
            params: 参数
            timeout: 超时时间（秒）
            retries: 重试次数（覆盖默认值）

        Returns:
            {
                'success': bool,
                'data': dict,
                'tool': str,
                'attempts': int,
                'duration_seconds': float
            }

        Raises:
            MCPTimeoutError: 超时
            MCPConnectionError: 连接失败
            MCPResponseError: 响应错误
        """
        timeout = timeout or self.default_timeout
        retries = retries if retries is not None else self.max_retries

        start_time = datetime.now(timezone.utc)
        last_error = None

        for attempt in range(retries + 1):
            self.stats['total_calls'] += 1

            try:
                # 记录尝试
                if attempt > 0:
                    logger.info(
                        "mcp_retry_attempt",
                        tool=tool_name,
                        attempt=attempt,
                        max_retries=retries
                    )
                    self.stats['retried_calls'] += 1

                # 执行调用（带信号量限制）
                async with self.semaphore:
                    result = await asyncio.wait_for(
                        mcp_client.call(tool_name, params),
                        timeout=timeout
                    )

                # 成功
                duration = (datetime.now(timezone.utc) - start_time).total_seconds()
                self.stats['successful_calls'] += 1

                logger.info(
                    "mcp_call_success",
                    tool=tool_name,
                    duration_seconds=duration,
                    attempts=attempt + 1
                )

                return {
                    'success': True,
                    'data': result,
                    'tool': tool_name,
                    'attempts': attempt + 1,
                    'duration_seconds': duration
                }

            except asyncio.TimeoutError as e:
                last_error = e
                self.stats['timeout_calls'] += 1

                logger.warning(
                    "mcp_call_timeout",
                    tool=tool_name,
                    timeout=timeout,
                    attempt=attempt
                )

                # 超时错误可重试
                if attempt < retries:
                    await self._backoff(attempt)
                    continue
                else:
                    raise MCPTimeoutError(tool_name, timeout)

            except Exception as e:
                last_error = e

                # 分类错误
                error_type = classify_mcp_error(e)

                logger.warning(
                    "mcp_call_error",
                    tool=tool_name,
                    error=str(e),
                    error_type=error_type,
                    attempt=attempt
                )

                # 如果是致命错误，直接抛出
                if error_type == 'fatal':
                    self.stats['failed_calls'] += 1
                    if 'authentication' in str(e).lower():
                        raise MCPConnectionError(
                            mcp_client.__class__.__name__,
                            f"认证失败: {str(e)}"
                        )
                    else:
                        raise MCPResponseError(tool_name, str(e))

                # 如果是可重试错误，继续重试
                if error_type == 'retryable' and attempt < retries:
                    await self._backoff(attempt)
                    continue
                else:
                    # 达到最大重试次数或未知错误
                    self.stats['failed_calls'] += 1
                    raise MCPConnectionError(
                        mcp_client.__class__.__name__,
                        f"{str(e)} (已重试 {attempt} 次)"
                    )

        # 理论上不会到这里
        self.stats['failed_calls'] += 1
        raise MCPConnectionError(
            mcp_client.__class__.__name__,
            f"未知错误: {last_error}"
        )

    async def _backoff(self, attempt: int):
        """
        指数退避

        Args:
            attempt: 当前尝试次数（从0开始）
        """
        # 指数退避：1s, 2s, 4s, 8s, ...
        backoff_seconds = 2 ** attempt
        # 限制最大退避时间
        backoff_seconds = min(backoff_seconds, 10)

        logger.debug(
            "mcp_backoff",
            attempt=attempt,
            backoff_seconds=backoff_seconds
        )

        await asyncio.sleep(backoff_seconds)

    async def fetch_all_resources(
        self,
        appid: str,
        resource_types: Optional[List[str]] = None,
        concurrent: bool = True
    ) -> Dict[str, Any]:
        """
        并发获取所有资源（智能体友好）

        Args:
            appid: 应用ID
            resource_types: 资源类型列表（如果为None，自动获取）
            concurrent: 是否并发调用

        Returns:
            {
                'success': bool,
                'resources': Dict[str, Any],
                'failed': List[str],
                'partial': bool,
                'stats': {
                    'total': int,
                    'successful': int,
                    'failed': int,
                    'duration_seconds': float
                }
            }
        """
        start_time = datetime.now(timezone.utc)

        # 如果没有指定资源类型，先获取统计信息
        if resource_types is None:
            try:
                stats_result = await self.call_tool(
                    'get_resource_stats',
                    {'appid': appid}
                )
                resource_types = stats_result['data']['types']
            except Exception as e:
                logger.error(
                    "failed_to_get_resource_stats",
                    appid=appid,
                    error=str(e)
                )
                return {
                    'success': False,
                    'resources': {},
                    'failed': [],
                    'partial': False,
                    'error': str(e)
                }

        # 并发调用所有资源类型的 MCP 工具
        if concurrent:
            results = await self._fetch_concurrent(appid, resource_types)
        else:
            results = await self._fetch_sequential(appid, resource_types)

        # 统计结果
        duration = (datetime.now(timezone.utc) - start_time).total_seconds()

        successful = [k for k, v in results.items() if v is not None]
        failed = [k for k, v in results.items() if v is None]

        return {
            'success': len(failed) == 0,
            'resources': results,
            'failed': failed,
            'partial': len(failed) > 0 and len(successful) > 0,
            'stats': {
                'total': len(resource_types),
                'successful': len(successful),
                'failed': len(failed),
                'duration_seconds': duration
            }
        }

    async def _fetch_concurrent(
        self,
        appid: str,
        resource_types: List[str]
    ) -> Dict[str, Any]:
        """并发获取资源"""
        tasks = []
        for resource_type in resource_types:
            tool_name = f'get_{resource_type}_list'
            task = self._call_and_catch(tool_name, {'appid': appid})
            tasks.append((resource_type, task))

        # 等待所有任务完成（允许部分失败）
        results = {}
        for resource_type, task in tasks:
            try:
                result = await task
                results[resource_type] = result['data']
            except Exception as e:
                logger.warning(
                    "mcp_resource_fetch_failed",
                    resource_type=resource_type,
                    appid=appid,
                    error=str(e)
                )
                results[resource_type] = None

        return results

    async def _fetch_sequential(
        self,
        appid: str,
        resource_types: List[str]
    ) -> Dict[str, Any]:
        """顺序获取资源"""
        results = {}
        for resource_type in resource_types:
            tool_name = f'get_{resource_type}_list'
            try:
                result = await self.call_tool(tool_name, {'appid': appid})
                results[resource_type] = result['data']
            except Exception as e:
                logger.warning(
                    "mcp_resource_fetch_failed",
                    resource_type=resource_type,
                    appid=appid,
                    error=str(e)
                )
                results[resource_type] = None

        return results

    async def _call_and_catch(
        self,
        tool_name: str,
        params: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """调用工具并捕获异常（用于并发场景）"""
        try:
            return await self.call_tool(tool_name, params)
        except Exception:
            return None

    async def call_with_fallback(
        self,
        primary_tool: str,
        fallback_tool: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        带降级的调用（主工具失败时使用备用工具）

        这对于智能体长时间运行的可靠性很重要

        Args:
            primary_tool: 主工具名称
            fallback_tool: 备用工具名称
            params: 参数

        Returns:
            调用结果
        """
        try:
            logger.info(
                "mcp_call_primary",
                tool=primary_tool
            )
            return await self.call_tool(primary_tool, params)

        except Exception as e:
            logger.info(
                "mcp_primary_failed",
                tool=primary_tool,
                fallback=fallback_tool,
                error=str(e)
            )

            # 尝试备用工具
            return await self.call_tool(fallback_tool, params)

    def get_stats(self) -> Dict[str, Any]:
        """获取调用统计信息"""
        return self.stats.copy()

    def reset_stats(self):
        """重置统计信息"""
        self.stats = {
            'total_calls': 0,
            'successful_calls': 0,
            'failed_calls': 0,
            'retried_calls': 0,
            'timeout_calls': 0
        }


# ==================== 辅助函数 ====================

async def create_mcp_caller(
    max_concurrent: int = 5,
    max_retries: int = 3,
    default_timeout: int = 30
) -> MCPCaller:
    """
    创建 MCP 调用器（工厂函数）

    Args:
        max_concurrent: 最大并发数
        max_retries: 最大重试次数
        default_timeout: 默认超时时间

    Returns:
        MCPCaller 实例
    """
    return MCPCaller(
        max_concurrent=max_concurrent,
        max_retries=max_retries,
        default_timeout=default_timeout
    )
