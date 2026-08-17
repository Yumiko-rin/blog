# -*- coding: utf-8 -*-
"""
生成博客三篇文章，并写入全部 4 个存储位置：
  - server-data/admin-articles.json   (本地运行数据，前台实际读取)
  - server/seed/articles.json         (种子，server-data 为空时填充)
  - src/data/articles.ts              (静态兜底 + git 源码，保留底部辅助函数)
  - functions/seed/articles.ts        (Cloudflare KV 种子，自动生成格式)
文章风格沿用现有博客：前言 + 结构化章节 + 代码块/表格 + 配图。
"""

import json
import os

ROOT = r"E:\项目\博客"

DATE = "2026-08-17"

# ---------------------------------------------------------------------------
# 文章 1：DeepSeek 使用全攻略
# ---------------------------------------------------------------------------
deepseek_content = r"""## 前言

2025 年初，一家叫 DeepSeek（深度求索）的中国 AI 公司横空出世。它的 V3 通用模型和 R1 推理模型，在多项基准上追平甚至超过同级别的国外闭源模型，而 API 价格只有零头。更关键的是——它把模型权重开源了。

这意味着你既可以白嫖它的网页版，也可以用几块钱跑一大堆 API 调用，还能把模型下载到自己机器上离线跑。这篇文章就系统讲清楚：**普通人怎么用 DeepSeek，开发者怎么接 API，以及有哪些好用的第三方工具和插件能把它用出花来。**

![配图](https://picsum.photos/seed/deepseek-ui/1000/500)

## 一、网页端和 App：开箱即用

最简单的方式，不用写一行代码。

- 官网：[chat.deepseek.com](https://chat.deepseek.com)（免费）
- App：应用商店搜「DeepSeek」

几个核心功能：

1. **深度思考（R1）**：打开这个开关，模型会先自己推理一遍（你能看到思考过程），再给答案。数学、代码、逻辑题一定要开。
2. **联网搜索**：让模型基于最新网页回答，查资料、问时事很方便。
3. **文件上传**：支持 PDF、Word、Excel、图片，让它帮你总结、翻译、提取表格。
4. **对话历史**：登录后云端同步，多端可看。

> 小技巧：问复杂问题时，先让它「列出思考步骤」，再逐步追问，比一次性扔一个大问题效果好得多。

## 二、API 调用：几块钱玩转

DeepSeek 的 API 完全兼容 OpenAI 格式，迁移成本几乎为零。

### 获取密钥

1. 打开 [platform.deepseek.com](https://platform.deepseek.com)，注册充值（新用户有赠送额度）。
2. 在「API keys」里创建一个 key。

### Python 调用示例

```python
from openai import OpenAI

client = OpenAI(
    api_key="你的KEY",
    base_url="https://api.deepseek.com",
)

# 用推理模型 R1
resp = client.chat.completions.create(
    model="deepseek-reasoner",
    messages=[
        {"role": "system", "content": "你是一个严谨的助手。"},
        {"role": "user", "content": "用 Python 写一个快速排序，并解释时间复杂度。"},
    ],
)
print(resp.choices[0].message.content)
```

### 模型怎么选

| 模型 | 适用场景 | 特点 |
|------|----------|------|
| `deepseek-chat`（V3） | 日常对话、写作、代码补全 | 快、便宜、通用 |
| `deepseek-reasoner`（R1） | 数学、逻辑推理、复杂代码 | 会先思考，质量高、稍慢 |

> 价格参考：V3 输入约 ¥1/百万 token，R1 稍贵但依然远低于同级闭源模型。具体以官网为准。

### curl 测试

```bash
curl https://api.deepseek.com/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 你的KEY" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

## 三、本地部署：数据不出门

如果你在意隐私，或者想跑自己的服务，可以把开源权重拉到本地。

- **Ollama**（最省事）：`ollama run deepseek-r1:7b` 一条命令拉起 7B 蒸馏版。
- **vLLM / llama.cpp**：适合需要高并发、量化部署的场景。
- **Docker 一键**：社区有大量封装好的镜像，搜 `deepseek-r1 docker` 即可。

```bash
# 用 Ollama 跑 7B 版本（需要约 4-5G 显存/内存）
ollama run deepseek-r1:7b
```

本地部署的代价是硬件：7B 勉强能跑，32B/70B 需要不错的显卡。普通笔记本建议用云端 API，把重活交给服务器。

## 四、好用的工具与插件推荐

光用官方网页有点浪费。下面按场景推荐一批能显著提升效率的工具。

### 1. 桌面 / 网页客户端

| 工具 | 特点 | 适合谁 |
|------|------|--------|
| **Chatbox** | 开源、跨平台、支持多种模型 | 想要一个干净聊天界面的人 |
| **LobeChat** | 现代 UI、插件系统、支持语音 | 喜欢折腾界面和扩展的人 |
| **Open WebUI** | 自托管、功能全、可接 Ollama | 本地部署玩家 |
| **Cherry Studio** | 多模型聚合、知识库 | 重度使用者 |

### 2. 编辑器 / IDE 集成

- **Continue**（VS Code / JetBrains）：把 DeepSeek 接进编辑器，边写边问。
- **Cline / Roo Code**：Agent 型编程助手，能读文件、跑命令、改代码。
- **Cursor**：选 DeepSeek 作底层模型，性价比拉满。

### 3. 浏览器插件

- **沉浸式翻译**：用 DeepSeek 做网页/PDF 双语翻译。
- **各类「侧边栏 AI」插件**：选中文字右键提问，DeepSeek 当后端。

### 4. 自动化与工作流

- **Dify / n8n**：把 DeepSeek 接进工作流，做自动摘要、客服、批处理。
- **MCP 服务器**：让支持 MCP 的客户端（如 Claude Desktop、Cursor）直接调用 DeepSeek 能力。

![配图](https://picsum.photos/seed/deepseek-tools/1000/500)

### 5. 国内稳定接入

- **硅基流动 / 腾讯云 AI 等国内平台**：提供 DeepSeek 的国内稳定接入点，延迟低、无需翻墙。

## 五、避坑与最佳实践

- **R1 不要和工具调用混用过度**：推理模型的 tool calling 支持有限，复杂 agent 先用 V3 试探。
- **敏感数据走本地或国内合规节点**，别把公司内部文档直接丢公网 API。
- **长上下文记得截断**：虽然支持长窗口，但超长对话成本和延迟都会涨。
- **提示词要具体**：DeepSeek 对清晰指令响应极佳，模糊问题会得到泛泛回答。

## 总结

DeepSeek 把「好用的强模型」和「用得起」这两件事同时做到了。日常用网页版、开发接 API、隐私党本地跑——三种姿势总有一种适合你。再配合上面这些客户端、编辑器插件和自动化工具，它能从「一个聊天框」变成你工作流里真正的主力引擎。
"""

