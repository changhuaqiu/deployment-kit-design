# 安装依赖和测试 CLI 指南

**日期**: 2026-03-28
**目标**: 安装 Deployment Kit 所需依赖并测试 validate-syntax CLI

---

## 📦 第一步：安装依赖

### 方法 1：使用 pip（推荐）

```bash
# 进入 deploy-kit 目录
cd c:/Users/qiufa/Desktop/deploy-suit/deploy-kit

# 安装所有依赖
pip install -r requirements.txt
```

### 方法 2：手动安装

```bash
# 单独安装每个依赖
pip install pyyaml>=6.0
pip install requests>=2.31.0
pip install structlog>=24.1.0
```

### 方法 3：使用虚拟环境（最佳实践）

```bash
# 1. 创建虚拟环境
cd c:/Users/qiufa/Desktop/deploy-suit/deploy-kit
python -m venv venv

# 2. 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 3. 安装依赖
pip install -r requirements.txt
```

---

## 🧪 第二步：测试 CLI

### 测试 1：查看帮助

```bash
# 确保在 deploy-kit 目录
cd c:/Users/qiufa/Desktop/deploy-suit/deploy-kit

# 查看帮助
python -m cli.dk validate-syntax --help
```

**预期输出**：
```
usage: dk validate-syntax [-h] --artifact ARTIFACT [--timeout TIMEOUT] [--verbose]

options:
  -h, --help           show this help message and exit
  --artifact ARTIFACT  XaC 制品来源（URL/ZIP路径/目录路径）
  --timeout TIMEOUT    下载超时时间（秒，默认：300）
  --verbose, -v        详细输出
```

### 测试 2：校验目录

```bash
# 创建测试数据
mkdir -p ../test-xac
echo "key: value" > ../test-xac/valid.yaml
echo "list:" > ../test-xac/config.yaml
echo "  - item1" >> ../test-xac/config.yaml
echo "  - item2" >> ../test-xac/config.yaml

# 运行 CLI
python -m cli.dk validate-syntax --artifact ../test-xac
```

**预期输出**：
```
============================================================
YAML Syntax Validation
============================================================
Artifact: ../test-xac

============================================================
[OK] Validation complete

Artifact Info:
  Source Type: directory
  Processed Path: ../test-xac
  Found Files: 2

Validation Result:
  Total Files: 2
  Valid Files: 2
  Invalid Files: 0

[OK] All files are valid!
============================================================
```

### 测试 3：校验 ZIP 文件

```bash
# 创建测试 ZIP
cd ..
zip -r test-xac.zip test-xac/

# 回到 deploy-kit 目录
cd deploy-kit

# 校验 ZIP
python -m cli.dk validate-syntax --artifact ../test-xac.zip
```

### 测试 4：校验包含错误的 YAML

```bash
# 创建包含错误的 YAML
echo "key: value" > ../test-xac/invalid.yaml
echo "  bad_indent: true" >> ../test-xac/invalid.yaml

# 再次校验
python -m cli.dk validate-syntax --artifact ../test-xac
```

**预期输出**：
```
============================================================
[ERROR] Found 1 file(s) with errors

Error Details:
  1. [X] invalid.yaml:2
     syntax error: could not find expected ':'
============================================================
```

---

## 🔍 故障排除

### 问题 1：ModuleNotFoundError

**错误信息**：
```
ModuleNotFoundError: No module named 'yaml'
```

**解决方法**：
```bash
pip install pyyaml
```

### 问题 2：路径错误

**错误信息**：
```
FileNotFoundError: [Errno 2] No such file or directory
```

**解决方法**：
```bash
# 确保在正确的目录
cd c:/Users/qiufa/Desktop/deploy-suit/deploy-kit

# 使用绝对路径
python -m cli.dk validate-syntax --artifact "c:/Users/qiufa/Desktop/deploy-suit/test-xac"
```

### 问题 3：相对导入错误

**错误信息**：
```
ImportError: attempted relative import with no known parent package
```

**解决方法**：
这个问题已在 CLI 中修复，如果仍然出现，请确保使用最新的代码。

---

## ✅ 验证清单

完成以下检查，确保一切正常：

- [ ] 依赖安装成功（`pip list | grep pyyaml`）
- [ ] CLI 帮助正常显示
- [ ] 可以校验目录
- [ ] 可以校验 ZIP 文件
- [ ] 错误正确显示
- [ ] 退出码正确（0 表示成功，1 表示失败）

---

## 📊 测试结果示例

### 成功的测试运行

```bash
$ python -m cli.dk validate-syntax --artifact ../test-xac

============================================================
YAML Syntax Validation
============================================================
Artifact: ../test-xac

============================================================
[OK] Validation complete

Artifact Info:
  Source Type: directory
  Processed Path: ../test-xac
  Found Files: 2

Validation Result:
  Total Files: 2
  Valid Files: 2
  Invalid Files: 0

[OK] All files are valid!
============================================================

$ echo $?
0
```

### 失败的测试运行

```bash
$ python -m cli.dk validate-syntax --artifact ../test-xac

============================================================
[ERROR] Found 1 file(s) with errors

Error Details:
  1. [X] invalid.yaml:2
     syntax error: could not find expected ':'
============================================================

$ echo $?
1
```

---

## 🎯 下一步

安装和测试完成后，你可以：

1. **使用 CLI 进行日常开发**
   ```bash
   dk validate-syntax --artifact ./xac-package.zip
   ```

2. **集成到 CI/CD**
   ```yaml
   # .github/workflows/validate.yml
   - name: Validate XaC
     run: dk validate-syntax --artifact ./xac
   ```

3. **开发更多技能**
   - 参考 validate-syntax 作为模板
   - 遵循相同的开发规范

---

**需要帮助？**
- 查看 [AGENTS.md](../deploy-kit/AGENTS.md)
- 查看 [开发规范](./specs/DEVELOPMENT_GUIDE.md)
