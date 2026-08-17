---
title: Cloudflare 全景指南：从 CDN 加速到边缘计算的完整攻略
tags: [Cloudflare, CDN, Workers, Pages, KV, 边缘计算, 运维]
category: 技术
cover: https://picsum.photos/seed/cloudflare-cover/1200/600
excerpt: 系统讲清 Cloudflare 的核心能力：CDN 加速与 DNS、WAF 安全防护、Workers/Pages 边缘计算、KV/D1/R2 存储方案，以及免费额度、实战部署、性能调优与避坑指南，一篇搞懂怎么用好这套"互联网基础设施"。
---

## 前言

如果你有一个网站、一个 API 服务、或者一个前端应用，你几乎一定会遇到这些问题：访问慢、被攻击、SSL 证书麻烦、服务器扛不住突发流量。Cloudflare 就是来解决这些问题的——它不止是一个 CDN，而是一整套覆盖 DNS、安全防护、边缘计算、存储、分析的互联网基础设施平台。

更关键的是，它的免费额度极其慷慨：无限流量 CDN、免费 SSL、每月 10 万次 Workers 请求、1GB KV 存储。个人项目几乎零成本就能跑起来。这篇文章系统讲清楚：**Cloudflare 能做什么、各功能怎么用、开发者怎么接 Workers/Pages 边缘计算，以及实战中的避坑经验。**