# ---------------------------------------------------------------------------
# 文章 2：Markdown 编写完全指南
# ---------------------------------------------------------------------------
markdown_content = r"""## 前言

Markdown 是一种「用纯文本写格式」的轻量标记语言。你不用点工具栏，只要敲几个符号，就能写出带标题、列表、表格、代码的文档。它几乎是技术圈、笔记软件、博客的通用货币。

这篇文章从语法到规范，再到效率工具，帮你把 Markdown 用顺手。

![配图](https://picsum.photos/seed/markdown-syntax/1000/500)

## 一、基础语法

### 标题

用 `#` 的数量表示层级，`#` 是一级标题，`##` 是二级，最多到六级。

```markdown
# 一级标题
## 二级标题
### 三级标题
```

### 强调与文本

```markdown
**加粗**、*斜体*、***加粗斜体***
~~删除线~~
`行内代码`
```

### 列表

无序用 `-` 或 `*`，有序用数字加点：

```markdown
- 苹果
- 香蕉
  - 进口香蕉（二级缩进）

1. 第一步
2. 第二步
```

### 链接与图片

```markdown
[链接文字](https://example.com)
![图片说明](https://example.com/pic.png)
```

### 引用与分割线

```markdown
> 这是一句引用
> 可以换行

---
```

### 表格

```markdown
| 姓名 | 年纪 | 城市 |
|------|------|------|
| 小明 | 18   | 北京 |
| 小红 | 20   | 上海 |
```

## 二、进阶语法（GFM 等扩展）

很多平台（GitHub、Obsidian、Typora）支持扩展语法：

- **任务列表**：`- [ ] 待办` / `- [x] 已完成`
- **删除线**：`~~文字~~`
- **表格对齐**：`:---` 左对齐，`---:` 右对齐，`:---:` 居中
- **脚注**：`正文[^1]` 然后 `[^1]: 脚注内容`
- **数学公式**（KaTeX / MathJax）：`$E=mc^2$` 行内，`$$...$$` 块级
- **流程图**（Mermaid）：用 ` ```mermaid ` 代码块画时序图、流程图
- **目录**：部分编辑器支持 `[TOC]` 自动生成

```mermaid
graph LR
  A[写 Markdown] --> B[渲染成 HTML]
  B --> C[发布到博客]
```

## 三、写作规范与最佳实践

1. **文件名用连字符**：`2026-08-17-my-post.md`，别用空格和中文。
2. **标题层级别跳级**：`#` 下面直接 `###` 会破坏大纲，按顺序来。
3. **图片统一管理**：建个 `assets/` 或 `images/` 目录，别把图散落各处。
4. **用 frontmatter 存元信息**：YAML 头存标题、日期、标签、分类。

```markdown
---
title: 我的文章
date: 2026-08-17
tags: [写作, Markdown]
---
```

5. **中英文之间加空格**：`打开 Markdown 文件` 比 `打开Markdown文件` 更易读（很多工具能自动格式化）。
6. **代码块一定标语言**：` ```python ` 才能高亮，也方便读者复制。

## 四、好用的编写工具推荐

| 工具 | 平台 | 特点 |
|------|------|------|
| **Typora** | 桌面 | 所见即所得，体验最顺滑 |
| **Obsidian** | 全平台 | 双链 + Markdown，知识库神器 |
| **VS Code** | 桌面 | 装 Markdown 插件后功能全能 |
| **MarkText** | 桌面 | 开源、清爽、免费 |
| **StackEdit** | 网页 | 免安装、支持云同步 |
| **思源笔记** | 全平台 | 中文友好、Markdown 兼容 |

### VS Code 必备插件

- **Markdown All in One**：快捷键、目录、预览一体化
- **markdownlint**：实时检查格式规范
- **Paste Image**：剪贴板图片直接粘贴成文件
- **Markdown Preview Enhanced**：支持 Mermaid、公式、导出

![配图](https://picsum.photos/seed/markdown-tools/1000/500)

## 五、常见坑

- **表格前后要有空行**：表格前后必须有空行，否则渲染不出来。
- **特殊字符转义**：想显示字面 `*`，用 `\*` 转义。
- **列表里嵌代码块**：代码块要比列表多缩进（通常 4 个空格）。
- **图片路径**：相对路径在别的平台可能失效，图床或绝对路径更稳。

## 总结

Markdown 的精髓是「专注内容，格式交给符号」。把基础语法练熟，再配合 Typora / Obsidian / VS Code 这类工具，写文档、做笔记、发博客都会又快又干净。规范不用死记，markdownlint 会帮你养成好习惯。
"""

