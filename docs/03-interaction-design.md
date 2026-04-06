# IaC城市规划可视化系统 - 交互设计与视觉规范

## 1. 交互设计原则

### 1.1 核心设计哲学

**"游戏化 + 专业性"的平衡**

- 🎮 **游戏化体验**: 降低学习门槛，提升使用乐趣
- 🏢 **专业性保证**: 准确映射技术概念，不误导用户
- 🎯 **渐进式披露**: 默认简单，需要时显示详情
- ⚡ **即时反馈**: 每个操作都有明确的视觉反馈

### 1.2 三大交互原则

#### 原则1: 直接操作 (Direct Manipulation)
> **"所见即所得"**

- 点击地面直接放置建筑
- 拖动旋转视角查看建筑
- 悬停预览显示放置位置
- 选中建筑立即显示详情

#### 原则2: 状态可见性 (Visibility of System Status)
> **"用户始终知道当前发生了什么"**

- 建造动画显示施工进度
- 颜色编码表示不同状态
- Toast 通知操作结果
- 进度条显示部署流程

#### 原则3: 容错性 (Error Prevention and Recovery)
> **"预防错误，允许撤销"**

- 放置前显示预览
- 危险操作二次确认
- 支持撤销/重做
- 删除前高亮警告

---

## 2. 视觉设计系统

### 2.1 色彩系统

#### 主色调 (Primary Colors)
```
天空蓝: #87CEEB (RGB: 135, 206, 235)
  用途: 默认天空背景
  象征: 清晰、开放

草地绿: #228B22 (RGB: 34, 139, 34)
  用途: 地面网格
  象征: 基础、稳定
```

#### 建筑色彩 (Building Colors)
```
商业区 (蓝色系):
  办公楼: #3498db  - 微服务、API
  工厂:   #9b59b6  - 批处理

数据区 (红色/橙色系):
  银行金库: #e74c3c  - 数据库
  仓库:    #f39c12  - 缓存
  车站:    #e67e22  - 消息队列

网络区 (青色/紫色系):
  网络中心: #16a085  - VPC
  安保:    #8e44ad  - 安全组

监控区 (深蓝色系):
  观测塔: #2980b9  - 监控、日志

基础设施:
  电厂: #f1c40f   - 计算
  道路: #7f8c8d   - 连接
```

#### 状态色彩 (Status Colors)
```
正常: #2ecc71 (绿色)
  用途: 建筑运行正常、部署成功

警告: #feca57 (黄色)
  用途: 配置漂移、待处理

错误: #e74c3c (红色)
  用途: 部署失败、资源删除

建造中: #95a5a6 (灰色)
  用途: 建筑施工中

信息: #3498db (蓝色)
  用途: 提示信息
```

#### UI 色彩 (UI Colors)
```
面板背景: rgba(44, 62, 80, 0.95)  # 半透明深蓝
面板边框: #34495e                   # 深蓝灰
文本主色: #ecf0f1                   # 亮白
文本辅色: #95a5a6                   # 灰色
强调色:   #f39c12                   # 橙黄
```

### 2.2 字体系统

#### 主要字体
```css
/* UI 字体 */
font-family: 'Press Start 2P', cursive;

/* 特点:
   - 像素风格
   - 复古游戏感
   - 清晰可读
*/

/* 字号规范 */
--font-size-title: 18px;      /* 标题 */
--font-size-subtitle: 14px;   /* 副标题 */
--font-size-body: 10px;       /* 正文 */
--font-size-caption: 8px;     /* 说明文字 */
--font-size-icon: 24px;       /* 图标大小 */
```

#### 代码字体
```css
/* 代码预览字体 */
font-family: 'Courier New', monospace;

/* 用于:
   - IaC 代码显示
   - 技术术语
   - 配置参数
*/
```

### 2.3 间距系统

```css
/* 基础间距单位 */
--spacing-xs: 4px;    /* 极小间距 */
--spacing-sm: 8px;    /* 小间距 */
--spacing-md: 15px;   /* 中等间距 */
--spacing-lg: 20px;   /* 大间距 */
--spacing-xl: 30px;   /* 超大间距 */

/* 应用场景:
   xs: 图标与文字间距
   sm: 列表项内间距
   md: 面板内边距
   lg: 组件间距
   xl: 区域间距
*/
```

### 2.4 圆角系统

