# 喵音小筑 · 个人博客

一个基于 React + TypeScript + Tailwind CSS 构建的二次元日漫风格个人博客系统，部署于 Cloudflare Pages，集成了音乐播放器、评论系统、后台管理、Live2D 看板娘等功能。

## ✨ 功能特性

### 前台功能
- **首页**：三栏布局，Banner 轮播、文章卡片、侧边栏组件（天气、热搜、访问统计、音乐播放器、日程、节日倒计时）
- **文章系统**：Markdown 渲染、代码高亮、目录导航、浏览量/点赞统计
- **说说/动态**：时间线展示、点赞功能、评论互动
- **音乐播放器**：网易云歌单集成、歌词同步、多歌单切换、播放模式（列表/单曲/随机）、迷你/全屏面板
- **评论区**：自建评论系统（无需第三方登录）、层级回复、点赞、管理员权限、用户头像
- **相册**：LQIP 低质量占位图、灯箱预览、相邻图片预加载
- **友链**：友链展示、友链申请
- **工具箱**：GitHub 用户/仓库查询、手机号归属地查询
- **Live2D 看板娘**：可切换模型、互动提示
- **动态背景**：11 张二次元日漫萝莉风格背景图、设置面板切换
- **主题系统**：暗色/亮色主题切换

### 后台管理
- **仪表盘**：文章/说说/评论/浏览量数据概览
- **文章管理**：增删改查、Markdown 编辑
- **说说管理**：增删改查
- **评论管理**：查看/删除任意评论
- **友链管理**：审批友链申请
- **访问统计**：30 天浏览量趋势图

## 🛠 技术栈

| 分类 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 5 |
| 样式 | Tailwind CSS 3 |
| 路由 | React Router v6 |
| 状态管理 | Zustand |
| 动画 | Framer Motion |
| 图标 | Lucide React |
| Markdown | react-markdown + remark-gfm + rehype-highlight |
| 后端 | Cloudflare Pages Functions |
| 存储 | Cloudflare KV |
| 部署 | Cloudflare Pages |

## 📁 项目结构

```
├── functions/                 # Cloudflare Pages Functions（后端 API）
│   ├── [[path]].ts            # SPA 回退
│   ├── admin/[[path]].ts      # 后台管理 API（鉴权 + 文章/说说/评论/友链/统计 CRUD）
│   ├── local-api/[[path]].ts  # 前台 API（评论 + 统计 + 音乐代理）
│   ├── music/[[path]].ts      # 网易云音乐代理（歌单/封面/歌词/音频）
│   ├── api/[[path]].ts        # 第三方 API 代理
│   ├── kuaidi/[[path]].ts     # 快递查询代理
│   └── uapis/[[path]].ts      # API 聚合代理
├── public/                    # 静态资源
│   ├── avatars/               # 评论用户头像（35 张）
│   ├── bg/                    # 背景图片（6 webp + 5 anime jpg）
│   └── live2d/                # Live2D 看板娘资源
├── server/                    # 本地开发服务器
│   └── local-api.cjs          # 本地 API（评论 + 统计 + 音乐代理 + 友链）
├── src/
│   ├── components/            # React 组件
│   │   ├── admin/             # 后台组件（路由守卫）
│   │   ├── background/        # 动态背景
│   │   ├── home/              # 首页组件（天气、热搜、统计、音乐等）
│   │   ├── layout/            # 布局组件
│   │   ├── molecules/         # 分子组件（评论、Live2D）
│   │   └── music/             # 音乐播放器组件
│   ├── data/                  # 静态数据（文章、说说、友链、歌单、背景）
│   ├── hooks/                 # 自定义 Hooks（音频播放器、主题）
│   ├── pages/                 # 页面
│   │   ├── admin/             # 后台管理页面
│   │   ├── ArticleDetail.tsx  # 文章详情
│   │   ├── Home.tsx           # 首页
│   │   ├── Music.tsx          # 音乐
│   │   ├── Shuoshuo.tsx       # 说说
│   │   └── ...
│   ├── store/                 # Zustand 状态管理
│   ├── types/                 # TypeScript 类型定义
│   └── utils/                 # 工具函数
├── vite.config.ts             # Vite 配置（含本地 API 插件）
└── wrangler.toml              # Cloudflare 配置
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（含本地 API）
npm run dev
```

开发服务器启动后访问 `http://localhost:5173/`。

本地 API 由 `server/local-api.cjs` 提供，数据存储在 `server-data/` 目录。

### 构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

## 🌐 部署

### Cloudflare Pages

1. **Fork 本仓库**

2. **创建 Cloudflare Pages 项目**
   ```bash
   npx wrangler pages project create bob
   ```

3. **创建 KV 命名空间**（用于评论和统计数据存储）
   ```bash
   npx wrangler kv namespace create COMMENTS_KV
   ```

4. **更新 `wrangler.toml`** 中的 KV namespace ID

5. **部署**
   ```bash
   npx wrangler pages deploy dist --project-name=bob
   ```

### 配置说明

| 配置项 | 位置 | 说明 |
|--------|------|------|
| `COMMENTS_KV` | wrangler.toml | KV 命名空间，存储评论和统计数据 |
| 管理员邮箱 | functions/local-api/[[path]].ts | 设为 `jaychou8421@gmail.com` 时获得评论管理权限 |
| 后台密码 | functions/admin/[[path]].ts | 后台登录密码（默认 `123456`） |
| 音乐 API | functions/music/[[path]].ts | Meting API 上游（`api.injahow.cn`） |

## 🔐 后台管理

访问 `/admin` 进入后台管理系统。

- **登录密码**：`123456`
- **鉴权方式**：JWT Token（7 天有效期）
- **功能模块**：仪表盘、文章管理、说说管理、评论管理、友链管理、访问统计

## 🎵 音乐系统

音乐数据来源于网易云音乐歌单，通过 Meting API 获取。

- **歌单列表**：6 个精选日漫歌单（2024新番、2023新番、经典金曲、宫崎骏等）
- **音频代理**：服务端跟随 302 重定向，避免 mixed-content 问题
- **歌词同步**：LRC 格式歌词，实时高亮当前行
- **离线兜底**：内嵌 60 首歌曲数据，API 不可用时自动回退

## 💬 评论系统

自建评论系统，无需第三方登录。

- **身份设置**：昵称 + 邮箱（无需验证码）
- **管理员权限**：使用管理员邮箱自动获得删除任意评论权限
- **功能**：层级回复、点赞、楼层号、频率限制
- **存储**：Cloudflare KV（生产）/ JSON 文件（本地开发）
- **头像**：35 张动漫头像池，确定性哈希映射（同一昵称永远同一头像）

## 🖼 背景图片

11 张二次元日漫萝莉风格背景图：
- 6 张来自 boke.hiromu.top（webp 格式）
- 5 张来自 konachan.net 画师原创作品（jpg 格式，非 AI 生成）

设置面板可切换背景，设置会持久化到 localStorage。

## 📝 License

MIT License