![配图](https://picsum.photos/seed/cloudflare-intro/1000/500)

## 一、Cloudflare 是什么

简单说，Cloudflare 是一个位于用户和你的服务器之间的全球分布式网络。它在全球 300+ 城市部署了边缘节点，用户的请求先到离他最近的 Cloudflare 节点，再由 Cloudflare 转发到你的源站。

这个架构同时解决了三个问题：

1. **加速**：静态资源在边缘节点缓存，用户就近获取，不用回源
2. **安全**：隐藏源站 IP，DDoS 攻击先被 Cloudflare 挡住
3. **可靠**：源站挂了，Cloudflare 还能 serving 缓存页面或自定义错误页

| 能力域 | 核心产品 | 免费额度 |
|--------|----------|----------|
| CDN & DNS | DNS 解析、CDN 缓存、SSL | 无限流量 |
| 安全 | WAF、DDoS 防护、Bot 管理 | 基础规则 |
| 边缘计算 | Workers、Pages | 10 万请求/天 |
| 存储 | KV、D1、R2、Durable Objects | KV 1GB / D1 5GB / R2 10GB |
| 分析 | Web Analytics、Logs | 基础分析 |
| 网络 | Tunnel、WARP、Zero Trust | 50 用户 |

## 二、CDN 加速与 DNS

### DNS 解析

Cloudflare 的 DNS 解析是全球最快的之一（平均 < 10ms）。把域名的 NS 记录切到 Cloudflare，就能用它的 DNS 服务。

```
# DNS 记录示例
类型    名称    内容                代理状态
A       @      1.2.3.4            Proxied（橙色云）
CNAME   www    yourdomain.com     Proxied（橙色云）
CNAME   api    api.herokuapp.com  Proxied（橙色云）
```

> 关键概念：**Proxied（橙色云）** = 流量经过 Cloudflare 代理（享受 CDN/安全防护）；**DNS only（灰色云）** = 只做 DNS 解析，流量直达源站。

### CDN 缓存

开启代理后，静态资源（图片、CSS、JS）会自动在边缘节点缓存。你可以通过 Page Rules 或 Cache Rules 精细控制：

```
# 页面规则示例
URL 匹配: yourdomain.com/assets/*
缓存级别: Cache Everything
边缘 TTL: 1 month
浏览器 TTL: 1 year
```

**缓存控制最佳实践：**

- 带文件哈希的静态资源（如 `app.a1b2c3d4.js`）设为 `immutable`，长期缓存
- HTML 文件设 `no-cache` 或短 TTL，确保内容更新及时
- API 响应默认 `no-store`，除非是只读公共数据

```http
# 推荐的 Cache-Control 头
# 静态资源（带哈希）
Cache-Control: public, max-age=31536000, immutable

# HTML
Cache-Control: public, max-age=0, must-revalidate

# API（动态数据）
Cache-Control: no-store, no-cache, must-revalidate
```

### SSL 证书

Cloudflare 提供免费 SSL 证书，自动签发和续期。有四种模式：

| 模式 | 安全性 | 说明 |
|------|--------|------|
| Off | 无 | 不加密，不推荐 |
| Flexible | 中 | 用户↔CF 加密，CF↔源站不加密 |
| Full | 中高 | 全程加密，但源站证书可以自签 |
| Full (strict) | 高 | 全程加密，源站证书必须受信 |

> 推荐使用 **Full (strict)**。源站可以用 Let's Encrypt 免费证书，配合 Cloudflare Origin CA 证书更佳。

![配图](https://picsum.photos/seed/cloudflare-cdn/1000/500)

## 三、安全防护

### DDoS 防护

Cloudflare 的 DDoS 防护是免费的、自动的、无限的。无论是网络层（L3/L4）还是应用层（L7）攻击，都会被边缘节点自动拦截，不需要你配置任何东西。

### WAF（Web 应用防火墙）

WAF 可以根据规则过滤恶意请求。免费版提供基础托管规则集，付费版可自定义规则。

```
# WAF 自定义规则示例
匹配: (http.request.uri.path contains "/wp-admin") and (not ip.src in $trusted_ips)
动作: Block
```

### Bot 管理

通过 JS Challenge、Managed Challenge、hCaptcha 等方式拦截爬虫和自动化工具。对 API 接口和登录页面特别有用。

### Access（零信任）

Cloudflare Zero Trust 可以在不暴露源站 IP 的情况下，通过身份验证访问内部服务。免费版支持 50 个用户。

```yaml
# Access 应用配置示例
应用名称: 内部管理后台
域名: admin.yourdomain.com
认证策略:
  - 邮箱后缀: @yourcompany.com
  - 动作: Allow
```

## 四、Workers：边缘计算

Workers 是 Cloudflare 的边缘计算平台。你的代码部署到全球所有边缘节点，用户的请求由最近的节点直接处理，延迟极低。

### Workers 的特点

- **全球部署**：代码推一次，自动部署到 300+ 城市
- **冷启动快**：基于 V8 isolate，冷启动 < 5ms（不是容器/VM）
- **语言支持**：JavaScript、TypeScript、Rust、Python
- **免费额度**：每天 10 万次请求

### Hello World

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    return new Response(`Hello from ${url.hostname}!`, {
      headers: { 'Content-Type': 'text/plain' },
    })
  },
}
```

### 实战：API 代理 + 缓存

一个常见场景：用 Workers 做第三方 API 的代理，同时加上缓存和鉴权。

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cache = caches.default
    const cacheKey = new Request(request.url, request)
    
    // 1. 检查缓存
    const cached = await cache.match(cacheKey)
    if (cached) return cached

    // 2. 请求上游 API
    const url = new URL(request.url)
    const apiUrl = `https://api.example.com${url.pathname}`
    const resp = await fetch(apiUrl, {
      headers: { 'Authorization': `Bearer ${env.API_TOKEN}` },
    })

    // 3. 缓存响应（5 分钟）
    const data = await resp.text()
    const newResp = new Response(data, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    })
    newResp.headers.set('Cache-Control', 'public, max-age=300')
    await cache.put(cacheKey, newResp.clone())
    return newResp
  },
}
```

### wrangler CLI

Workers 的开发、测试、部署都通过 `wrangler` CLI 完成。

```bash
# 安装
npm install -g wrangler

# 登录
wrangler login

# 创建项目
wrangler init my-worker

# 本地开发
wrangler dev

# 部署
wrangler deploy

# 查看日志
wrangler tail
```

### wrangler.toml 配置

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-11-01"

# 绑定 KV
[[kv_namespaces]]
binding = "MY_KV"
id = "your-kv-namespace-id"

# 绑定 D1 数据库
[[d1_databases]]
binding = "MY_DB"
database_name = "my-database"
database_id = "your-database-id"

# 环境变量
[vars]
API_URL = "https://api.example.com"

# 密钥（通过 wrangler secret put 设置）
# wrangler secret put API_TOKEN
```