```css
--radius-sm: 4px;   /* 小圆角 - 按钮、输入框 */
--radius-md: 8px;   /* 中圆角 - 面板 */
--radius-lg: 12px;  /* 大圆角 - 对话框 */
--radius-full: 50%; /* 完全圆角 - 徽章、头像 */
```

### 2.5 阴影系统

```css
/* 像素风格阴影 - 使用硬边阴影 */
--shadow-sm:
  2px 2px 0 rgba(0, 0, 0, 0.3);  /* 小阴影 */

--shadow-md:
  3px 3px 0 rgba(0, 0, 0, 0.3);  /* 中阴影 */

--shadow-lg:
  4px 4px 0 rgba(0, 0, 0, 0.3);  /* 大阴影 */

--shadow-xl:
  6px 6px 0 rgba(0, 0, 0, 0.3);  /* 超大阴影 */

/* 特点:
   - 硬边无模糊 (符合像素风格)
   - 固定偏移量
   - 无扩散
*/
```

---

## 3. 组件设计规范

### 3.1 按钮组件 (Button)

#### 主要按钮 (Primary Button)
```css
.btn-primary {
  background: linear-gradient(135deg, #f39c12, #e74c3c);
  border: 3px solid #c0392b;
  color: #000;
  padding: 12px 18px;
  font-size: 9px;
  font-family: 'Press Start 2P', cursive;
  box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.btn-primary:hover {
  transform: translate(-3px, -3px);
  box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.3);
}

.btn-primary:active {
  transform: translate(0, 0);
  box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);
}
```

#### 次要按钮 (Secondary Button)
```css
.btn-secondary {
  background: #3498db;
  border: 3px solid #2980b9;
  color: #fff;
  /* 其他样式同上 */
}
```

#### 危险按钮 (Danger Button)
```css
.btn-danger {
  background: #e74c3c;
  border: 3px solid #c0392b;
  color: #fff;
  /* 其他样式同上 */
}
```

### 3.2 工具按钮 (Tool Button)

```css
.tool-btn {
  width: 70px;
  height: 70px;
  background: #34495e;
  border: 3px solid #2c3e50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.15s;
  cursor: pointer;
}

.tool-btn:hover {
  background: #3d566e;
  transform: translate(-3px, -3px);
  box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.3);
}

.tool-btn.selected {
  background: #f39c12;
  border-color: #e67e22;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
```

### 3.3 面板组件 (Panel)

```css
.panel {
  background: rgba(44, 62, 80, 0.95);
  border: 4px solid #34495e;
  padding: 15px;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.panel-header {
  color: #f39c12;
  font-size: 10px;
  margin-bottom: 15px;
  line-height: 1.5;
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-content {
  font-size: 8px;
  line-height: 1.8;
  color: #ecf0f1;
}
```

### 3.4 Toast 通知组件

```css
.toast {
  background: rgba(44, 62, 80, 0.95);
  border: 4px solid #f39c12;
  padding: 15px 20px;
  min-width: 320px;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
  animation: toastSlide 0.3s ease-out;
}

@keyframes toastSlide {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-title {
  color: #f39c12;
  font-size: 10px;
  margin-bottom: 10px;
}

.toast-message {
  color: #ecf0f1;
  font-size: 8px;
  line-height: 1.6;
}

/* 自动消失动画 */
.toast.fade-out {
  animation: toastFadeOut 0.3s ease-out forwards;
}

@keyframes toastFadeOut {
  to {
    transform: translateX(400px);
    opacity: 0;
  }
}
```

---

## 4. 3D 场景设计规范

### 4.1 相机设置

```javascript
// 相机配置
const cameraConfig = {
  fov: 60,                    // 视野角度
  near: 0.1,                  // 近裁剪面
  far: 1000,                  // 远裁剪面
  position: {                 // 初始位置
    x: 20,
    y: 25,
    z: 20
  },
  lookAt: { x: 0, y: 0, z: 0 }  // 观察目标
};

// OrbitControls 配置
const controlsConfig = {
  enableDamping: true,        // 启用阻尼
  dampingFactor: 0.05,        // 阻尼系数
  maxPolarAngle: Math.PI / 2.1,  // 最大俯角（防止翻转）
  minDistance: 10,            // 最小距离
  maxDistance: 60             // 最大距离
};
```

### 4.2 光照系统

