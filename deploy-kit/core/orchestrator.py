"""
编排器 - 协调技能执行的核心引擎

核心特性：
1. 技能执行编排
2. 工作流管理
3. 数据流管理
4. 错误处理和恢复
5. 上下文管理

遵循 harness-engineering 原则：
- 编排器只依赖 SkillBase 接口
- 技能自我声明能力
- 统一数据流
- 详细状态记录
"""

from typing import Dict, Any, List, Optional, Callable
from pathlib import Path
from datetime import datetime, timezone
import structlog

from core.skill_base import SkillBase
from core.skill_loader import SkillLoader
from core.cache_manager import CacheManager
from core.state_manager import StateManager
from core.exceptions import (
    SkillError,
    SkillPreConditionError,
    SkillExecutionError,
    DeploymentKitError
)

logger = structlog.get_logger(__name__)


class Orchestrator:
    """
    编排器（核心骨架）

    职责：
    - 管理技能执行
    - 协调工作流
    - 管理数据流
    - 处理错误
    - 管理状态

    遵循开闭原则：
    - 对扩展开放：新增技能无需修改编排器
    - 对修改封闭：核心逻辑稳定
    """

    def __init__(
        self,
        project_dir: Path,
        skills_dir: Path
    ):
        """
        初始化编排器

        Args:
            project_dir: 项目目录
            skills_dir: 技能目录
        """
        self.project_dir = Path(project_dir)
        self.data_dir = self.project_dir / '.deployment-kit'
        self.skills_dir = Path(skills_dir)

        # 初始化组件
        self.skill_loader = SkillLoader({
            'builtin': self.skills_dir / 'builtin',
            'custom': self.skills_dir / 'custom'
        })
        self.cache_manager = CacheManager(self.data_dir)
        self.state_manager = StateManager(self.data_dir)

        # 加载所有技能
        self.skills = self.skill_loader.load_all_skills()

        logger.info(
            "orchestrator_initialized",
            project_dir=str(self.project_dir),
            skills_count=len(self.skills)
        )

    def execute_skill(
        self,
        skill_name: str,
        context: Dict[str, Any],
        options: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        执行单个技能

        Args:
            skill_name: 技能名称
            context: 执行上下文
            options: 执行选项
                {
                    'validate_pre_conditions': bool,  # 是否验证前置条件
                    'validate_inputs': bool,          # 是否验证输入
                    'on_error': str                   # 错误处理策略
                }

        Returns:
            技能执行结果

        Raises:
            SkillPreConditionError: 前置条件不满足
            SkillExecutionError: 技能执行失败
        """
        options = options or {
            'validate_pre_conditions': True,
            'validate_inputs': True,
            'on_error': 'raise'
        }

        # 检查技能是否存在
        if skill_name not in self.skills:
            raise SkillError(f"技能不存在: {skill_name}")

        skill = self.skills[skill_name]

        logger.info(
            "skill_execution_starting",
            skill=skill_name,
            context_keys=list(context.keys())
        )

        # 1. 验证前置条件
        if options['validate_pre_conditions']:
            try:
                skill.validate_pre_conditions(context)
            except SkillPreConditionError as e:
                logger.error(
                    "pre_condition_failed",
                    skill=skill_name,
                    error=str(e)
                )
                raise

        # 2. 验证输入参数
        if options['validate_inputs']:
            try:
                skill.validate_inputs(context)
            except ValueError as e:
                logger.error(
                    "input_validation_failed",
                    skill=skill_name,
                    error=str(e)
                )
                raise SkillExecutionError(skill_name, str(e))

        # 3. 更新状态：开始执行
        self.state_manager.start_skill(skill_name, context)

        # 4. 执行前钩子
        skill.before_execute(context)

        # 5. 执行技能
        try:
            result = skill.execute(context)

            # 验证结果格式
            if not isinstance(result, dict):
                raise SkillExecutionError(
                    skill_name,
                    f"技能返回结果格式错误: 期望 dict, 实际 {type(result).__name__}"
                )

            if 'status' not in result:
                raise SkillExecutionError(
                    skill_name,
                    "技能返回结果缺少 status 字段"
                )

            # 执行成功
            progress = result.get('progress', {'percentage': 100})
            self.state_manager.complete_skill(skill_name, result, progress)

            # 执行后钩子
            skill.after_execute(context, result)

            logger.info(
                "skill_execution_succeeded",
                skill=skill_name,
                status=result['status']
            )

            return result

        except Exception as e:
            # 技能执行失败
            is_retryable = self._is_error_retryable(e)
            progress = skill.get_progress() or {'percentage': 0}

            self.state_manager.fail_skill(
                skill_name,
                e,
                retryable=is_retryable,
                progress=progress
            )

            # 错误钩子
            skill.on_error(context, e)

            # 根据错误处理策略决定是否抛出异常
            if options['on_error'] == 'raise':
                raise
            else:
                return {
                    'status': 'failed',
                    'error': str(e),
                    'retryable': is_retryable
                }

    def execute_workflow(
        self,
        workflow_name: str,
        skills: List[str],
        context: Dict[str, Any],
        options: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        执行工作流

        Args:
            workflow_name: 工作流名称
            skills: 技能列表
            context: 执行上下文
            options: 执行选项
                {
                    'stop_on_error': bool,        # 遇到错误是否停止
                    'continue_on_error': bool,   # 遇到错误是否继续
                }

        Returns:
            工作流执行结果
        """
        options = options or {
            'stop_on_error': True,
            'continue_on_error': False
        }

        logger.info(
            "workflow_execution_starting",
            workflow_name=workflow_name,
            skills_count=len(skills)
        )

        # 开始工作流
        appid = context.get('appid')
        self.state_manager.start_workflow(workflow_name, skills, appid)

        results = []
        failed_skills = []

        # 执行每个技能
        for i, skill_name in enumerate(skills, 1):
            logger.info(
                "workflow_step_starting",
                workflow=workflow_name,
                step=i,
                total_steps=len(skills),
                skill=skill_name
            )

            try:
                # 更新上下文（传递之前技能的结果）
                execution_context = self._prepare_context(
                    skill_name,
                    context,
                    results
                )

                # 执行技能
                result = self.execute_skill(
                    skill_name,
                    execution_context
                )

                results.append({
                    'skill': skill_name,
                    'status': 'success',
                    'result': result
                })

                # 检查是否需要停止
                if result.get('status') == 'failed':
                    if options['stop_on_error']:
                        logger.error(
                            "workflow_failed",
                            workflow=workflow_name,
                            failed_skill=skill_name
                        )
                        break
                    elif not options['continue_on_error']:
                        raise SkillExecutionError(
                            skill_name,
                            result.get('error', 'Unknown error')
                        )

            except Exception as e:
                error_msg = str(e)
                logger.error(
                    "workflow_step_failed",
                    workflow=workflow_name,
                    skill=skill_name,
                    error=error_msg
                )

                failed_skills.append({
                    'skill': skill_name,
                    'error': error_msg
                })

                if options['stop_on_error']:
                    break

        # 工作流完成
        workflow_result = {
            'workflow_name': workflow_name,
            'status': 'completed' if not failed_skills else 'failed',
            'total_skills': len(skills),
            'completed_skills': len(results),
            'failed_skills': failed_skills,
            'results': results
        }

        logger.info(
            "workflow_execution_completed",
            workflow=workflow_name,
            status=workflow_result['status'],
            completed=workflow_result['completed_skills'],
            failed=len(failed_skills)
        )

        return workflow_result

    def _prepare_context(
        self,
        skill_name: str,
        base_context: Dict[str, Any],
        previous_results: List[Dict]
    ) -> Dict[str, Any]:
        """
        准备技能执行上下文

        合并基础上下文和之前技能的结果
        """
        context = base_context.copy()

        # 添加之前技能的结果
        context['previous_results'] = previous_results

        # 添加缓存目录
        appid = base_context.get('appid')
        if appid:
            cache_dir = self.data_dir / 'cache' / appid
            context['cache_dir'] = str(cache_dir)
            context['cache_exists'] = cache_dir.exists()

        # 添加依赖关系
        deps_file = self.data_dir / 'dependencies.json'
        if deps_file.exists():
            import json
            context['dependencies'] = json.loads(
                deps_file.read_text(encoding='utf-8')
            )

        # 添加状态
        context['state'] = self.state_manager.load()

        return context

    def _is_error_retryable(self, error: Exception) -> bool:
        """判断错误是否可重试"""
        error_type = type(error).__name__
        error_message = str(error).lower()

        # 可重试的错误类型
        retryable_errors = [
            'MCPTimeoutError',
            'MCPConnectionError',
            'CacheExpiredError'
        ]

        if error_type in retryable_errors:
            return True

        # 包含特定关键字的错误
        retryable_keywords = ['timeout', 'connection', 'temporary']
        if any(keyword in error_message for keyword in retryable_keywords):
            return True

        return False

    def get_status(self) -> Dict[str, Any]:
        """
        获取编排器状态

        Returns:
            状态信息
        """
        workflow_status = self.state_manager.get_workflow_status()

        return {
            'project_dir': str(self.project_dir),
            'skills_count': len(self.skills),
            'skills_list': list(self.skills.keys()),
            'workflow': workflow_status,
            'can_resume': self.state_manager.can_resume()
        }

    def resume_workflow(self) -> Dict[str, Any]:
        """
        从断点恢复工作流

        Returns:
            恢复后的执行结果
        """
        if not self.state_manager.can_resume():
            raise DeploymentKitError("无法恢复：没有可恢复的工作流")

        resume_point = self.state_manager.get_resume_point()

        logger.info(
            "workflow_resuming",
            skill=resume_point['skill'],
            status=resume_point['status']
        )

        # 重新执行失败的技能
        skill_name = resume_point['skill']
        context = resume_point['context']

        # 重试技能
        self.state_manager.retry_skill(skill_name)

        # 执行技能
        result = self.execute_skill(
            skill_name,
            context,
            options={'on_error': 'raise'}
        )

        return result

    def reload_skills(self) -> None:
        """重新加载所有技能"""
        self.skill_loader.invalidate_cache()
        self.skills = self.skill_loader.load_all_skills()

        logger.info(
            "skills_reloaded",
            count=len(self.skills)
        )
