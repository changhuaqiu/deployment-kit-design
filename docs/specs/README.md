# Deployment Kit 规格文档

本目录存放 Deployment Kit 项目的所有规格文档，包括开发规范、技能设计文档等。

---

## 📋 文档列表

### 开发规范

- **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)**
  - Deployment Kit 开发规范（基于 Superpowers）
  - 包含：技能开发规范、工作流程、测试规范、代码规范、文档规范
  - **所有技能开发必须参考此文档**

### 技能设计文档

设计文档位于 [../design/](../design/) 目录。

查看设计文档：[docs/design/README.md](../design/README.md)

---

## 📂 文档命名规范

### 开发规范文档

```
DEVELOPMENT_GUIDE.md              # 主开发规范文档
<PLUGIN_NAME>_GUIDE.md            # 插件特定规范（如果需要）
```

### 技能设计文档

```
YYYY-MM-DD-<skill-name>-design.md

示例：
2026-03-28-validate-syntax-design.md
2026-03-29-generate-xac-design.md
```

---

## 🔄 文档生命周期

```
1. 设计阶段 → YYYY-MM-DD-<skill-name>-design.md
   ├── 需求分析
   ├── 架构设计
   ├── 组件设计
   └── 实施计划

2. 实施阶段 → 按照设计文档实施
   ├── TDD 开发
   ├── 代码实现
   └── 测试验证

3. 完成阶段 → 设计文档存档
   └── 作为技能参考保留
```

---

## 📖 使用指南

### 开发新技能

1. **阅读开发规范**
   ```bash
   # 必读：了解开发规范
   cat docs/specs/DEVELOPMENT_GUIDE.md
   ```

2. **创建设计文档**
   ```bash
   # 在 docs/design/ 目录创建设计文档
   touch docs/design/YYYY-MM-DD-<skill-name>-design.md
   ```

3. **参考现有设计**
   ```bash
   # 查看类似技能的设计
   ls docs/design/
   ```

4. **按照规范实施**
   - 遵循 DEVELOPMENT_GUIDE.md 中的规范
   - 按照设计文档实施
   - TDD 开发流程

### 审查设计文档

设计文档审查清单：
- [ ] 需求明确，范围清晰
- [ ] 架构设计合理
- [ ] 组件职责清晰
- [ ] 错误处理完善
- [ ] 测试策略充分
- [ ] 无占位符（TBD/TODO）
- [ ] 无矛盾或歧义

---

## 🎯 规范优先级

所有技能开发必须遵循以下优先级：

1. **DEVELOPMENT_GUIDE.md**（最高优先级）
   - 定义所有技能必须遵循的标准
   - 任何疑问首先参考此文档

2. **技能设计文档**
   - 特定技能的详细设计
   - 必须符合 DEVELOPMENT_GUIDE.md 的规范

3. **Superpowers 原始规范**
   - https://github.com/obra/superpowers
   - 当开发规范未覆盖时参考

---

## 📊 维护指南

### 更新开发规范

当发现 DEVELOPMENT_GUIDE.md 需要更新时：
1. 讨论变更内容
2. 更新文档
3. 记录变更日志
4. 通知团队成员

### 添加新设计文档

创建新技能设计文档时：
1. 按照命名规范创建文件
2. 参考现有设计文档结构
3. 确保符合开发规范
4. 更新本 README 的文档列表

---

**最后更新**: 2026-03-28
**维护者**: Deployment Kit Team