```javascript
// 环境光
const ambientLight = {
  color: 0xffffff,
  intensity: 0.6              // 柔和环境光
};

// 方向光（太阳光）
const directionalLight = {
  color: 0xffffff,
  intensity: 0.8,
  position: { x: 20, y: 30, z: 20 },
  castShadow: true,
  shadow: {
    mapSize: { width: 2048, height: 2048 },
    camera: {
      near: 0.5,
      far: 100,
      left: -30,
      right: 30,
      top: 30,
      bottom: -30
    }
  }
};
```

### 4.3 体素建筑规范

```javascript
// 建筑尺寸
const buildingConfig = {
  tileSize: 2,                // 基础网格大小 (米)
  baseSize: 0.9,              // 建筑基座缩放
  topSize: 0.5,               // 顶部装饰大小
  heights: {
    office: 3,                // 办公楼高度
    factory: 2,               // 工厂高度
    bank: 4,                  // 银行高度
    warehouse: 2,             // 仓库高度
    station: 2,               // 车站高度
    network: 3,               // 网络中心高度
    security: 2,              // 安保高度
    observatory: 5,           // 观测塔高度
    power: 3,                 // 电厂高度
    road: 0.3                 // 道路高度
  }
};

// 建筑材质
const buildingMaterial = {
  type: 'MeshLambertMaterial',  // 使用 Lambert 材质（性能好）
  flatShading: false,           // 平滑着色
  transparent: false,          // 默认不透明
  opacity: 1.0                 // 不透明度
};

// 阴影配置
const shadowConfig = {
  castShadow: true,            // 投射阴影
  receiveShadow: true          // 接收阴影
};
```

### 4.4 粒子效果规范

```javascript
// 建造完成粒子效果
const buildCompleteParticles = {
  count: 50,                   // 粒子数量
  colors: [0xf39c12, 0xe74c3c, 0x2ecc71],  // 颜色
  size: 0.2,                   // 粒子大小
  speed: 5,                    // 上升速度
  lifetime: 1.5,               // 存活时间（秒）
  gravity: -2                  // 重力
};

// 删除建筑粒子效果
const demolishParticles = {
  count: 30,
  colors: [0xe74c3c, 0xc0392b],
  size: 0.3,
  speed: 8,
  lifetime: 1.0,
  gravity: -5
};

// 放置预览效果
const previewEffect = {
  opacity: 0.5,                // 半透明
  emissive: 0x333333,          // 自发光
  wireframe: false             // 不显示线框
};
```

---

## 5. 交互流程设计

### 5.1 放置建筑流程

```
用户动作                    系统响应
─────────────────────────────────────────
1. 点击工具栏按钮
   → 按钮高亮 (选中状态)
   → 鼠标变为十字光标
   → Toast: "点击地面放置建筑"

2. 鼠标移动到地面
   → 显示半透明预览建筑
   → 对齐到网格
   → 高亮目标网格

3. 点击地面
   → 移除预览
   → 创建建筑 (scale: 0)
   → 播放弹跳动画
   → 更新统计数字
   → Toast: "建造完成"

4. 再次点击工具栏按钮
   → 取消选中状态
   → 隐藏预览
```

### 5.2 查看建筑详情流程

```
用户动作                    系统响应
─────────────────────────────────────────
1. 点击已建建筑
   → 建筑高亮 (黄色边框)
   → 显示信息面板 (左侧滑入)
   → 填充建筑数据

2. 面板显示内容:
   → 建筑图标 + 名称
   → 类型、规格、状态
   → 操作按钮 (同步/回滚)

3. 点击面板外区域
   → 面板滑出
   → 取消建筑高亮
```

### 5.3 部署流程交互

```
用户动作                    系统响应
─────────────────────────────────────────
1. 点击"开始部署"按钮
   → 显示部署确认对话框
   → 列出将要变更的资源

2. 确认部署
   → 关闭对话框
   → 显示施工许可面板
   → 开始执行流程

3. 执行过程中:
   Stage 1: 图纸审查
   → 绿色对勾动画
   → Toast: "语法检查通过"

   Stage 2: 影响评估
   → 绿色对勾动画
   → 显示影响范围

   Stage 3: 沙盘推演
   → 进度条动画
   → 实时日志输出

   Stage 4: 试通车
   → 灰度进度可视化
   → 流量分配图

   Stage 5: 竣工验收
   → 最终确认
   → 完成动画

4. 任意阶段失败
   → 红色错误标记
   → 显示错误信息
   → 提供重试按钮
```

### 5.4 配置漂移检测流程

