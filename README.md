# 喵音小筑 · 二次元博客

一个基于 React + TypeScript + Tailwind CSS 构建的二次元日漫风格个人博客系统，部署于 Cloudflare Pages，集成音乐播放器、评论系统、番组追踪、后台管理、Live2D 看板娘、43 种实用工具等功能。

## 功能特性

### 前台页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | `/` | 三栏布局：Banner 轮播、文章卡片、侧边栏组件 |
| 文章 | `/archive` | 文章列表，支持按标签/分类筛选 |
| 文章详情 | `/article/:id` | Markdown 渲染、代码高亮、目录导航、点赞统计 |
| 说说 | `/shuoshuo` | 时间线展示、点赞、评论互动 |
| 留言板 | `/moments` | 评论系统，层级回复、点赞、管理员权限 |
| 画廊 | `/gallery` | LQIP 低质量占位图、灯箱预览、相邻图片预加载 |
| 音乐 | `/music` | 网易云歌单、歌词同步、多歌单切换、音频频谱可视化 |
| 我的 | `/my` | 个人信息、番组追踪（当季新番 + 个人追番列表） |
| 友链 | `/friends` | 友链展示、友链申请 |

### 首页组件

- **Banner 轮播**：全屏动态背景，11 张二次元日漫风格背景图
- **个人信息卡片**：创新头像框（双环旋转 + 粒子环绕 + 脉冲光晕）、打字机签名、字体选择器
- **侧边栏**：天气、热搜、访问统计、音乐播放器、日程、节日倒计时
- **文章热力图**：GitHub 风格的文章发布活跃度可视化
- **滚动视差**：页面滚动时的视差动效
- **在线访客**：实时在线人数显示
- **自定义光标**：桌面端跟随光标 + 光环动效
- **加载动画**：首次进入时的进度条动画
- **图片灯箱**：全局图片点击放大查看
- **返回顶部**：浮动按钮，平滑滚动

### 音乐系统

- **歌单**：6 个精选日漫歌单（2024 新番、2023 新番、经典金曲、宫崎骏等），每单 10 首
- **音频代理**：服务端跟随 302 重定向，避免 mixed-content 问题
- **歌词同步**：LRC 格式歌词，实时高亮当前行
- **播放模式**：列表循环、单曲循环、随机播放
- **面板**：迷你播放器（侧边栏 + 浮动）+ 全屏播放器
- **频谱可视化**：播放时实时音频频谱动画
- **歌曲时长**：播放时自动获取并缓存，后台预加载队列歌曲时长
- **离线兜底**：内嵌 60 首歌曲数据，API 不可用时自动回退

### 番组模块

- **当季新番**：通过 Jikan API（MyAnimeList）获取当前季度新番，按评分排序
- **个人追番**：手动维护的追番列表，包含评分、进度、 genres、个人评论
- **筛选**：按类型（TV / 电影 / OVA）筛选
- **兜底数据**：API 超时或失败时显示 12 部预设番组

### 评论系统

自建评论系统，无需第三方登录或验证码。

- **身份设置**：昵称 + 邮箱（无需验证码）
- **管理员权限**：使用管理员邮箱自动获得删除任意评论权限 + 博主徽章
- **功能**：层级回复、点赞、楼层号、频率限制（5 秒/条）
- **头像**：35 张动漫头像池，确定性哈希映射（同一昵称永远同一头像）
- **存储**：Cloudflare KV（生产）/ JSON 文件（本地开发）

### 工具箱（43 种工具）

左下角浮动工具箱，支持拖拽排序，按分类展示：

| 分类 | 工具 |
|------|------|
| 热门资讯 | 智能搜索、全网热榜、今日金价、GitHub 用户、GitHub 仓库、历史今天、每日黄历 |
| 图片壁纸 | 随机图片、原神图片、4K 图片、必应每日、随机古诗、随机猫猫、随机狗狗、动漫图片、抽象艺术、像素风、头像生成 |
| 实用工具 | 密码生成、单位换算、进制转换、计算器、快递查询、手机归属地、世界时间、IP 查询、UUID 生成、汇率换算、番茄钟、倒数日 |
| 趣味测试 | BMI 计算、驾考题库、MBTI 测试、反应力测试、打字测试、音感测试 |
| 娱乐互动 | 每日运势、塔罗牌、土味情话 |
| 编程开发 | Emoji 字典 |
| 生活服务 | 空气质量（地理定位）、快递时效、油价查询 |

### 后台管理

