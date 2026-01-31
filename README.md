# VideoChat

<div align="center">

一个现代化的多模型 AI 视频生成平台

[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-BaaS-3ECF8E?logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 简介

VideoChat 是一个功能完善的 AI 视频生成平台，支持多种主流视频生成模型，提供简洁直观的对话式交互界面。无论是文生视频还是图生视频，都能轻松完成。

### 核心特性

- **多模型支持** - 集成 20+ 主流视频生成模型（海螺、可灵、Vidu、即梦、Seedance 等）
- **对话式交互** - 简洁的聊天界面，自然流畅的创作体验
- **双向生成** - 支持文生视频（T2V）和图生视频（I2V）
- **高级控制** - 首尾帧控制、多图输入、负面提示词等
- **素材管理** - 内置素材库，方便浏览和管理生成的视频
- **云端存储** - 基于 Supabase 的可靠数据存储
- **国际化** - 支持中文和英文界面

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 6 |
| 状态管理 | Zustand |
| 样式方案 | Tailwind CSS |
| 动画库 | Framer Motion |
| 后端服务 | Supabase (PostgreSQL + Auth + Storage) |
| 国际化 | i18next |
| 路由 | React Router v6 |

---

## 支持的模型

### 海螺 (Hailuo)
- Hailuo-02、Hailuo-2.3、Hailuo-2.3-fast

### 可灵 (Kling)
- Kling-1.6、Kling-2.0、Kling-2.1、Kling-o1、Kling-2.5、Kling-2.6

### Vidu
- Vidu-q2、Vidu-q2-turbo、Vidu-q2-pro

### 即梦 (Jimeng)
- Jimeng-3.0pro

### Seedance
- Seedance-1.0-pro、Seedance-1.0-lite-i2v、Seedance-1.0-pro-fast、Seedance-1.5-pro

### 其他
- GV-3.1、GV-3.1-fast、OS-2.0

---

## 快速开始

### 环境要求

- Node.js >= 18
- npm 或 pnpm
- Supabase 账号

### 安装步骤

1. **克隆项目**

```bash
git clone https://github.com/your-username/VideoChat.git
cd VideoChat
```

2. **安装依赖**

```bash
npm install
```

3. **配置环境变量**

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

主要配置项：

```env
# 邀请码（用于用户注册）
VITE_AUTH_INVITE_CODE=your_invite_code

# Supabase 配置
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 腾讯云 VOD AIGC（视频生成服务）
VITE_VOD_SECRET_ID=your_vod_secret_id
VITE_VOD_SECRET_KEY=your_vod_secret_key
VITE_VOD_SUB_APP_ID=your_sub_app_id
```

4. **初始化数据库**

```bash
npm run init:all
```

5. **启动开发服务器**

```bash
npm run dev
```

访问 http://localhost:3000 即可使用。

---

## 项目结构

```
VideoChat/
├── public/                 # 静态资源
├── scripts/                # 初始化脚本
├── src/
│   ├── components/         # React 组件
│   │   ├── features/       # 功能组件
│   │   │   ├── assets/     # 素材库组件
│   │   │   ├── auth/       # 认证组件
│   │   │   ├── chat/       # 聊天组件
│   │   │   └── user/       # 用户组件
│   │   └── shared/         # 共享组件
│   ├── config/             # 配置文件
│   ├── hooks/              # React Hooks
│   ├── i18n/               # 国际化
│   ├── pages/              # 页面组件
│   ├── providers/          # Context Providers
│   ├── services/           # 业务服务层
│   ├── store/              # Zustand 状态管理
│   ├── styles/             # 样式文件
│   ├── types/              # TypeScript 类型
│   └── utils/              # 工具函数
├── .env.example            # 环境变量示例
├── tailwind.config.js      # Tailwind 配置
└── vite.config.ts          # Vite 配置
```

---

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | 代码检查 |
| `npm run format` | 代码格式化 |
| `npm run init` | 初始化 Supabase |
| `npm run init:all` | 完整初始化（表 + 存储 + 认证） |

---

## 部署

### Vercel 部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/VideoChat)

### 手动部署

1. 构建项目：`npm run build`
2. 将 `dist` 目录部署到任意静态托管服务

---

## 配置说明

### Supabase 配置

项目使用 Supabase 作为后端服务，需要配置以下表：

- `chat_msgs` - 聊天消息存储
- `assets` - 素材资源存储
- `model_configs` - 模型配置存储
- `video_tasks` - 视频任务存储

运行 `npm run init:all` 可自动创建所有必要的表和存储桶。

### 视频生成服务

项目通过腾讯云 VOD AIGC API 进行视频生成，需要配置相应的密钥。

---

## 功能说明

### 文生视频 (T2V)

输入文字描述，AI 自动生成对应的视频内容。

### 图生视频 (I2V)

上传一张或多张图片作为参考，生成基于图片的视频动画。

### 首尾帧控制

部分模型支持首尾帧控制，可以指定视频的起始和结束画面。

### 素材库

自动保存所有生成的视频，支持收藏、分类浏览等功能。

---

## 贡献指南

欢迎提交 Issue 和 Pull Request。

1. Fork 本项目
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

---

## 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件。

---

<div align="center">

**VideoChat** - 让视频创作更简单

</div>
