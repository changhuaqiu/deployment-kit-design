"""
CLI 集成测试 - validate-syntax

测试 dk validate-syntax 命令
"""

import os
import sys
import tempfile
import subprocess
import zipfile
from pathlib import Path


def create_test_xac_artifact(temp_dir):
    """创建测试用的 XaC 制品"""
    # 创建包含 YAML 文件的 ZIP
    zip_path = os.path.join(temp_dir, 'test-xac.zip')

    with zipfile.ZipFile(zip_path, 'w') as zf:
        # 有效的 YAML
        zf.writestr('main.yaml', 'application: test\nenvironment: dev\n')
        zf.writestr('config.yaml', 'database:\n  host: localhost\n  port: 5432\n')

        # 无效的 YAML
        zf.writestr('invalid.yaml', 'key: value\n  bad_indent: true\n')

    return zip_path


def create_test_xac_directory(temp_dir):
    """创建测试用的 XaC 目录"""
    xac_dir = os.path.join(temp_dir, 'xac')
    os.makedirs(xac_dir)

    # 创建有效的 YAML 文件
    with open(os.path.join(xac_dir, 'valid.yaml'), 'w') as f:
        f.write('key: value\nlist:\n  - item1\n  - item2\n')

    return xac_dir


def test_cli_with_zip():
    """测试 CLI 处理 ZIP 文件"""
    print("\n" + "="*60)
    print("测试 1: 校验 ZIP 文件")
    print("="*60)

    with tempfile.TemporaryDirectory() as temp_dir:
        # 创建测试 ZIP
        zip_path = create_test_xac_artifact(temp_dir)

        # 运行 CLI 命令
        result = subprocess.run(
            [sys.executable, '-m', 'cli.dk', 'validate-syntax', '--artifact', zip_path],
            cwd='c:/Users/qiufa/Desktop/deploy-suit/deploy-kit',
            capture_output=True,
            text=True
        )

        print(f"退出码: {result.returncode}")
        print(f"\n标准输出:\n{result.stdout}")
        if result.stderr:
            print(f"\n标准错误:\n{result.stderr}")


def test_cli_with_directory():
    """测试 CLI 处理目录"""
    print("\n" + "="*60)
    print("测试 2: 校验目录")
    print("="*60)

    with tempfile.TemporaryDirectory() as temp_dir:
        # 创建测试目录
        xac_dir = create_test_xac_directory(temp_dir)

        # 运行 CLI 命令
        result = subprocess.run(
            [sys.executable, '-m', 'cli.dk', 'validate-syntax', '--artifact', xac_dir],
            cwd='c:/Users/qiufa/Desktop/deploy-suit/deploy-kit',
            capture_output=True,
            text=True
        )

        print(f"退出码: {result.returncode}")
        print(f"\n标准输出:\n{result.stdout}")
        if result.stderr:
            print(f"\n标准错误:\nresult.stderr}")


def test_cli_help():
    """测试 CLI 帮助"""
    print("\n" + "="*60)
    print("测试 3: 查看帮助")
    print("="*60)

    result = subprocess.run(
        [sys.executable, '-m', 'cli.dk', 'validate-syntax', '--help'],
        cwd='c:/Users/qiufa/Desktop/deploy-suit/deploy-kit',
        capture_output=True,
        text=True
    )

    print(f"退出码: {result.returncode}")
    print(f"\n帮助信息:\n{result.stdout}")


def test_cli_verbose():
    """测试 CLI 详细输出"""
    print("\n" + "="*60)
    print("测试 4: 详细输出模式")
    print("="*60)

    with tempfile.TemporaryDirectory() as temp_dir:
        # 创建测试 ZIP
        zip_path = create_test_xac_artifact(temp_dir)

        # 运行 CLI 命令（带 --verbose）
        result = subprocess.run(
            [sys.executable, '-m', 'cli.dk', 'validate-syntax', '--artifact', zip_path, '--verbose'],
            cwd='c:/Users/qiufa/Desktop/deploy-suit/deploy-kit',
            capture_output=True,
            text=True
        )

        print(f"退出码: {result.returncode}")
        print(f"\n标准输出:\n{result.stdout}")


if __name__ == '__main__':
    print("\n" + "="*60)
    print("CLI 集成测试 - validate-syntax")
    print("="*60)

    # 运行测试
    test_cli_help()
    test_cli_with_zip()
    test_cli_with_directory()
    test_cli_verbose()

    print("\n" + "="*60)
    print("所有测试完成")
    print("="*60)