# ---------------------------------------------------------------------------
# 文章 3：Obsidian 使用全攻略
# ---------------------------------------------------------------------------
obsidian_content = r"""## 前言

Obsidian 是一款「本地优先」的笔记软件。你的所有笔记就是一堆纯文本 Markdown 文件，存在自己硬盘上，不依赖任何云。它最厉害的地方是**双向链接**——笔记之间可以互相引用，自动织成一张知识网络。

这篇文章讲清楚：怎么上手 Obsidian，怎么用它建立自己的知识体系，以及哪些插件值得装。

![配图](https://picsum.photos/seed/obsidian-ui/1000/500)

## 一、基础使用

### 创建仓库（Vault）

打开 Obsidian，新建或选择一个文件夹作为「仓库」。这个文件夹里的 `.md` 文件就是你的全部笔记。

> 一个仓库 = 一个主题的资料。可以建「工作」「学习」「生活」多个仓库分开管理。

### 写笔记与双链

```markdown
# 我的读书笔记

读了《卡片笔记写作法》，核心是用 [[Zettelkasten]] 方法做笔记。
相关见 [[2026-08-17 阅读记录]]。
```

输入 `[[` 就能链接到另一篇笔记，不存在的会标灰，点击即创建。这就是「双向链接」——在 A 里链了 B，B 里也能看到「被 A 引用」。

### 标签与图谱

- 用 `#标签` 分类，如 `#读书/方法论`。
- 左侧「图谱」视图把所有笔记和链接画成网络，一眼看清知识结构。

## 二、核心功能拆解

| 功能 | 作用 | 使用场景 |
|------|------|----------|
| 双向链接 `[[ ]]` | 笔记互链 | 建立知识关联 |
| 块引用 `![[笔记#^块]]` | 引用某段 | 复用内容 |
| 标签 `#` | 横向分类 | 跨主题检索 |
| MOC（内容地图） | 用一篇笔记聚合相关笔记 | 做索引页 |
| 关系图谱 | 可视化网络 | 发现盲区 |

### 什么是 MOC

MOC（Map of Content）是一篇「目录型笔记」，把某一主题下的笔记用链接聚起来：

```markdown
# 编程学习 MOC

- [[Python 基础]]
- [[算法笔记]]
- [[项目实战]]
```

它比文件夹更灵活——一篇笔记可以出现在多个 MOC 里。

## 三、必备插件推荐

Obsidian 的社区插件生态极其丰富，下面按「新手必装」到「进阶」排列。

### 新手必装

- **Templater**：用模板快速新建笔记，支持变量和脚本。
- **Obsidian Git**：把仓库推到 GitHub，自动备份、多端同步。
- **Dataview**：用类 SQL 查询笔记，自动生成动态列表（如「本周读书」）。
- **Omnisearch**：全文模糊搜索，比自带搜索强太多。

### 效率增强

- **QuickAdd**：一键捕获灵感、批量创建笔记。
- **Calendar / Periodic Notes**：按日/周/月记日志，时间线管理。
- **Kanban**：把笔记变成看板，做任务管理。
- **Excalidraw**：在笔记里画手绘风流程图、思维导图。

![配图](https://picsum.photos/seed/obsidian-plugins/1000/500)

### 美化与输出

- **Style Settings / Hider**：自定义界面外观、隐藏多余元素。
- **Mindmap**：把大纲一键变思维导图。
- **Quartz / Obsidian Publish**：把仓库发布成静态网站（博客）。

```markdown
# Dataview 示例：列出所有带 #读书 标签、且含「评分」属性的笔记
TABLE 评分 FROM #读书 SORT 评分 DESC
```

## 四、推荐工作流

1. **收集**：用 QuickAdd 或 Daily Note 随手记灵感。
2. **加工**：把碎片整理成独立笔记，用 `[[ ]]` 连到相关主题。
3. **聚合**：用 MOC 把同主题笔记串起来。
4. **回顾**：靠图谱和 Dataview 定期复习、发现关联。
5. **备份**：Obsidian Git 自动同步到 GitHub。

> 方法学参考：Zettelkasten（卡片盒）强调「原子化笔记 + 强连接」，PARA 强调「按项目/领域/资源/归档」组织。两者都能在 Obsidian 里落地。

## 五、避坑指南

- **别把仓库放云盘同步目录**（如 iCloud/OneDrive 根目录），容易冲突锁文件；要用 Obsidian Git 或官方 Sync。
- **插件别贪多**：装十几个就够，否则卡顿且难维护。
- **定期备份**：Git 提交或导出 zip，防止误删。
- **大文件别塞进仓库**：图片多了用外部图床或专门目录。

## 总结

Obsidian 的魅力在于「你的数据永远属于你」，又能通过双链把零散笔记编织成知识网络。从基础写作 + 双链起步，逐步加上 Templater、Dataview、Git 三件套，再按自己的节奏补充插件，你会发现它不只是一个笔记软件，而是一个可以陪伴多年的第二大脑。
"""

