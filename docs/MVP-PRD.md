# Image Background Remover — MVP 需求文档

---

## 1. 项目概述

### 1.1 产品定位

一个轻量级的在线图片背景去除工具，用户上传图片后自动移除背景，支持替换新背景并下载。全程无需注册、不存储图片，即用即走。

### 1.2 目标用户

- 电商卖家（制作白底商品图）
- 社交媒体运营（制作透明背景素材）
- 普通用户（快速抠图换背景）

### 1.3 核心价值

免安装、免注册、无需 Photoshop 技能，3 秒完成抠图。

---

## 2. 功能范围

### 2.1 MVP 核心功能（本期必做）

| 编号 | 功能 | 描述 | 优先级 |
|------|------|------|--------|
| F1 | 图片上传 | 支持拖拽上传、Ctrl+V 粘贴、点击选择三种方式 | P0 |
| F2 | 背景去除 | 通过 remove.bg API 自动去除图片背景，返回透明 PNG | P0 |
| F3 | 结果预览 | 原图与结果图并排对比展示，透明区域显示棋盘格 | P0 |
| F4 | 背景替换 | 支持透明背景、预设纯色、自定义颜色、自定义图片背景 | P0 |
| F5 | 图片下载 | 将合成后的图片导出为 PNG 格式下载到本地 | P0 |
| F6 | 错误处理 | API 异常时展示错误信息并提供重试按钮 | P0 |

### 2.2 后续迭代（本期不做）

| 编号 | 功能 | 描述 |
|------|------|------|
| F7 | 批量处理 | 一次上传多张图片，批量去除背景 |
| F8 | 手动擦除/恢复 | 画笔工具手动调整扣除区域 |
| F9 | 图片裁剪 | 上传后裁剪到指定尺寸再处理 |
| F10 | 历史记录 | 本地缓存处理历史，支持回溯 |
| F11 | 格式选择 | 支持导出 JPEG、WebP 等格式 |
| F12 | AI 背景生成 | 用文字描述生成 AI 背景图 |

---

## 3. 用户流程

### 3.1 主流程

```
进入页面 → 上传图片 → 点击「Remove Background」
  → 等待处理（1-3秒）→ 查看原图/结果对比
  → 选择背景（透明/纯色/图片）→ 实时预览
  → 点击「Download」→ 保存到本地
```

### 3.2 页面状态流转

```
┌──────┐   上传图片   ┌──────────┐   点击移除   ┌────────────┐
│ IDLE │ ──────────→ │ UPLOADED │ ──────────→ │ PROCESSING │
└──────┘              └──────────┘              └────────────┘
    ↑                     │                          │
    │    点击「New Image」│              ┌───────┬───┘
    │                     │              │       │
    │                     │         API 成功   API 失败
    │                     │              │       │
    │                     │         ┌────┴──┐ ┌──┴─────┐
    │                     │         │ DONE  │ │ ERROR  │
    │                     │         └───────┘ └────────┘
    │                     │              │
    └─────────────────────┴──────────────┘
```

---

## 4. 功能详细说明

### 4.1 图片上传（F1）

**交互方式：**

- **拖拽上传**：用户将图片拖入上传区域，拖入时边框高亮变色
- **粘贴上传**：用户在页面任意位置按 Ctrl+V，自动捕获剪贴板中的图片
- **点击上传**：点击「Choose Image」按钮触发系统文件选择器