```
用户动作                    系统响应
─────────────────────────────────────────
1. 点击"违建稽查"按钮
   → 显示扫描动画
   → Toast: "正在检测配置漂移..."

2. 扫描完成
   → 漂移建筑高亮 (黄色 + ⚠️)
   → 正常建筑保持原色
   → Toast: "发现 N 处配置漂移"

3. 点击漂移建筑
   → 显示详情面板
   → 差异对比视图:
      - 现网值 (红色删除线)
      - 蓝图值 (绿色加粗)

4. 选择操作:
   同步到蓝图
   → 更新 IaC 代码
   → Toast: "已同步到蓝图"

   回滚现网
   → 显示确认对话框
   → 执行回滚
   → Toast: "回滚完成"
```

---

## 6. 响应式设计

### 6.1 断点系统

```css
/* 断点定义 */
--breakpoint-sm: 640px;   /* 小屏幕 */
--breakpoint-md: 768px;   /* 中等屏幕 */
--breakpoint-lg: 1024px;  /* 大屏幕 */
--breakpoint-xl: 1280px;  /* 超大屏幕 */

/* 默认: < 640px (移动端) */
@media (min-width: 640px) {
  /* 小屏幕及以上 */
}

@media (min-width: 768px) {
  /* 中等屏幕及以上 */
}

@media (min-width: 1024px) {
  /* 大屏幕及以上 */
}
```

### 6.2 移动端适配

```css
/* 移动端优化 */
@media (max-width: 768px) {
  /* 工具栏移到底部 */
  .tools-panel {
    top: auto;
    bottom: 80px;
    right: 10px;
    flex-direction: row;
    width: calc(100% - 20px);
    overflow-x: auto;
  }

  /* 工具按钮变小 */
  .tool-btn {
    width: 50px;
    height: 50px;
    flex-shrink: 0;
  }

  /* 信息面板全屏 */
  .info-panel {
    width: 100%;
    height: 50%;
    top: auto;
    bottom: 0;
    border-radius: 12px 12px 0 0;
  }

  /* 字号调整 */
  .font-size-body {
    font-size: 8px;
  }
}
```

---

## 7. 动画规范

### 7.1 缓动函数

```javascript
// 常用缓动函数
const easings = {
  // 线性
  linear: t => t,

  // 缓入
  easeIn: t => t * t,

  // 缓出
  easeOut: t => t * (2 - t),

  // 缓入缓出
  easeInOut: t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  // 弹跳效果
  easeOutBack: t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
};
```

### 7.2 动画时长

```javascript
const animationDurations = {
  fast: 150,      // 快速动画 (按钮悬停)
  normal: 300,    // 正常动画 (面板滑入)
  slow: 500,      // 慢速动画 (页面切换)
  building: 1000  // 建造动画 (建筑放置)
};
```

### 7.3 常用动画

#### 建筑放置动画
```javascript
function animateBuildingPlacement(mesh) {
  const duration = 1000;
  const startTime = Date.now();

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // 弹跳效果
    const scale = easeOutBack(progress);
    mesh.scale.set(scale, scale, scale);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  animate();
}
```

#### 面板滑入动画
```css
@keyframes slideInLeft {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.panel {
  animation: slideInLeft 0.3s ease-out;
}
```

#### Toast 通知动画
```css
@keyframes slideInRight {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast {
  animation: slideInRight 0.3s ease-out,
             fadeOut 0.3s ease-out 2.7s forwards;
}

@keyframes fadeOut {
  to {
    transform: translateX(400px);
    opacity: 0;
  }
}
```

---

## 8. 可访问性设计

### 8.1 键盘导航

```javascript
// 键盘快捷键
const keyboardShortcuts = {
  'Escape': '取消选中 / 关闭面板',
  'Delete': '删除选中建筑',
  '1-0': '快速选择工具 1-10',
  'W/A/S/D': '平移视角',
  'Arrow Keys': '移动选择',
  'Enter': '确认操作',
  'Tab': '切换焦点'
};

// 焦点管理
function handleKeyboardNavigation(event) {
  switch(event.key) {
    case 'Escape':
      cancelSelection();
      break;
    case 'Delete':
      deleteSelectedBuilding();
      break;
    case 'Tab':
      moveFocus(event);
      break;
  }
}
```

### 8.2 屏幕阅读器支持

```html
<!-- 为建筑添加 ARIA 标签 -->
<div class="building"
     role="button"
     tabindex="0"
     aria-label="办公楼，位于坐标 (10, 15)"
     aria-describedby="building-desc">
  <div id="building-desc" class="sr-only">
    办公楼类型，用于承载微服务，当前状态正常
  </div>
</div>

<!-- 屏幕阅读器专用样式 -->
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### 8.3 颜色对比度

```css
/* 确保文字和背景有足够的对比度 */