访问 `/admin` 进入后台管理系统。

- **登录密码**：`123456`
- **鉴权方式**：JWT Token（7 天有效期）
- **功能模块**：仪表盘、文章管理（Markdown 上传）、说说管理、评论管理、友链管理、访问统计

### 其他功能

- **Live2D 看板娘**：可切换模型（kp31 等）、互动提示、工具按钮
- **动态背景**：11 张背景图，设置面板可切换，持久化到 localStorage
- **主题系统**：暗色 / 亮色切换
- **Cloudflare Pages Functions**：评论、统计、音乐代理、后台 API

## 技术栈

| 分类 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 5 |
| 样式 | Tailwind CSS 3 |
| 路由 | React Router v6 |
| 状态管理 | Zustand |
| 动画 | Framer Motion |
| 拖拽 | @dnd-kit/core + sortable |
| 图标 | Lucide React |
| Markdown | react-markdown + remark-gfm + rehype-highlight |
| 后端 | Cloudflare Pages Functions |
| 存储 | Cloudflare KV |
| 部署 | Cloudflare Pages |

## 项目结构

```
├── functions/                 # Cloudflare Pages Functions（后端 API）
│   ├── admin/[[path]].ts      # 后台管理 API（JWT 鉴权 + CRUD）
│   ├── local-api/[[path]].ts  # 前台 API（评论 + 统计 + 音乐代理）
│   ├── music/[[path]].ts      # 网易云音乐代理
│   ├── api/[[path]].ts        # 第三方 API 代理
│   ├── kuaidi/[[path]].ts     # 快递查询代理
│   └── uapis/[[path]].ts      # API 聚合代理
├── public/                    # 静态资源
│   ├── avatars/               # 评论用户头像（35 张）
│   ├── bg/                    # 背景图片（6 webp + 5 anime jpg）
│   └── live2d/                # Live2D 看板娘资源
├── server/
│   └── local-api.cjs          # 本地开发 API（评论 + 统计 + 音乐代理）
├── src/
│   ├── components/
│   │   ├── admin/             # 后台路由守卫
│   │   ├── atoms/             # 原子组件（按钮、主题切换、背景设置）
│   │   ├── background/        # 动态背景
│   │   ├── home/              # 首页组件（30+ 组件）
│   │   ├── layout/            # 布局组件（Header / Footer / Layout）
│   │   ├── molecules/         # 分子组件（评论、Live2D）
│   │   └── music/             # 音乐播放器组件
│   ├── data/                  # 静态数据（文章、说说、友链、歌单、背景）
│   ├── hooks/                 # 自定义 Hooks（音频播放器、主题、弹幕）
│   ├── pages/                 # 页面组件
│   │   ├── admin/             # 后台管理页面
│   │   ├── Home.tsx           # 首页
│   │   ├── Music.tsx          # 音乐
│   │   ├── My.tsx             # 我的（含番组模块）
│   │   └── ...
│   ├── store/                 # Zustand 状态管理
│   ├── types/                 # TypeScript 类型定义
│   └── utils/                 # 工具函数
├── vite.config.ts             # Vite 配置（含本地 API 插件）
└── wrangler.toml              # Cloudflare 配置
```

## 快速开始

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

本地 API 由 `server/local-api.cjs` 提供，数据存储在 `server-data/` 目录（已 gitignore）。

### 构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

## 部署

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
   npm run build
   npx wrangler pages deploy dist --project-name=bob
   ```

### 配置说明

| 配置项 | 位置 | 说明 |
|--------|------|------|
| `COMMENTS_KV` | wrangler.toml | KV 命名空间，存储评论和统计数据 |
| 管理员邮箱 | `functions/local-api/[[path]].ts` | 使用该邮箱评论时获得管理员权限 |
| 后台密码 | `functions/admin/[[path]].ts` | 后台登录密码（默认 `123456`） |
| 音乐 API（本地） | `server/local-api.cjs` | `http://47.104.189.4/music`（HTTP，通过 vite proxy） |
| 音乐 API（线上） | `functions/local-api/[[path]].ts` | `https://api.injahow.cn/meting`（HTTPS，Cloudflare 兼容） |

## 背景图片

11 张二次元日漫萝莉风格背景图，全部本地托管：

- 6 张来自 boke.hiromu.top（webp 格式）
- 5 张来自 konachan.net 画师原创作品（jpg 格式，非 AI 生成）

设置面板可切换背景，设置会持久化到 localStorage。

## License

MIT License