# ---------------------------------------------------------------------------
# 组装文章列表
# ---------------------------------------------------------------------------
articles = [
    {
        "id": "deepseek-usage-plugins",
        "slug": "deepseek-usage-plugins",
        "title": "DeepSeek 使用全攻略：从网页到 API，附 10+ 好用工具与插件推荐",
        "excerpt": "系统讲清 DeepSeek 的三种用法：网页/App 开箱即用、OpenAI 兼容 API 几块钱调用、本地开源权重部署；并附桌面客户端、IDE 插件、浏览器扩展、自动化工作流等好用工具推荐。",
        "content": deepseek_content,
        "cover": "https://picsum.photos/seed/deepseek-cover/1200/600",
        "category": "软件",
        "tags": ["DeepSeek", "AI", "大模型", "API", "工具推荐", "插件"],
        "date": DATE,
        "views": 0,
        "likes": 0,
        "isPinned": False,
    },
    {
        "id": "markdown-writing-guide",
        "slug": "markdown-writing-guide",
        "title": "Markdown 编写完全指南：语法、规范与效率工具推荐",
        "excerpt": "从基础语法（标题/列表/表格/代码）到进阶扩展（任务列表/Mermaid/公式），再到写作规范与 Typora、Obsidian、VS Code 等效率工具推荐，一篇搞懂怎么写好 Markdown。",
        "content": markdown_content,
        "cover": "https://picsum.photos/seed/markdown-cover/1200/600",
        "category": "技术",
        "tags": ["Markdown", "写作", "语法", "效率工具", "排版", "笔记"],
        "date": DATE,
        "views": 0,
        "likes": 0,
        "isPinned": False,
    },
    {
        "id": "obsidian-usage-plugins",
        "slug": "obsidian-usage-plugins",
        "title": "Obsidian 使用全攻略：双链笔记法与必备插件推荐",
        "excerpt": "本地优先的双向链接笔记软件 Obsidian 上手指南：仓库管理、双链与 MOC、图谱视图，以及 Templater、Dataview、Git、Omnisearch 等必备社区插件与推荐工作流。",
        "content": obsidian_content,
        "cover": "https://picsum.photos/seed/obsidian-cover/1200/600",
        "category": "软件",
        "tags": ["Obsidian", "笔记", "双链", "知识管理", "插件", "Zettelkasten"],
        "date": DATE,
        "views": 0,
        "likes": 0,
        "isPinned": False,
    },
]

