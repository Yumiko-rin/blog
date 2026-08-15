<div align="center">

# 喵音小筑 · 二次元博客

*用代码和音乐构建的数字花园*

[![Deploy](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)](https://bob-35z.pages.dev/)
[![Framework](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Language](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Styling](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**在线演示** → [https://bob-35z.pages.dev/](https://bob-35z.pages.dev/)

</div>

---

## 项目简介

一个基于 React + TypeScript + Tailwind CSS 构建的二次元日漫风格全栈个人博客系统。部署于 Cloudflare Pages，使用 Pages Functions + KV 实现后端能力，集成音乐播放器、自建评论系统、番组追踪、后台管理、Live2D 看板娘、43 种实用工具等功能。

## 功能一览

### 前台页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | `/` | Banner 轮播 + 文章卡片 + 侧边栏组件，三栏布局 |
| 文章归档 | `/archive` | 文章列表，支持按标签/分类筛选 |
| 文章详情 | `/article/:id` | Markdown 渲染、代码高亮、目录导航、点赞统计 |
| 说说 | `/shuoshuo` | 时间线展示、点赞、评论互动 |
| 留言板 | `/moments` | 评论系统，层级回复、点赞、管理员权限 |
| 画廊 | `/gallery` | LQIP 低质量占位图、灯箱预览、相邻图片预加载 |
| 音乐 | `/music` | 网易云歌单、歌词同步、多歌单切换、音频频谱可视化 |
| 个人中心 | `/my` | 个人信息、番组追踪（当季新番 + 个人追番列表） |
| 友链 | `/friends` | 友链展示、自助申请友链 |
| 关于 | `/about` | 博主介绍 |
| 标签 | `/tags` | 标签云 + 关联文章 |

### 首页特色组件

- **动态背景**：11 张二次元背景图，`<img>` 双层淡入切换（无黑屏），8 秒自动轮播，设置面板实时同步
- **个人信息卡片**：双环旋转头像框 + 粒子环绕 + 脉冲光晕 + 打字机签名
- **侧边栏**：天气、热搜、访问统计、迷你音乐播放器、日程提醒、节日倒计时
- **文章热力图**：GitHub 风格的文章发布活跃度可视化
- **在线访客**：实时在线人数显示
- **自定义光标**：桌面端跟随光标 + 光环动效
- **加载动画**：首次进入时的进度条动画
- **返回顶部**：浮动按钮，平滑滚动

### 音乐系统

- 6 个精选日漫歌单（新番、经典金曲、宫崎骏等），每单 10 首
- 服务端跟随 302 重定向，解决 mixed-content 问题
- LRC 格式歌词实时高亮，支持逐行同步
- 播放模式：列表循环 / 单曲循环 / 随机播放
- 迷你播放器（侧边栏 + 浮动）+ 全屏播放器
- 播放时实时音频频谱可视化
- 内嵌 60 首离线兜底歌曲数据

### 番组模块

- **当季新番**：通过 Jikan API（MyAnimeList）获取，按评分排序
- **个人追番**：手动维护追番列表，含评分、进度、genres、个人评论
- 按类型筛选（TV / 电影 / OVA），API 失败时显示 12 部预设番组兜底
- 番组封面使用 AniList CDN（`s4.anilist.co`），避免 MAL CDN 热链保护问题

### 评论系统

自建评论系统，无需第三方登录或验证码。

- 昵称 + 邮箱设置身份（无验证码）
- 管理员邮箱自动获得删除权限 + 博主徽章
- 层级回复、点赞去重、楼层号（沙发/板凳/地板）
- 频率限制（5 秒/条）、重复内容拦截
- 35 张动漫头像池，确定性哈希映射
- Markdown 渲染，支持图片上传（Base64 内嵌）
- 存储：Cloudflare KV（生产）/ JSON 文件（本地开发）

### 工具箱（43 种工具）

左下角浮动工具箱，支持拖拽排序：

| 分类 | 工具 |
|------|------|
| 热门资讯 | 智能搜索、全网热榜、今日金价、GitHub 用户/仓库、历史今天、每日黄历 |
| 图片壁纸 | 随机图片、原神图片、4K 图片、必应每日、随机古诗、猫猫/狗狗、动漫图片、头像生成 |
| 实用工具 | 密码生成、单位换算、进制转换、计算器、快递查询、手机归属地、世界时间、IP 查询、UUID、汇率、番茄钟、倒数日 |
| 趣味测试 | BMI、驾考题库、MBTI、反应力测试、打字测试、音感测试 |
| 娱乐互动 | 每日运势、塔罗牌、土味情话 |
| 编程开发 | Emoji 字典 |
| 生活服务 | 空气质量、快递时效、油价查询 |

### 后台管理系统

访问 `/admin` 进入，JWT 鉴权（7 天有效期）。

| 模块 | 功能 |
|------|------|
| 仪表盘 | 文章/说说/评论数量、总浏览量、今日访客 |
| 文章管理 | 新建/编辑/删除、Markdown 实时预览、Markdown 文件上传（支持 frontmatter） |
| 说说管理 | 新建/编辑/删除、心情标签 |
| 评论管理 | 全部评论列表、搜索、级联删除 |
| 友链管理 | 申请列表、审批（通过/拒绝） |
| 访问统计 | PV/UV 趋势图、每日数据 |

**实时数据同步**：后台发布内容后，前台通过共享 Cloudflare KV 立即读取（约 5 秒最终一致性延迟）。

### 其他功能

- **Live2D 看板娘**：可切换模型、互动提示、工具按钮
- **主题系统**：暗色 / 亮色切换
- **图片优化**：WebP 格式、懒加载、异步解码、背景图预加载
- **路由优化**：Lazy Loading + 路由 chunk 预加载 + 淡入过渡动画
- **设置面板**：背景切换、鼠标特效（点击粒子/拖尾/季节/星爆）、自动轮播开关

## 技术栈

| 分类 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript 5 |
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
├── functions/                     # Cloudflare Pages Functions（后端 API）
│   ├── admin/[[path]].ts          #   后台管理 API（JWT 鉴权 + CRUD）
│   ├── local-api/[[path]].ts      #   前台 API（评论 + 统计 + 友链 + 音乐代理）
│   ├── local-api/articles.ts      #   文章列表端点
│   ├── local-api/shuoshuo.ts      #   说说列表端点
│   ├── music/[[path]].ts          #   网易云音乐代理
│   ├── api/[[path]].ts            #   第三方 API 代理
│   ├── kuaidi/[[path]].ts         #   快递查询代理
│   └── uapis/[[path]].ts          #   API 聚合代理
├── public/                        # 静态资源
│   ├── avatars/                   #   评论用户头像（WebP）
│   ├── bg/                        #   背景图片（WebP）
│   └── live2d/                    #   Live2D 看板娘资源
├── server/
│   └── local-api.cjs              # 本地开发 API（评论 + 统计 + 友链 + 音乐代理）
├── src/
│   ├── components/
│   │   ├── admin/                 #   后台路由守卫
│   │   ├── atoms/                 #   原子组件（按钮、主题切换、背景设置）
│   │   ├── background/            #   动态背景（双层淡入，无黑屏）
│   │   ├── danmaku/               #   弹幕组件
│   │   ├── home/                  #   首页组件（30+）
│   │   ├── layout/                #   布局（Header / Footer / Layout）
│   │   ├── molecules/             #   分子组件（评论、Live2D）
│   │   └── music/                 #   音乐播放器组件
│   ├── data/                      # 静态数据（文章、说说、友链、歌单、背景）
│   ├── hooks/                     # 自定义 Hooks（音频、主题、弹幕、Toast）
│   ├── pages/                     # 页面组件
│   │   ├── admin/                 #   后台管理页面
│   │   ├── Home.tsx               #   首页
│   │   ├── Music.tsx              #   音乐
│   │   ├── My.tsx                 #   个人中心（含番组）
│   │   └── ...                    #   其他页面
│   ├── store/                     # Zustand 状态管理
│   ├── types/                     # TypeScript 类型定义
│   └── utils/                     # 工具函数
├── vite.config.ts                 # Vite 配置（含本地 API 插件）
└── wrangler.toml                  # Cloudflare 配置
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

### Cloudflare Pages 部署

1. **Fork 本仓库**

2. **创建 Cloudflare Pages 项目**
   ```bash
   npx wrangler pages project create bob
   ```

3. **创建 KV 命名空间**
   ```bash
   npx wrangler kv namespace create COMMENTS_KV
   ```

4. **更新 `wrangler.toml`** 中的 KV namespace ID

5. **设置环境变量**（可选，覆盖默认值）
   ```bash
   # 后台管理密码（默认 123456）
   npx wrangler pages secret put ADMIN_PASSWORD

   # JWT 签名密钥（默认内置值）
   npx wrangler pages secret put JWT_SECRET
   ```

6. **部署**
   ```bash
   npm run build
   npx wrangler pages deploy dist --project-name=bob
   ```

### 配置说明

| 配置项 | 位置 | 说明 |
|--------|------|------|
| `COMMENTS_KV` | wrangler.toml | KV 命名空间，存储评论、统计、文章、友链数据 |
| `ADMIN_PASSWORD` | 环境变量 | 后台登录密码（默认 `123456`） |
| `JWT_SECRET` | 环境变量 | JWT 签名密钥（默认内置值） |
| 管理员邮箱 | 代码中配置 | 使用该邮箱评论时获得管理员权限 |
| 音乐 API（本地） | `server/local-api.cjs` | `http://47.104.189.4/music` |
| 音乐 API（线上） | `functions/local-api/[[path]].ts` | `https://api.injahow.cn/meting` |

## API 端点

### 前台 API（`/local-api/*`）

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/local-api/comments` | 评论列表（分页/排序） |
| POST | `/local-api/comments` | 发表评论 |
| POST | `/local-api/comments/like` | 点赞/取消 |
| POST | `/local-api/comments/delete` | 删除评论（本人或管理员） |
| GET | `/local-api/comments/count` | 批量评论计数 |
| GET | `/local-api/articles` | 文章列表（KV） |
| GET | `/local-api/shuoshuo` | 说说列表（KV） |
| GET | `/local-api/friends` | 已通过友链列表 |
| POST | `/local-api/friend-applications` | 提交友链申请 |
| GET | `/local-api/friend-applications` | 查询我的申请 |
| GET | `/local-api/friend-applications/approved` | 已通过友链 |
| GET | `/local-api/stats` | 访问统计 |
| POST | `/local-api/stats/visit` | 记录访问 |
| GET | `/local-api/music-stream` | 音乐流式代理 |

### 后台 API（`/admin/*`）

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/admin/login` | 登录（密码 → JWT） |
| GET | `/admin/auth` | 验证 token |
| GET | `/admin/dashboard` | 概览数据 |
| GET/POST/PUT/DELETE | `/admin/articles` | 文章 CRUD |
| POST | `/admin/articles/upload` | Markdown 文件上传 |
| GET/POST/PUT/DELETE | `/admin/shuoshuo` | 说说 CRUD |
| GET/DELETE | `/admin/comments` | 评论管理 |
| GET | `/admin/friends` | 友链申请列表 |
| PUT | `/admin/friends/status` | 审批友链 |
| GET | `/admin/stats` | 统计详情 |

## 性能优化

- **图片优化**：WebP 格式转换（体积减少 62%-96%）、懒加载、异步解码
- **路由优化**：React.lazy 懒加载 + 路由 chunk 预加载 + 淡入过渡动画
- **背景切换**：`<img>` 双层淡入 + `img.decode()` 预解码 + `will-change` GPU 合成 + 强制样式刷新，彻底消除黑屏
- **背景图加载**：仅预加载当前 + 下一张，避免全部加载
- **音乐播放**：歌曲时长预加载缓存，离线兜底数据
- **内存管理**：setTimeout 清理、AbortController 请求取消

## License

MIT License