![配图](https://picsum.photos/seed/cloudflare-workers/1000/500)

## 五、Pages：静态站点 + 全栈

Pages 是 Cloudflare 的静态站点托管服务，类似 Vercel / Netlify。但它不止是静态托管——通过 Pages Functions，你可以写服务端代码，实现全栈应用。

### Pages 的优势

- **自动 CI/CD**：连接 GitHub/GitLab，推送代码自动构建部署
- **全球 CDN**：静态资源自动分发到所有边缘节点
- **免费额度**：每月 500 次构建、无限请求、无限带宽
- **Pages Functions**：内置服务端能力，不需要额外部署 Workers

### 部署方式

**方式一：Git 集成（推荐）**

连接 GitHub 仓库，配置构建命令和输出目录：

```
构建命令: npm run build
输出目录: dist
环境变量: NODE_VERSION=20
```

**方式二：直接上传**

```bash
wrangler pages deploy dist --project-name=my-site
```

### Pages Functions

在项目根目录创建 `functions/` 文件夹，每个文件就是一个 API 端点：

```
项目结构:
├── dist/              # 前端构建产物
├── functions/         # 服务端 API
│   ├── api/
│   │   └── [[path]].ts  # 通配路由 /api/*
│   └── local-api/
│       └── articles.ts  # /local-api/articles
└── wrangler.toml
```

```typescript
// functions/api/articles.ts
export async function onRequestGet({ env }: { env: Env }) {
  const raw = await env.COMMENTS_KV.get('articles')
  const articles = raw ? JSON.parse(raw) : []
  
  return new Response(JSON.stringify({ list: articles }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',  // 动态数据不缓存
    },
  })
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  const body = await request.json()
  // ...写入 KV
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
```

> **路由优先级**：精确文件 > 动态参数 `[param]` > 通配 `[[path]]`。如 `/local-api/articles` 会优先匹配 `functions/local-api/articles.ts`，而非 `functions/local-api/[[path]].ts`。

### _headers 文件

在 `public/` 目录下放 `_headers` 文件，可以全局控制响应头：

```
# 静态资源长期缓存
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# API 禁止缓存
/local-api/*
  Cache-Control: no-store, no-cache, must-revalidate

# 安全头
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

### _redirects 文件

```
# SPA 回退
/*    /index.html   200
```

## 六、存储方案

Cloudflare 提供多种存储方案，各有适用场景：

| 存储 | 类型 | 特点 | 免费额度 | 适用场景 |
|------|------|------|----------|----------|
| **KV** | 键值 | 最终一致、全球读、低延迟 | 1GB / 10万读/天 | 配置、缓存、简单数据 |
| **D1** | SQLite | 强一致、SQL 查询、事务 | 5GB / 500万行读/天 | 关系型数据、CMS |
| **R2** | 对象存储 | S3 兼容、零出口费 | 10GB | 图片、视频、大文件 |
| **Durable Objects** | 有状态 | 强一致、单点协调 | 付费 | 实时协作、聊天、计数 |
| **Vectorize** | 向量 | 向量相似度搜索 | 付费 | AI/语义搜索 |
| **Queues** | 消息队列 | 异步任务、削峰 | 付费 | 批处理、通知 |

### KV 详解

KV 是最常用的存储。写入后在几秒内同步到全球所有节点，读取延迟极低。

```typescript
// 写入
await env.MY_KV.put('key', JSON.stringify({ name: 'test' }))

// 读取
const raw = await env.MY_KV.get('key')
const data = raw ? JSON.parse(raw) : null

// 删除
await env.MY_KV.delete('key')

// 列出所有 key
const list = await env.MY_KV.list()
```

> **重要：KV 是最终一致的。** 写入后约 5 秒内，不同边缘节点可能读到旧值。如果你的应用需要强一致性，用 D1 或 Durable Objects。

### D1 详解

D1 是基于 SQLite 的关系型数据库，支持完整 SQL 语法。

```bash
# 创建数据库
wrangler d1 create my-database

# 执行 SQL
wrangler d1 execute my-database --command "SELECT * FROM articles"

# 导入 schema
wrangler d1 execute my-database --file=./schema.sql
```

```typescript
// 在 Worker 中使用
const result = await env.MY_DB.prepare(
  'SELECT * FROM articles WHERE category = ? ORDER BY date DESC LIMIT ?'
).bind('技术', 10).all()
```

### R2 详解

R2 是 S3 兼容的对象存储，**零出口流量费**，适合存图片、视频等大文件。

```typescript
// 上传文件
await env.MY_BUCKET.put('images/photo.jpg', fileBody, {
  httpMetadata: { contentType: 'image/jpeg' },
})

// 读取文件
const object = await env.MY_BUCKET.get('images/photo.jpg')
return new Response(object.body, {
  headers: { 'Content-Type': 'image/jpeg' },
})
```

![配图](https://picsum.photos/seed/cloudflare-storage/1000/500)

## 七、实战：博客全栈部署

以一个真实博客为例（React + Vite 前端 + Pages Functions 后端 + KV 存储），完整部署流程：

### 项目结构

```
my-blog/
├── src/                    # React 前端
├── functions/              # Pages Functions（后端 API）
│   ├── admin/
│   │   └── [[path]].ts     # 后台管理 API
│   ├── local-api/
│   │   ├── articles.ts     # 文章列表
│   │   └── [[path]].ts     # 评论、统计等
│   └── music/
│       └── [[path]].ts     # 音乐代理
├── public/
│   ├── _headers            # 缓存策略
│   └── _redirects          # SPA 回退
├── wrangler.toml           # Cloudflare 配置
└── vite.config.ts
```

### wrangler.toml 配置

```toml
name = "my-blog"
compatibility_date = "2024-11-01"
pages_build_output_dir = "dist"

[[kv_namespaces]]
binding = "COMMENTS_KV"
id = "your-kv-namespace-id"
```

### 部署命令

```bash
# 1. 构建前端
npm run build

# 2. 部署到 Cloudflare Pages
wrangler pages deploy dist --project-name=my-blog

# 或通过 Git 集成自动部署
```

### 缓存策略（_headers）

```
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/local-api/*
  Cache-Control: no-store

/admin/*
  Cache-Control: no-store

/*.html
  Cache-Control: public, max-age=0, must-revalidate
```

### 常见架构模式

```
用户请求
  ↓
Cloudflare 边缘节点（CDN 缓存 + WAF + DDoS 防护）
  ↓
Pages（静态资源 + SPA）
  ↓
Pages Functions（API 端点）
  ↓
KV / D1 / R2（存储层）
```

## 八、性能调优

### 1. 缓存策略优化

```typescript
// 用 Cache API 在 Worker 中缓存响应
const cache = caches.default
const key = new Request(request.url, request)

let response = await cache.match(key)
if (!response) {
  response = await fetch(upstreamUrl)
  response = new Response(response.body, response)
  response.headers.set('Cache-Control', 's-maxage=300')
  await cache.put(key, response.clone())
}
return response
```

### 2. KV 读取优化

```typescript
// 批量读取：用 Promise.all 并行请求
const [articles, shuoshuo, friends] = await Promise.all([
  env.KV.get('admin_articles'),
  env.KV.get('admin_shuoshuo'),
  env.KV.get('admin_friends'),
])

// 列表查询：用 list + prefix
const list = await env.KV.list({ prefix: 'article:' })
```

### 3. 减少冷启动

- Workers 本身冷启动极快（V8 isolate），但如果绑定了过多资源，首次请求会慢
- 把不常用的绑定拆到单独 Worker
- 用 `wrangler tail` 监控慢请求

### 4. 图片优化

```typescript
// 用 Cloudflare Images 或 Image Resizing
// 通过 URL 参数动态调整图片大小
const imageUrl = `https://yourdomain.com/cdn-cgi/image/width=800,quality=80/photo.jpg`
```

## 九、免费额度与定价

| 产品 | 免费额度 | 超出后价格 |
|------|----------|------------|
| CDN | 无限带宽 | 免费 |
| DNS | 无限查询 | 免费 |
| Workers | 10 万请求/天 | $5/月 = 1000 万请求 |
| Pages | 无限请求 + 500 次构建/月 | 超出构建 $0.5/次 |
| KV | 1GB + 10 万读/天 + 1000 写/天 | $0.50/GB/月 |
| D1 | 5GB + 500 万行读/天 + 10 万行写/天 | $0.75/GB/月 |
| R2 | 10GB + 100 万 A 类操作/月 | $0.015/GB/月 |
| Zero Trust | 50 用户 | $7/用户/月 |

> **个人项目几乎可以零成本运行。** 一个博客用 Pages + KV，完全在免费额度内。

## 十、避坑指南

### 1. KV 最终一致性

```typescript
// ❌ 错误：写入后立即读取
await env.KV.put('counter', '1')
const val = await env.KV.get('counter')  // 可能还是旧值

// ✅ 正确：写入后等待几秒，或用 Durable Objects 保证强一致
await env.KV.put('counter', '1')
// 等待 2-5 秒再读，或接受短暂不一致
```

### 2. Pages Functions 路由冲突

```
# 文件结构
functions/
  local-api/
    articles.ts        # 处理 /local-api/articles
    [[path]].ts        # 处理 /local-api/*

# articles.ts 会覆盖 [[path]].ts 中对 /articles 的处理
# 两个文件中不要重复定义相同路由
```

### 3. Cache-Control 头遗漏

```typescript
// ❌ 没有设置 Cache-Control，行为不确定
return new Response(JSON.stringify(data), {
  headers: { 'content-type': 'application/json' },
})

// ✅ 动态数据明确禁止缓存
return new Response(JSON.stringify(data), {
  headers: {
    'content-type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  },
})
```

### 4. 环境变量 vs Secrets

```toml
# wrangler.toml 中的 [vars] 是明文，会暴露在代码仓库
[vars]
API_URL = "https://api.example.com"  # 这个可以公开

# 敏感信息用 secrets
# wrangler secret put API_TOKEN
# 在代码中通过 env.API_TOKEN 访问
```

### 5. 本地开发 vs 线上差异

```bash
# 本地开发用 wrangler dev --local
wrangler dev --local

# 本地的 KV 数据和线上是隔离的
# 需要通过 wrangler kv 导入种子数据
wrangler kv key put --binding=MY_KV "seed_key" "seed_value" --local
```

### 6. 跨域配置

```typescript
// Pages Functions 中处理 CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders })
}

export async function onRequestGet({ request }) {
  const data = await fetchData()
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
```

### 7. 静态资源路径问题

```typescript
// SPA 部署后，/article/123 等前端路由需要回退到 index.html
// 在 public/_redirects 中配置：
// /*  /index.html  200
```

## 十一、Tunnel：内网穿透

Cloudflare Tunnel 可以把本地服务安全地暴露到公网，不需要开放端口、不需要公网 IP。

```bash
# 安装 cloudflared
npm install -g cloudflared

# 快速隧道（临时，无需域名）
cloudflared tunnel --url http://localhost:3000

# 命名隧道（持久，绑定域名）
cloudflared tunnel create my-tunnel
cloudflared tunnel route dns my-tunnel dev.yourdomain.com
cloudflared tunnel run my-tunnel
```

> 用途：本地开发预览、家庭服务器暴露、内部服务公网访问，全部走 Cloudflare 安全通道。

## 十二、监控与分析

### Web Analytics

免费的隐私友好的网站分析，不需要 Cookie，不侵犯用户隐私。在页面加一行 JS 即可：

```html
<script defer src='https://static.cloudflareinsights.com/beacon.min.js'
  data-cf-beacon='{"token": "your-token"}'></script>
```

### wrangler tail

实时查看 Workers/Pages Functions 的日志：

```bash
# 实时日志
wrangler tail

# 过滤
wrangler tail --status error
wrangler tail --method POST
```

### 分析平台（Analytics Engine）

用 Workers 写入自定义指标，在 Cloudflare Dashboard 中可视化：

```typescript
env.MY_ANALYTICS.writeDataPoint({
  blobs: [request.method, url.pathname],
  doubles: [responseTime],
  indexes: [url.hostname],
})
```

## 总结

Cloudflare 已经远超传统 CDN 的范畴，它是一个完整的边缘云平台。对个人开发者和小团队来说，**免费额度足够跑一个全栈应用**：Pages 托管前端、Pages Functions 做后端 API、KV/D1 做存储、R2 存文件、Tunnel 做内网穿透。

上手路径建议：先把域名 DNS 切到 Cloudflare（免费 CDN + SSL），然后用 Pages 部署静态站点，接着加 Pages Functions 做动态 API，最后按需引入 KV/D1/R2。每一步都有免费额度托底，试错成本为零。配合本文的避坑指南和性能调优建议，你完全可以用它搭建一个快速、安全、零成本的生产级应用。