# 计算字数与阅读时长
for a in articles:
    wc = len(a["content"])
    a["wordCount"] = wc
    a["readingTime"] = max(1, round(wc / 350))

# ---------------------------------------------------------------------------
# 1) server-data/admin-articles.json  +  server/seed/articles.json
# ---------------------------------------------------------------------------
json_path_live = os.path.join(ROOT, "server-data", "admin-articles.json")
json_path_seed = os.path.join(ROOT, "server", "seed", "articles.json")

with open(json_path_live, "w", encoding="utf-8") as f:
    json.dump(articles, f, ensure_ascii=False, indent=2)
with open(json_path_seed, "w", encoding="utf-8") as f:
    json.dump(articles, f, ensure_ascii=False, indent=2)

print("written JSON:", json_path_live, json_path_seed)

# ---------------------------------------------------------------------------
# 2) src/data/articles.ts  —— 保留底部辅助函数，仅替换 ARTICLES 数组
# ---------------------------------------------------------------------------
ts_path = os.path.join(ROOT, "src", "data", "articles.ts")
with open(ts_path, "r", encoding="utf-8") as f:
    old_ts = f.read()

marker = "/** 按标签聚合 */"
idx = old_ts.index(marker)
tail = old_ts[idx:]  # 保留所有辅助函数

array_ts = json.dumps(articles, ensure_ascii=False, indent=2)

header = (
    "import type { Article }\n"
    "\n"
    "/**\n"
    " * 文章数据（重写：DeepSeek 使用+插件、Markdown 编写、Obsidian 使用+插件）\n"
    " * 首页列表与详情页共用此数据源\n"
    " * id 使用 slug，保证 /article/:id 路由对齐\n"
    " */\n"
    "export const ARTICLES: Article[] = "
)

new_ts = header + array_ts + ";\n\n" + tail

with open(ts_path, "w", encoding="utf-8") as f:
    f.write(new_ts)

print("written TS:", ts_path)

# ---------------------------------------------------------------------------
# 3) functions/seed/articles.ts  —— 自动生成格式（紧凑单行 JSON）
# ---------------------------------------------------------------------------
cf_path = os.path.join(ROOT, "functions", "seed", "articles.ts")
cf_header = (
    "// 自动生成，请勿手改！数据源: src/data/articles.ts（由 scripts/export-seeds.cjs 生成）\n"
)
cf_body = "export const SEED_ARTICLES = " + json.dumps(articles, ensure_ascii=False) + ";\n"

with open(cf_path, "w", encoding="utf-8") as f:
    f.write(cf_header + cf_body)

print("written CF seed:", cf_path)
print("DONE. articles:", len(articles))
