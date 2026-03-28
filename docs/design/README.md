# Deployment Kit 技能设计文档

本目录存放 Deployment Kit 技能的详细设计文档。

---

## 📋 设计文档列表

### 已完成的技能设计

- **[2026-03-28-validate-syntax-design.md](./2026-03-28-validate-syntax-design.md)**
  - validate-syntax 技能设计文档
  - 功能：校验 XaC 制品中的 YAML 文件语法
  - 状态：设计完成，待实施
  - 日期：2026-03-28

---

## 📂 文档命名规范

```
YYYY-MM-DD-<skill-name>-design.md

示例：
2026-03-28-validate-syntax-design.md
2026-03-29-generate-xac-design.md
2026-03-30-discover-resources-design.md
```

**命名规则**：
- 日期：创建日期（YYYY-MM-DD）
- 技能名称：小写，连字符分隔
- 后缀：`-design.md`

---

## 🔄 设计文档生命周期

```
1. 设计阶段（当前目录）
   ├── 需求分析
   ├── 架构设计
   ├── 组件设计
   └── 实施计划

2. 实施阶段（deploy-kit/skills/）
   ├── TDD 开发
   ├── 代码实现
   └── 测试验证

3. 完成阶段
   └── 设计文档保留在此作为参考
```

---

## 📖 设计文档模板

每个设计文档应包含以下章节：

### 必需章节

1. **Overview** - 技能概述
2. **Success Criteria** - 成功标准清单
3. **Architecture** - 架构设计
   - 技能目录结构
   - 执行流程
   - 数据流
4. **Components** - 组件设计
   - 每个类的职责和接口
5. **Error Handling** - 错误处理策略
6. **Testing Strategy** - 测试策略
7. **Implementation Steps** - 实施步骤

### 可选章节

8. **Performance Considerations** - 性能考虑
9. **Security Considerations** - 安全考虑
10. **Documentation** - 文档设计（SKILL.md 草稿）
11. **Notes** - 设计决策记录

---

## 🎯 设计原则

所有技能设计必须遵循：

1. **遵循开发规范**
   - 参考 [../specs/DEVELOPMENT_GUIDE.md](../specs/DEVELOPMENT_GUIDE.md)
   - 技能目录结构：scripts/ 存放代码
   - SKILL.md 作为入口文档

2. **技能独立性**
   - 单一职责
   - 可独立测试
   - 可独立部署

3. **插件化设计**
   - 继承 SkillBase
   - 实现 execute() 方法
   - 不修改核心代码

4. **TDD 开发**
   - 测试先行
   - RED-GREEN-REFACTOR
   - 充分测试覆盖

---

## 📊 设计文档状态

每个设计文档有以下状态：

- **Draft** - 草稿，正在讨论中
- **Approved** - 已批准，准备实施
- **In Progress** - 正在实施中
- **Completed** - 已完成实施
- **On Hold** - 暂停

---

## 🔗 相关文档

- **开发规范**：[../specs/DEVELOPMENT_GUIDE.md](../specs/DEVELOPMENT_GUIDE.md)
- **规范文档索引**：[../specs/README.md](../specs/README.md)
- **主设计文档**：[../../deployment-kit-design/](../../deployment-kit-design/)

---

**最后更新**: 2026-03-28
**维护者**: Deployment Kit Team