**约束条件：**
- 仅接受图片格式（image/*）
- 单文件最大 10 MB
- 不符合条件时显示错误提示

**前端实现：**
- 组件：`UploadZone.tsx`
- 拖拽：监听 `dragover` / `dragleave` / `drop` 事件
- 粘贴：全局 `window.addEventListener('paste', ...)`
- 点击：隐藏 `<input type="file" accept="image/*">`

### 4.2 背景去除（F2）

**处理流程：**
1. 前端将图片以 `multipart/form-data` 发送至 `/api/remove-bg`
2. 后端（Express 本地 / Cloudflare Function 生产）代理请求至 remove.bg API
3. remove.bg 返回透明背景 PNG
4. 后端直接将 PNG 二进制流返回给前端

**技术细节：**
- 请求方式：`POST /api/remove-bg`
- 请求体：`FormData { image: File }`
- 响应体：`image/png`（成功）或 `application/json { error }`（失败）
- API Key 存储在后端环境变量，不暴露给前端
- 图片全程在内存中处理，不落盘

### 4.3 结果预览（F3）

**展示方式：**
- 左右并排：左侧「Original」原图，右侧「Result」结果
- 透明区域使用 CSS 棋盘格背景（16×16 像素）
- 处理中显示半透明遮罩 + 旋转加载动画
- 响应式布局，窄屏自动上下堆叠

**背景替换后：**
- 透明棋盘格替换为实际背景色/图片
- 预览区域的 `background` CSS 属性动态更新

### 4.4 背景替换（F4）

**四种模式：**

| 模式 | 说明 | 示例 |
|------|------|------|
| 透明 | 保留原始透明背景 | 棋盘格 `transparent` |
| 预设颜色 | 白、黑、灰、蓝、绿、红 6 种快速选择 | `#ffffff` 等 |
| 自定义颜色 | 浏览器原生取色器，任意颜色 | 实时 `<input type="color">` |
| 图片背景 | 上传一张图片作为新背景 | 覆盖填充（cover） |

**合成方式：**
- 利用 HTML Canvas 将前景图绘制到背景上
- 切换背景时实时重绘，< 100ms
- 最终下载的时候，也按当前选中的背景进行合成

### 4.5 图片下载（F5）

- 点击「⬇ Download Result」按钮
- 通过 Canvas `toBlob('image/png')` 生成 PNG
- 创建临时 `<a>` 标签触发下载
- 文件名格式：`{原文件名}_no_bg.png`

### 4.6 错误处理（F6）

**异常场景覆盖：**

| 场景 | 用户提示 | 操作 |
|------|---------|------|
| 文件非图片 | 「Please upload an image file.」 | 重新选择 |
| 文件 > 10MB | 「File is too large. Maximum size is 10 MB.」 | 重新选择 |
| API Key 未配置 | 「Server not configured: missing API key」 | — |
| remove.bg 限流 | 「Rate limit exceeded」等 API 返回的错误信息 | 点击重试 |
| 网络异常 | 具体错误信息 | 点击重试 |

错误展示组件：`ErrorBanner.tsx`，红色背景条，包含错误信息和「Retry」按钮。

---

## 5. 技术架构

### 5.1 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 前端框架 | React 18 + TypeScript | 组件化，状态机管理 |
| 构建工具 | Vite 6 | 快速 HMR，ESM 原生支持 |
| 样式 | CSS（CSS Variables） | 零依赖，主题变量统一管理 |
| 本地后端 | Express + multer | 开发环境 API 代理 |
| 生产后端 | Cloudflare Pages Function | 边缘计算，零冷启动 |
| 图片处理 | remove.bg API | 专业抠图效果 |
| 部署 | Cloudflare Pages | 全球 CDN，免费额度 |

### 5.2 项目结构

```
removebg/
├── src/                        # React 前端
│   ├── components/             # UI 组件
│   │   ├── App.tsx             # 根组件 + 状态机
│   │   ├── Header.tsx          # 顶部标题栏
│   │   ├── UploadZone.tsx      # 上传区域（拖拽/粘贴/点选）
│   │   ├── Editor.tsx          # 编辑面板（预览 + 控制）
│   │   ├── ImagePreview.tsx    # 原图/结果对比
│   │   ├── BackgroundPicker.tsx# 背景选择器
│   │   ├── Toolbar.tsx         # 操作按钮栏
│   │   └── ErrorBanner.tsx     # 错误提示条
│   ├── hooks/
│   │   └── useBackgroundRemoval.ts  # API 调用 Hook
│   ├── api/
│   │   └── client.ts           # API 请求封装
│   ├── utils/
│   │   └── canvas.ts           # Canvas 合成 + 下载工具
│   ├── styles/
│   │   └── global.css          # 全局样式
│   └── main.tsx                # 入口
├── functions/api/
│   └── remove-bg.ts            # Cloudflare Pages Function
├── server/
│   └── index.js                # Express 本地开发服务器
├── vite.config.ts              # Vite 配置（含 API 代理）
├── wrangler.toml               # Cloudflare 部署配置
└── package.json
```

### 5.3 数据流

```
用户上传图片 (File)
  ↓
App 状态机: IDLE → UPLOADED
  ↓ 用户点击 Remove Background
App 状态机: UPLOADED → PROCESSING
  ↓
useBackgroundRemoval.process(file)
  ↓ fetch POST /api/remove-bg (FormData)
后端代理 → remove.bg API
  ↓ 返回 PNG Blob
App 状态机: PROCESSING → DONE
  ↓
Editor 展示 resultUrl
  ↓ 用户切换背景
Canvas 合成 → 更新 compositeUrl
  ↓ 用户点击 Download
Canvas.toBlob() → 浏览器下载
```

---

## 6. 非功能需求

| 需求 | 指标 |
|------|------|
| 处理速度 | 单张图片 < 5 秒（取决于 remove.bg API） |
| 文件限制 | 单文件 ≤ 10 MB，仅图片格式 |
| 浏览器兼容 | Chrome、Firefox、Safari、Edge 最新两个大版本 |
| 响应式 | 桌面端优先，移动端自适应 |
| 安全性 | API Key 仅存储在后端，前端不可见 |
| 隐私 | 图片全程内存处理，不上传到自有服务器存储 |
| 可用性 | Cloudflare 全球 CDN，99.9% SLA |

---

## 7. 验收标准

| 编号 | 测试用例 | 预期结果 |
|------|---------|---------|
| AC1 | 拖拽一张 JPG 图片到上传区域 | 图片加载，显示在预览区 |
| AC2 | 在页面按 Ctrl+V 粘贴剪贴板图片 | 图片加载，显示在预览区 |
| AC3 | 上传 >10MB 的文件 | 显示文件过大错误提示 |
| AC4 | 点击「Remove Background」 | 显示加载动画，3 秒内返回去底结果 |
| AC5 | 切换到白色背景 | 右侧预览背景变为白色 |
| AC6 | 切换到自定义图片背景 | 右侧预览显示新背景 + 前景图 |
| AC7 | 点击「Download Result」 | 触发浏览器下载，文件名为 `xxx_no_bg.png` |
| AC8 | 未配置 API Key 时调用接口 | 显示「Server not configured」错误 |
| AC9 | 网络中断时调用接口 | 显示错误信息 + Retry 按钮 |
| AC10 | 点击「New Image」 | 回到初始上传页面 |

---

## 8. 里程碑

| 阶段 | 内容 | 状态 |
|------|------|------|
| M1 | 项目初始化 + 基础架构搭建 | ✅ 完成 |
| M2 | 上传组件 + 状态机 + 后端代理 | ✅ 完成 |
| M3 | 背景替换 + Canvas 合成 + 下载 | ✅ 完成 |
| M4 | 错误处理 + UI 打磨 | ✅ 完成 |
| M5 | Cloudflare 部署配置 | ✅ 完成 |
| M6 | 上线部署 + 验收测试 | 🔲 待执行 |

---

## 9. 部署信息

- **平台**：Cloudflare Pages
- **API 密钥**：通过 `wrangler secret put` 或 Dashboard 环境变量设置
- **构建命令**：`npm run build`
- **输出目录**：`dist`
- **API 端点**：`/api/remove-bg`（Cloudflare Function 自动路由）