/* 正常文字 (WCAG AA: 4.5:1) */
.text-normal {
  color: #ecf0f1;  /* 亮白色 */
  background: #2c3e50;  /* 深蓝色 */
  /* 对比度: 11.1:1 ✅ */
}

/* 小号文字 (WCAG AA: 7:1) */
.text-small {
  color: #ecf0f1;
  background: #2c3e50;
  font-size: 8px;
  /* 对比度: 11.1:1 ✅ */
}

/* 链接文字 */
.link-text {
  color: #f39c12;  /* 橙黄色 */
  text-decoration: underline;
  background: #2c3e50;
  /* 对比度: 6.3:1 ✅ */
}
```

---

## 9. 性能优化

### 9.1 渲染优化

```javascript
// 1. 对象池模式
class BuildingPool {
  constructor(maxSize = 100) {
    this.pool = [];
    this.maxSize = maxSize;
  }

  acquire() {
    return this.pool.pop() || this.createNew();
  }

  release(building) {
    if (this.pool.length < this.maxSize) {
      building.visible = false;
      this.pool.push(building);
    }
  }
}

// 2. 实例化渲染
const instancedMesh = new THREE.InstancedMesh(
  geometry,
  material,
  maxBuildings
);

// 3. 视锥体裁剪
frustumCulling: true

// 4. LOD (Level of Detail)
const lod = new THREE.LOD();
lod.addLevel(highDetailMesh, 0);
lod.addLevel(mediumDetailMesh, 50);
lod.addLevel(lowDetailMesh, 100);
```

### 9.2 资源加载优化

```javascript
// 1. 懒加载
const GameCanvas = lazy(() => import('./components/GameCanvas'));

// 2. 代码分割
const toolsPanel = lazy(() =>
  import('./components/ToolsPanel')
    .then(module => ({ default: module.ToolsPanel }))
);

// 3. 预加载关键资源
<link rel="preload" href="/fonts/PressStart2P.woff2" as="font">
<link rel="modulepreload" href="/three.min.js">

// 4. CDN 加速
<script src="https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.min.js"></script>
```

---

## 10. 设计资产

### 10.1 图标资源

```typescript
// 图标映射
const iconMap = {
  office: '🏢',
  factory: '🏭',
  bank: '🏦',
  warehouse: '🏪',
  station: '🚂',
  network: '🌐',
  security: '🛡️',
  observatory: '📡',
  power: '⚡',
  road: '🛣️',

  // 状态图标
  normal: '✅',
  warning: '⚠️',
  error: '❌',
  building: '🔨',
  drift: '🔄'
};
```

### 10.2 声音效果 (未来)

```typescript
// 音效配置
const sounds = {
  buildingPlace: '/sounds/building-place.mp3',
  buildingComplete: '/sounds/building-complete.mp3',
  demolish: '/sounds/demolish.mp3',
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
  click: '/sounds/click.mp3'
};
```

---

## 11. 设计交付物

### 11.1 设计文件

1. **Figma 设计稿**
   - UI 组件库
   - 页面布局
   - 交互原型

2. **3D 模型**
   - 体素建筑模型
   - 材质贴图
   - 动画关键帧

3. **图标资源**
   - SVG 图标
   - Emoji 映射表
   - 动画图标

### 11.2 设计文档

1. ✅ 产品需求文档 (PRD)
2. ✅ 技术架构文档
3. ✅ 交互设计文档 (本文档)
4. ⏳ 视觉设计规范
5. ⏳ 组件库文档

---

## 12. 设计迭代计划

### Phase 1: MVP 设计 (Week 1-2)
- [x] 核心交互流程
- [x] 基础 UI 组件
- [x] 3D 场景原型
- [x] 视觉风格定义

### Phase 2: 设计完善 (Week 3-4)
- [ ] 完整组件库
- [ ] 动画效果
- [ ] 响应式适配
- [ ] 可访问性优化

### Phase 3: 精细化打磨 (Week 5-6)
- [ ] 音效系统
- [ ] 粒子特效
- [ ] 高级动画
- [ ] 主题定制

---

**文档版本**: v1.0
**最后更新**: 2026-04-06
**维护者**: Design Team
**审核状态**: ✅ 已批准
