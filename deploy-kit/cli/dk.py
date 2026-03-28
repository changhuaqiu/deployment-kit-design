"""
Deployment Kit CLI 工具

人类与系统交互的入口
"""

import argparse
import sys
from pathlib import Path
from typing import List, Optional
import structlog
import yaml
import importlib.util

# 配置日志
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger(__name__)


class DeploymentKitCLI:
    """Deployment Kit CLI 主类"""

    def __init__(self):
        self.project_dir = Path.cwd()
        self.data_dir = self.project_dir / '.deployment-kit'

        # 确定 deploy-kit 目录
        # 如果当前目录是 deploy-kit/，直接使用
        # 如果当前目录是项目根，查找 deploy-kit/
        if (self.project_dir / 'cli' / 'dk.py').exists():
            # 当前在 deploy-kit/ 目录
            self.deploy_kit_dir = self.project_dir
        elif (self.project_dir / 'deploy-kit' / 'cli' / 'dk.py').exists():
            # 当前在项目根目录
            self.deploy_kit_dir = self.project_dir / 'deploy-kit'
        else:
            # 尝试使用文件位置
            self.deploy_kit_dir = Path(__file__).parent.parent

    def run(self, args: Optional[List[str]] = None):
        """
        运行 CLI

        Args:
            args: 命令行参数（如果为 None，使用 sys.argv）
        """
        parser = self.create_parser()
        parsed_args = parser.parse_args(args)

        # 执行对应的命令
        try:
            exit_code = parsed_args.func(parsed_args)
            sys.exit(exit_code or 0)
        except Exception as e:
            logger.error("cli_error", error=str(e))
            print(f"\n❌ 错误: {e}")
            sys.exit(1)

    def create_parser(self) -> argparse.ArgumentParser:
        """创建参数解析器"""
        parser = argparse.ArgumentParser(
            prog='dk',
            description='Deployment Kit - 华为HIS XaC部署自动化套件',
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
示例:
  dk discover --appid <appid>           发现资源
  dk generate-xac --appid <appid>        生成XaC代码
  dk deploy --appid <appid> --env test   部署到测试环境
  dk workflow new-user --appid <appid>  执行工作流
  dk status                              查看状态

获取帮助:
  dk <command> --help                    查看命令帮助
  dk --help                              查看整体帮助

文档:
  AGENTS.md                              智能体指南
            """
        )

        # 全局选项
        parser.add_argument(
            '--version',
            action='version',
            version='%(prog)s 1.0.0'
        )
        parser.add_argument(
            '--verbose', '-v',
            action='store_true',
            help='详细输出'
        )
        parser.add_argument(
            '--debug',
            action='store_true',
            help='调试模式'
        )

        # 子命令
        subparsers = parser.add_subparsers(
            dest='command',
            title='可用命令',
            description='使用 "dk <command> --help" 查看命令帮助'
        )

        # 技能命令
        self._add_skill_commands(subparsers)

        # 技能管理命令
        self._add_skill_management_commands(subparsers)

        # 工作流命令
        self._add_workflow_commands(subparsers)

        # 管理命令
        self._add_management_commands(subparsers)

        # 状态命令
        self._add_status_commands(subparsers)

        return parser

    def _add_skill_commands(self, subparsers):
        """添加技能命令"""
        # validate-syntax 命令
        validate_parser = subparsers.add_parser(
            'validate-syntax',
            help='语法校验 - 验证 XaC 制品中的 YAML 文件语法',
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
示例:
  dk validate-syntax --artifact ./xac-package.zip    校验 ZIP 文件
  dk validate-syntax --artifact ./my-app/xac          校验目录
  dk validate-syntax --artifact http://example.com/xac.zip  校验远程 URL
  dk validate-syntax --artifact ./xac.zip --timeout 600  自定义超时

支持:
  - URL: 自动下载 ZIP 文件
  - ZIP 文件: 自动解压
  - 目录: 直接扫描
            """
        )
        validate_parser.add_argument(
            '--artifact',
            required=True,
            help='XaC 制品来源（URL/ZIP路径/目录路径）'
        )
        validate_parser.add_argument(
            '--timeout',
            type=int,
            default=300,
            help='下载超时时间（秒，默认：300）'
        )
        validate_parser.add_argument(
            '--verbose', '-v',
            action='store_true',
            help='详细输出'
        )
        validate_parser.set_defaults(func=self.cmd_validate_syntax)

        # hello-skill 示例命令
        hello_parser = subparsers.add_parser(
            'hello',
            help='示例技能 - 向世界问好'
        )
        hello_parser.add_argument('--name', default='World', help='要问好的名字')
        hello_parser.set_defaults(func=self.cmd_hello)

        # 更多技能命令可以在这里添加
        # ...

    def _add_skill_management_commands(self, subparsers):
        """添加技能管理命令"""
        # skill-create 命令
        create_parser = subparsers.add_parser(
            'skill-create',
            help='创建新技能'
        )
        create_parser.add_argument('name', help='技能名称（kebab-case，如：validate-syntax）')
        create_parser.add_argument('description', help='技能描述')
        create_parser.add_argument(
            '--category',
            choices=['builtin', 'custom'],
            default='builtin',
            help='技能类别（默认：builtin）'
        )
        create_parser.add_argument(
            '--author',
            default='Deployment Kit Team',
            help='作者'
        )
        create_parser.add_argument(
            '--capabilities',
            nargs='+',
            help='能力列表'
        )
        create_parser.add_argument(
            '--requires',
            action='append',
            help='前置条件（如：--requires appid）'
        )
        create_parser.set_defaults(func=self.cmd_skill_create)

    def _add_workflow_commands(self, subparsers):
        """添加工作流命令"""
        # workflow 命令
        workflow_parser = subparsers.add_parser(
            'workflow',
            help='工作流管理'
        )
        workflow_subparsers = workflow_parser.add_subparsers(
            dest='workflow_action',
            title='工作流操作'
        )

        # workflow list
        list_parser = workflow_subparsers.add_parser(
            'list',
            help='列出所有工作流'
        )
        list_parser.set_defaults(func=self.cmd_workflow_list)

        # workflow run
        run_parser = workflow_subparsers.add_parser(
            'run',
            help='运行工作流'
        )
        run_parser.add_argument('workflow_name', help='工作流名称')
        run_parser.add_argument('--appid', required=True, help='应用ID')
        run_parser.set_defaults(func=self.cmd_workflow_run)

        # workflow resume
        resume_parser = workflow_subparsers.add_parser(
            'resume',
            help='恢复工作流'
        )
        resume_parser.set_defaults(func=self.cmd_workflow_resume)

    def _add_management_commands(self, subparsers):
        """添加管理命令"""
        # cache 命令
        cache_parser = subparsers.add_parser(
            'cache',
            help='缓存管理'
        )
        cache_subparsers = cache_parser.add_subparsers(
            dest='cache_action',
            title='缓存操作'
        )

        # cache status
        status_parser = cache_subparsers.add_parser(
            'status',
            help='查看缓存状态'
        )
        status_parser.add_argument('--appid', help='应用ID')
        status_parser.set_defaults(func=self.cmd_cache_status)

        # cache clear
        clear_parser = cache_subparsers.add_parser(
            'clear',
            help='清除缓存'
        )
        clear_parser.add_argument('--appid', help='应用ID')
        clear_parser.set_defaults(func=self.cmd_cache_clear)

    def _add_status_commands(self, subparsers):
        """添加状态命令"""
        # status 命令
        status_parser = subparsers.add_parser(
            'status',
            help='查看项目状态'
        )
        status_parser.add_argument('--verbose', '-v', action='store_true', help='详细输出')
        status_parser.set_defaults(func=self.cmd_status)

    # ==================== 命令处理函数 ====================

    def cmd_skill_create(self, args):
        """处理 skill-create 命令"""
        import sys
        sys.path.insert(0, str(self.deploy_kit_dir / 'tools'))

        from skill_creator import SkillCreator

        skills_dir = self.deploy_kit_dir / 'skills'
        creator = SkillCreator(skills_dir)

        try:
            # 准备前置条件
            pre_conditions = None
            if args.requires:
                pre_conditions = {}
                for req in args.requires:
                    pre_conditions[f'requires_{req}'] = True

            # 创建技能
            skill_dir = creator.create_skill(
                name=args.name,
                description=args.description,
                category=args.category,
                author=args.author,
                pre_conditions=pre_conditions,
                capabilities=args.capabilities
            )

            print(f"\n✅ 技能 '{args.name}' 已创建！")
            print(f"\n📝 下一步：")
            print(f"   1. 编辑技能实现: {skill_dir / 'main.py'}")
            print(f"   2. 查看技能规范: {skill_dir / 'SKILL.md'}")
            print(f"   3. 测试技能: dk {args.name}")

            return 0

        except Exception as e:
            print(f"\n❌ 创建失败: {e}")
            import traceback
            traceback.print_exc()
            return 1

    def cmd_validate_syntax(self, args):
        """处理 validate-syntax 命令"""
        print(f"\n{'='*60}")
        print(f"YAML Syntax Validation")
        print(f"{'='*60}")
        print(f"Artifact: {args.artifact}")

        # 导入必要的模块
        import sys
        from pathlib import Path

        # 添加父目录到路径
        sys.path.insert(0, str(self.deploy_kit_dir))

        try:
            # 直接导入技能（使用 importlib 动态导入，因为模块名有连字符）
            import importlib.util

            # 设置包路径，以便相对导入工作
            skills_builtin_dir = self.deploy_kit_dir / 'skills' / 'builtin' / 'validate-syntax'
            scripts_dir = skills_builtin_dir / 'scripts'

            skill_module_path = scripts_dir / 'main.py'
            spec = importlib.util.spec_from_file_location("validate_syntax.scripts.main", skill_module_path)
            skill_module = importlib.util.module_from_spec(spec)

            # 设置模块的 __package__ 属性，使相对导入工作
            skill_module.__package__ = "skills.builtin.validate-syntax.scripts"
            skill_module.__path__ = [str(scripts_dir)]

            # 添加到 sys.modules，使相对导入可以找到其他模块
            sys.modules['skills.builtin.validate-syntax.scripts'] = skill_module

            spec.loader.exec_module(skill_module)

            Skill = skill_module.Skill

            # 加载技能元数据
            skill_metadata = self._load_skill_metadata('validate-syntax')

            # 创建技能实例
            skill = Skill(skill_metadata)

            # 准备上下文
            context = {
                'appid': 'cli',
                'params': {
                    'artifact_source': args.artifact,
                    'download_timeout': args.timeout
                }
            }

            # 执行技能
            result = skill.execute(context)

            # 显示结果
            self._display_validation_result(result, args.verbose)

            # 清理资源
            skill.cleanup()

            # 返回退出码
            if result['status'] == 'success':
                validation = result['data']['validation_result']
                return 0 if validation['valid'] else 1
            else:
                return 1

        except Exception as e:
            print(f"\n[ERROR] Validation failed: {e}")
            if args.debug:
                import traceback
                traceback.print_exc()
            return 1

    def _load_skill_metadata(self, skill_name: str) -> dict:
        """加载技能元数据"""
        import yaml

        skill_dir = self.deploy_kit_dir / 'skills' / 'builtin' / skill_name
        metadata_file = skill_dir / 'skill.yaml'

        if not metadata_file.exists():
            # 返回默认元数据
            return {
                'name': skill_name,
                'version': '1.0.0',
                'description': f'{skill_name} skill'
            }

        with open(metadata_file, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)

    def _display_validation_result(self, result: dict, verbose: bool = False):
        """显示校验结果"""
        print(f"\n{'='*60}")

        if result['status'] != 'success':
            print(f"[FAILED] {result['message']}")
            return

        validation = result['data']['validation_result']
        artifact_info = result['data']['artifact_info']

        # 显示基本信息
        print(f"[OK] Validation complete")
        print(f"\nArtifact Info:")
        print(f"  Source Type: {artifact_info['source_type']}")
        print(f"  Processed Path: {artifact_info['processed_path']}")
        print(f"  Found Files: {len(artifact_info['yaml_files_found'])}")

        # 显示校验结果
        print(f"\nValidation Result:")
        print(f"  Total Files: {validation['total_files']}")
        print(f"  Valid Files: {validation['valid_files']}")
        print(f"  Invalid Files: {validation['invalid_files']}")

        if validation['valid']:
            print(f"\n[OK] All files are valid!")
        else:
            print(f"\n[ERROR] Found {validation['invalid_files']} file(s) with errors")
            print(f"\nError Details:")
            for i, error in enumerate(validation['errors'], 1):
                line_info = f":{error['line']}" if 'line' in error else ""
                print(f"  {i}. [X] {error['file']}{line_info}")
                print(f"     {error['error']}")

                if not verbose and i >= 10:
                    remaining = len(validation['errors']) - 10
                    if remaining > 0:
                        print(f"\n  ... and {remaining} more error(s) (use --verbose to see all)")
                    break

        print(f"{'='*60}\n")

    def cmd_hello(self, args):
        """处理 hello 命令"""
        print(f"Hello, {args.name}!")
        return 0

    def cmd_workflow_list(self, args):
        """处理 workflow list 命令"""
        print("\n可用工作流:")
        print("  - new-user-import: 新用户首次XaC化")
        print("  - update-resources: 更新资源")
        print("  - quick-deploy: 快速部署")
        return 0

    def cmd_workflow_run(self, args):
        """处理 workflow run 命令"""
        print(f"\n执行工作流: {args.workflow_name}")
        print(f"应用ID: {args.appid}")

        # TODO: 实际实现需要调用编排器
        # 这里只是示例
        print("\n工作流执行完成（示例）")
        return 0

    def cmd_workflow_resume(self, args):
        """处理 workflow resume 命令"""
        print("\n恢复工作流...")

        # TODO: 实际实现需要调用编排器
        print("工作流已恢复（示例）")
        return 0

    def cmd_cache_status(self, args):
        """处理 cache status 命令"""
        if args.appid:
            print(f"\n缓存状态: {args.appid}")
            # TODO: 实际实现需要调用 CacheManager
            print("  状态: 存在（示例）")
        else:
            print("\n所有缓存:")
            # TODO: 列出所有缓存
            print("  （示例）")
        return 0

    def cmd_cache_clear(self, args):
        """处理 cache clear 命令"""
        if args.appid:
            print(f"\n清除缓存: {args.appid}")
            # TODO: 实际实现需要清除特定缓存
        else:
            print("\n清除所有缓存")
            # TODO: 实际实现需要清除所有缓存
        print("缓存已清除（示例）")
        return 0

    def cmd_status(self, args):
        """处理 status 命令"""
        print("\n项目状态:")
        print(f"  项目目录: {self.project_dir}")
        print(f"  数据目录: {self.data_dir}")

        # 检查数据目录是否存在
        if not self.data_dir.exists():
            print("  状态: 未初始化")
            print("\n建议运行: dk init")
            return 1

        print("  状态: 已初始化")

        if args.verbose:
            print("\n详细信息:")
            # TODO: 显示详细状态
            print("  （详细状态示例）")

        return 0


def main():
    """主函数"""
    cli = DeploymentKitCLI()
    cli.run()


if __name__ == '__main__':
    main()
