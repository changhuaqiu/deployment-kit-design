"""
状态管理器 - 支持断点续传

核心特性：
1. 详细的状态记录（每个技能的执行状态）
2. 进度跟踪（支持百分比）
3. 断点续传（从失败点恢复）
4. 智能体友好的恢复接口
5. 错误记录和堆栈跟踪

遵循 harness-engineering 原则：
- 智能体运行6+小时必须可恢复
- 详细的状态日志
- 自动保存检查点
"""

import json
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
import structlog

logger = structlog.get_logger(__name__)


class StateManager:
    """
    增强的状态管理器

    特性：
    - 详细的状态记录
    - 断点续传支持
    - 进度跟踪
    - 智能体友好的恢复接口
    """

    def __init__(self, data_dir: Path):
        """
        初始化状态管理器

        Args:
            data_dir: 项目数据目录（.deployment-kit/）
        """
        self.data_dir = Path(data_dir)
        self.state_file = self.data_dir / 'state.json'

        # 确保目录存在
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def initialize(
        self,
        project_id: str,
        current_appid: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        初始化项目状态

        Args:
            project_id: 项目ID
            current_appid: 当前应用ID

        Returns:
            初始状态
        """
        state = {
            "project_id": project_id,
            "initialized_at": datetime.now(timezone.utc).isoformat(),
            "current_appid": current_appid,
            "last_operation": None,
            "version": "1.0.0",

            # 工作流状态
            "workflow_state": {
                "current_workflow": None,
                "workflow_id": None,
                "status": "initialized",
                "started_at": None,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "completed_skills": [],
                "pending_skills": [],
                "total_progress": 0.0
            },

            # 技能执行详情
            "skill_states": [],

            # 门控状态
            "gates": [],

            # 智能体上下文
            "agent_context": {
                "working_directory": str(self.data_dir.parent),
                "deployment_kit_version": "1.0.0",
                "can_resume": False,
                "last_checkpoint": None
            }
        }

        self.save(state)
        logger.info("state_initialized", project_id=project_id)
        return state

    def load(self) -> Dict[str, Any]:
        """
        加载状态

        Returns:
            当前状态，如果不存在返回初始状态
        """
        if not self.state_file.exists():
            logger.warning("state_file_not_found")
            return self.initialize(
                project_id=self.data_dir.parent.name
            )

        try:
            state = json.loads(
                self.state_file.read_text(encoding='utf-8')
            )
            logger.debug("state_loaded")
            return state

        except Exception as e:
            logger.error("state_load_failed", error=str(e))
            return self.initialize(
                project_id=self.data_dir.parent.name
            )

    def save(self, state: Dict[str, Any]) -> None:
        """保存状态"""
        state['updated_at'] = datetime.now(timezone.utc).isoformat()

        # 更新工作流状态的更新时间
        if 'workflow_state' in state:
            state['workflow_state']['updated_at'] = \
                datetime.now(timezone.utc).isoformat()

        self.state_file.write_text(
            json.dumps(state, indent=2, ensure_ascii=False),
            encoding='utf-8'
        )

        logger.debug("state_saved")

    def start_workflow(
        self,
        workflow_name: str,
        skills: List[str],
        appid: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        开始工作流

        Args:
            workflow_name: 工作流名称
            skills: 技能列表
            appid: 应用ID

        Returns:
            更新后的状态
        """
        state = self.load()

        # 生成工作流ID
        workflow_id = f"wf-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

        # 更新工作流状态
        state['workflow_state'].update({
            'current_workflow': workflow_name,
            'workflow_id': workflow_id,
            'status': 'running',
            'started_at': datetime.now(timezone.utc).isoformat(),
            'completed_skills': [],
            'pending_skills': skills.copy(),
            'total_skills': len(skills),
            'total_progress': 0.0
        })

        # 更新应用ID
        if appid:
            state['current_appid'] = appid

        # 清空之前的技能状态
        state['skill_states'] = []

        # 更新智能体上下文
        state['agent_context']['can_resume'] = True
        state['agent_context']['last_checkpoint'] = None

        self.save(state)

        logger.info(
            "workflow_started",
            workflow_id=workflow_id,
            workflow_name=workflow_name,
            total_skills=len(skills)
        )

        return state

    def start_skill(
        self,
        skill_name: str,
        context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        开始执行技能

        Args:
            skill_name: 技能名称
            context: 执行上下文

        Returns:
            更新后的状态
        """
        state = self.load()

        # 创建技能状态
        skill_state = {
            'skill': skill_name,
            'status': 'running',
            'started_at': datetime.now(timezone.utc).isoformat(),
            'completed_at': None,
            'duration_seconds': 0,
            'retry_count': 0,
            'context': context or {},
            'result': None,
            'error': None,
            'progress': {
                'percentage': 0,
                'message': 'Starting...'
            }
        }

        # 添加到技能状态列表
        state['skill_states'].append(skill_state)

        # 更新工作流状态
        workflow_state = state['workflow_state']
        if skill_name in workflow_state['pending_skills']:
            workflow_state['pending_skills'].remove(skill_name)

        self.save(state)

        logger.info("skill_started", skill=skill_name)
        return state

    def complete_skill(
        self,
        skill_name: str,
        result: Dict[str, Any],
        progress: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        完成技能执行

        Args:
            skill_name: 技能名称
            result: 执行结果
            progress: 进度信息

        Returns:
            更新后的状态
        """
        state = self.load()

        # 找到技能状态
        skill_state = self._find_skill_state(state, skill_name)
        if not skill_state:
            logger.warning("skill_state_not_found", skill=skill_name)
            return state

        # 更新技能状态
        now = datetime.now(timezone.utc)
        started_at = datetime.fromisoformat(skill_state['started_at'])
        duration = (now - started_at).total_seconds()

        skill_state.update({
            'status': 'completed',
            'completed_at': now.isoformat(),
            'duration_seconds': duration,
            'result': result
        })

        if progress:
            skill_state['progress'] = progress

        # 更新工作流状态
        workflow_state = state['workflow_state']
        if skill_name not in workflow_state['completed_skills']:
            workflow_state['completed_skills'].append(skill_name)

        # 计算总进度
        total_skills = workflow_state.get('total_skills', 0)
        if total_skills > 0:
            workflow_state['total_progress'] = \
                len(workflow_state['completed_skills']) / total_skills

        # 检查是否所有技能都完成
        if not workflow_state['pending_skills']:
            workflow_state['status'] = 'completed'
            workflow_state['completed_at'] = now.isoformat()
            state['agent_context']['can_resume'] = False

        # 更新检查点
        state['agent_context']['last_checkpoint'] = \
            f"{skill_name}:100%"

        self.save(state)

        logger.info(
            "skill_completed",
            skill=skill_name,
            duration_seconds=duration,
            total_progress=workflow_state['total_progress']
        )

        return state

    def fail_skill(
        self,
        skill_name: str,
        error: Exception,
        retryable: bool = True,
        progress: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        技能执行失败

        Args:
            skill_name: 技能名称
            error: 异常对象
            retryable: 是否可重试
            progress: 失败时的进度

        Returns:
            更新后的状态
        """
        state = self.load()

        # 找到技能状态
        skill_state = self._find_skill_state(state, skill_name)
        if not skill_state:
            logger.warning("skill_state_not_found", skill=skill_name)
            return state

        # 更新技能状态
        now = datetime.now(timezone.utc)
        started_at = datetime.fromisoformat(skill_state['started_at'])
        duration = (now - started_at).total_seconds()

        skill_state.update({
            'status': 'failed',
            'completed_at': now.isoformat(),
            'duration_seconds': duration,
            'error': {
                'type': type(error).__name__,
                'message': str(error),
                'stack_trace': traceback.format_exc(),
                'retryable': retryable,
                'occurred_at': now.isoformat()
            }
        })

        if progress:
            skill_state['progress'] = progress

        # 更新工作流状态
        workflow_state = state['workflow_state']
        workflow_state['status'] = 'failed'
        workflow_state['failed_skill'] = skill_name

        # 更新检查点
        state['agent_context']['last_checkpoint'] = \
            f"{skill_name}:{progress.get('percentage', 0) if progress else 0}%"

        self.save(state)

        logger.error(
            "skill_failed",
            skill=skill_name,
            error_type=type(error).__name__,
            error_message=str(error),
            retryable=retryable
        )

        return state

    def update_skill_progress(
        self,
        skill_name: str,
        percentage: float,
        message: str
    ) -> Dict[str, Any]:
        """
        更新技能执行进度

        Args:
            skill_name: 技能名称
            percentage: 进度百分比 (0-100)
            message: 进度消息

        Returns:
            更新后的状态
        """
        state = self.load()

        # 找到技能状态
        skill_state = self._find_skill_state(state, skill_name)
        if not skill_state:
            logger.warning("skill_state_not_found", skill=skill_name)
            return state

        # 更新进度
        skill_state['progress'] = {
            'percentage': percentage,
            'message': message,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }

        self.save(state)

        logger.debug(
            "skill_progress_updated",
            skill=skill_name,
            percentage=percentage,
            message=message
        )

        return state

    def retry_skill(
        self,
        skill_name: str
    ) -> Dict[str, Any]:
        """
        重试技能执行

        Args:
            skill_name: 技能名称

        Returns:
            更新后的状态
        """
        state = self.load()

        # 找到技能状态
        skill_state = self._find_skill_state(state, skill_name)
        if not skill_state:
            logger.warning("skill_state_not_found", skill=skill_name)
            return state

        # 增加重试计数
        skill_state['retry_count'] += 1

        # 重置状态为 running
        skill_state['status'] = 'running'
        skill_state['started_at'] = datetime.now(timezone.utc).isoformat()
        skill_state['error'] = None
        skill_state['progress'] = {
            'percentage': 0,
            'message': f'Retrying (attempt {skill_state["retry_count"]})...'
        }

        # 更新工作流状态
        state['workflow_state']['status'] = 'running'

        self.save(state)

        logger.info(
            "skill_retrying",
            skill=skill_name,
            retry_count=skill_state['retry_count']
        )

        return state

    def can_resume(self) -> bool:
        """
        判断是否可以恢复

        Returns:
            是否可以恢复
        """
        state = self.load()

        return (
            state.get('workflow_state', {}).get('status') in ['running', 'failed']
            and state.get('agent_context', {}).get('can_resume', False)
        )

    def get_resume_point(self) -> Optional[Dict[str, Any]]:
        """
        获取恢复点

        Returns:
            恢复点信息，如果无法恢复返回 None
        """
        if not self.can_resume():
            return None

        state = self.load()

        # 找到未完成或失败的技能
        for skill_state in state['skill_states']:
            if skill_state['status'] in ['running', 'failed']:
                return {
                    'skill': skill_state['skill'],
                    'status': skill_state['status'],
                    'progress': skill_state.get('progress', {}),
                    'retry_count': skill_state.get('retry_count', 0),
                    'error': skill_state.get('error'),
                    'context': skill_state.get('context', {})
                }

        return None

    def get_workflow_status(self) -> Dict[str, Any]:
        """
        获取工作流状态（CLI友好）

        Returns:
            工作流状态信息
        """
        state = self.load()

        workflow_state = state.get('workflow_state', {})

        return {
            'workflow_id': workflow_state.get('workflow_id'),
            'workflow_name': workflow_state.get('current_workflow'),
            'status': workflow_state.get('status'),
            'started_at': workflow_state.get('started_at'),
            'total_progress': workflow_state.get('total_progress', 0),
            'completed_skills': workflow_state.get('completed_skills', []),
            'pending_skills': workflow_state.get('pending_skills', []),
            'can_resume': self.can_resume()
        }

    def _find_skill_state(
        self,
        state: Dict[str, Any],
        skill_name: str
    ) -> Optional[Dict[str, Any]]:
        """查找技能状态"""
        for skill_state in state.get('skill_states', []):
            if skill_state['skill'] == skill_name:
                return skill_state
        return None
