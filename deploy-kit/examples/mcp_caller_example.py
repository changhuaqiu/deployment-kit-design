"""
MCP 调用器使用示例

演示如何使用可靠的 MCP 调用器
"""

import sys
import asyncio
from pathlib import Path

# 添加父目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.mcp_caller import MCPCaller, create_mcp_caller
from core.exceptions import MCPTimeoutError, MCPConnectionError


async def example_basic_call():
    """示例1：基本调用"""
    print("\n" + "=" * 70)
    print("示例 1: 基本 MCP 调用")
    print("=" * 70)

    caller = MCPCaller(max_concurrent=5, max_retries=3)

    try:
        result = await caller.call_tool(
            'get_resource_stats',
            {'appid': 'my-app'}
        )

        print("\n✓ 调用成功")
        print(f"  工具: {result['tool']}")
        print(f"  数据: {result['data']}")
        print(f"  尝试次数: {result['attempts']}")
        print(f"  耗时: {result['duration_seconds']:.2f} 秒")

    except Exception as e:
        print(f"\n✗ 调用失败: {e}")


async def example_concurrent_calls():
    """示例2：并发调用"""
    print("\n" + "=" * 70)
    print("示例 2: 并发获取所有资源")
    print("=" * 70)

    caller = MCPCaller(max_concurrent=5, max_retries=3)

    result = await caller.fetch_all_resources(
        appid='my-app',
        resource_types=None,  # 自动获取
        concurrent=True
    )

    print(f"\n获取结果: {'成功' if result['success'] else '部分失败'}")
    print(f"  总资源类型: {result['stats']['total']}")
    print(f"  成功: {result['stats']['successful']}")
    print(f"  失败: {result['stats']['failed']}")
    print(f"  耗时: {result['stats']['duration_seconds']:.2f} 秒")

    if result['partial']:
        print(f"\n⚠️  部分资源获取失败: {', '.join(result['failed'])}")

    print("\n获取的资源:")
    for resource_type, data in result['resources'].items():
        if data is not None:
            print(f"  ✓ {resource_type}: {len(data.get('resources', []))} 个资源")
        else:
            print(f"  ✗ {resource_type}: 获取失败")


async def example_with_retry():
    """示例3：重试机制"""
    print("\n" + "=" * 70)
    print("示例 3: 自动重试（模拟失败）")
    print("=" * 70)

    caller = MCPCaller(max_retries=3)

    # 这个示例需要实际的 MCP 客户端才能演示重试
    # 这里只展示接口
    print("\n重试配置:")
    print(f"  最大重试次数: {caller.max_retries}")
    print(f"  退避策略: 指数退避 (1s, 2s, 4s, ...)")

    print("\n实际场景:")
    print("  - 超时错误: 自动重试")
    print("  - 连接错误: 自动重试")
    print("  - 5xx 错误: 自动重试")
    print("  - 4xx 错误: 不重试（致命错误）")


async def example_with_fallback():
    """示例4：降级策略"""
    print("\n" + "=" * 70)
    print("示例 4: 带降级的调用")
    print("=" * 70)

    caller = MCPCaller()

    print("\n降级策略:")
    print("  主工具失败时，自动使用备用工具")
    print("  示例: get_resources_v2 → get_resources_v1")

    # 实际使用示例（需要真实MCP客户端）
    # result = await caller.call_with_fallback(
    #     'get_resources_v2',
    #     'get_resources_v1',
    #     {'appid': 'my-app'}
    # )


async def example_statistics():
    """示例5：统计信息"""
    print("\n" + "=" * 70)
    print("示例 5: 调用统计")
    print("=" * 70)

    caller = MCPCaller()

    # 执行一些调用
    await caller.call_tool('get_resource_stats', {'appid': 'my-app'})
    await caller.fetch_all_resources('my-app')

    # 获取统计信息
    stats = caller.get_stats()

    print("\n调用统计:")
    print(f"  总调用次数: {stats['total_calls']}")
    print(f"  成功次数: {stats['successful_calls']}")
    print(f"  失败次数: {stats['failed_calls']}")
    print(f"  重试次数: {stats['retried_calls']}")
    print(f"  超时次数: {stats['timeout_calls']}")

    # 计算成功率
    if stats['total_calls'] > 0:
        success_rate = (stats['successful_calls'] / stats['total_calls']) * 100
        print(f"  成功率: {success_rate:.1f}%")


async def example_performance_comparison():
    """示例6：性能对比（并发 vs 顺序）"""
    print("\n" + "=" * 70)
    print("示例 6: 性能对比（并发 vs 顺序）")
    print("=" * 70)

    caller = MCPCaller()

    # 顺序调用
    print("\n顺序调用:")
    result_sequential = await caller.fetch_all_resources(
        appid='my-app',
        resource_types=['ads', 'config', 'vpc'],
        concurrent=False
    )
    print(f"  耗时: {result_sequential['stats']['duration_seconds']:.2f} 秒")

    # 并发调用
    print("\n并发调用:")
    caller.reset_stats()  # 重置统计
    result_concurrent = await caller.fetch_all_resources(
        appid='my-app',
        resource_types=['ads', 'config', 'vpc'],
        concurrent=True
    )
    print(f"  耗时: {result_concurrent['stats']['duration_seconds']:.2f} 秒")

    # 性能提升
    speedup = result_sequential['stats']['duration_seconds'] / \
              result_concurrent['stats']['duration_seconds']
    print(f"\n性能提升: {speedup:.1f}x")


async def main():
    """运行所有示例"""
    print("\n" + "=" * 70)
    print("Deployment Kit - MCP 调用器示例")
    print("=" * 70)

    try:
        await example_basic_call()
        await example_concurrent_calls()
        await example_with_retry()
        await example_with_fallback()
        await example_statistics()
        await example_performance_comparison()

        print("\n" + "=" * 70)
        print("所有示例运行完成！")
        print("=" * 70)

    except Exception as e:
        print(f"\n✗ 示例运行失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    asyncio.run(main())
