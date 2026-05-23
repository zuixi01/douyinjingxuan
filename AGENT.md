# AGENT.md — 抖音精选 AI 知识平台

## 项目概述

抖音精选的 AI 增强版。在复刻抖音精选移动端 UI 的基础上，加入 AI 笔记总结、时间戳跳转和知识库收藏功能。面向黑客松 Demo，核心闭环：**发现内容 → 快速判断价值 → 沉淀到知识库**。

## 技术栈

- **前端**: React 18 + Vite + Tailwind CSS + Framer Motion
- **测试**: Vitest + @testing-library/react
- **视频处理**: ffmpeg + Muku（video-downloade）
- **AI 转录**: OpenRouter（openai/gpt-audio-mini）
- **AI 解析**: 智谱 GLM-4.5

## 目录结构

```
douyinjingxuan/
├── src/
│   ├── main.jsx              # 应用入口
│   ├── feed-data.js          # 视频数据 + AI 笔记内容（核心数据源）
│   ├── index.css             # 全局样式
│   └── video-interactions.test.jsx  # 交互测试
├── public/
│   └── videos/               # 10 个 MP4 视频文件
├── cache/
│   ├── mp3/                  # MP3 音频 + Muku 产物（逐字稿/解析稿/知识库）
│   ├── blog-prompt.md        # 自定义解析提示词
│   ├── audio/                # WAV 音频（whisper 用，可忽略）
│   └── transcripts/          # whisper 转录（可忽略，已用 Muku 替代）
├── douyin_featured_ui_demo.jsx  # UI 组件（主界面）
├── feed-data.js              # 根目录副本
├── package.json              # 项目配置
├── vite.config.js            # Vite 配置
├── tailwind.config.js        # Tailwind 配置
├── prd-douyin-jingxuan-ai-knowledge.md  # 产品需求文档
└── dist/                     # 构建产物
```

## 核心文件说明

### `src/feed-data.js` — 数据中枢

所有视频元数据和 AI 笔记都在这里。每个视频对象包含：
- `id` / `title` / `author` / `category` / `tags`
- `videoUrl` — 指向 `/videos/{name}.mp4`
- `ai.summary` — AI 摘要（4 条要点）
- `ai.timestamps` — 可跳转时间戳
- `ai.infographic` — 信息图数据
- `ai.audience` / `ai.takeaway` — 受众和收获

**视频 ID 与文件名映射：**

| ID | 文件 | 真实标题 |
|----|------|----------|
| darwin | darwin.mp4 | 达尔文的死敌：偷窃、封杀、造假与跨越半世纪的复仇 |
| codex | codex.mp4 | 40分钟学会Codex！零基础终级教程 |
| mars | mars.mp4 | 我找到了地球上最像火星的地方 |
| academic | academic.mp4 | 我国论文造假多≠学术道德差，原因在这！ |
| money | money.mp4 | 成长最快的方式是研究赚钱，而不是死磕学习 |
| detective | detective.mp4 | 25岁天才车手赛前遇害，43天跨国追凶，凶手竟换了一张脸 |
| ai-career | ai-career.mp4 | AI大跃进下，大厂青年如何破局 |
| claude-code | claude-code.mp4 | Claude Code 31分钟安装教程 |
| uk-vlog | uk-vlog.mp4 | 英国Vlog：大一的最后三天！回国倒计时 |
| life-motivation | life-motivation.mp4 | 混的人，并不是天生就是混的人 |

### `cache/mp3/` — AI 缓存产物

每个视频有 5 个预处理文件，**后续只需流式输出，不需要重新处理**：

| 文件 | 用途 |
|------|------|
| `{id} - 原始逐字稿.txt` | whisper 原始转录 |
| `{id} - 逐字稿.md` | AI 清洗后的逐字稿（带时间戳） |
| `{id} - 解析稿.md` | 资深编辑 Blog 格式（带 [MM:SS] 时间戳可跳转） |
| `{id} - 知识库.md` | 结构化知识整理 |
| `{id} - 转写信息.json` | 转录元数据 |

### `cache/blog-prompt.md` — 解析提示词

自定义的「资深编辑 Blog」格式提示词，要求：
- Title/Author/URL + 核心结论
- 主题小节 ≥500 字（带 [MM:SS] 时间戳）
- 抽象框架 ≥500 字（步骤化）
- 不增事实，保留细节，专有名词括号释义

## 常用命令

### 开发

```bash
cd douyinjingxuan
npm install          # 安装依赖
npm run dev          # 启动开发服务器（默认 http://localhost:5173）
npm run build        # 构建生产版本到 dist/
npm run preview      # 预览构建产物
npm run test         # 运行测试
```

### 视频处理（Muku）

```bash
# 检查 Muku 配置
video-downloade doctor --json

# 单个视频处理：MP4 → MP3 → 逐字稿 + 解析稿 + 知识库
ffmpeg -i public/videos/{name}.mp4 -vn -acodec libmp3lame -ab 48k -ar 16000 cache/mp3/{name}.mp3 -y
video-downloade audio cache/mp3/{name}.mp3 --article --knowledge --article-prompt-file cache/blog-prompt.md

# 批量处理
ls cache/mp3/*.mp3 > /tmp/mp3_list.txt
video-downloade audio --input-file /tmp/mp3_list.txt --article --knowledge --article-prompt-file cache/blog-prompt.md --output json --result-file cache/batch_result.json
```

### 部署（GitHub Pages）

```bash
# 推送到 main 分支即可触发部署
git add -A && git commit -m "update" && git push origin main
```

## 工作流程指南

### 任务 1：添加新视频

1. 将 MP4 文件放入 `public/videos/`
2. 在 `src/feed-data.js` 的 `LOCAL_DEMO_VIDEOS` 数组添加路径
3. 在 `FEED_ITEMS` 数组添加视频对象（id、title、author、ai 字段等）
4. 提取 MP3 并用 Muku 处理：生成逐字稿/解析稿/知识库到 `cache/mp3/`
5. `npm run dev` 验证，`npm run build` 构建

### 任务 2：更新 AI 笔记内容

1. 读取 `cache/mp3/{id} - 解析稿.md` 获取最新解析
2. 更新 `src/feed-data.js` 中对应视频的 `ai.summary` / `ai.timestamps` / `ai.infographic`
3. 运行 `npm run test` 确保测试通过

### 任务 3：UI 修改

1. 主要修改 `douyin_featured_ui_demo.jsx`
2. 样式用 Tailwind CSS 类名
3. 动画用 Framer Motion
4. `npm run dev` 实时预览
5. `npm run test` 确保交互测试通过

### 任务 4：部署更新

1. 确保所有更改已提交
2. `npm run build` 构建
3. `git push origin main` 推送到远程
4. GitHub Actions 自动部署到 GitHub Pages

## 远程仓库

- **GitHub**: https://github.com/zuixi01/douyinjingxuan
- **认证账号**: qianzhu18
- **默认分支**: main

## 依赖的外部工具

| 工具 | 用途 | 安装方式 |
|------|------|----------|
| ffmpeg | 音视频处理 | `brew install ffmpeg` |
| Muku (video-downloade) | 视频→逐字稿→知识库 | `cd ../Muku && pip3 install -e .` |
| Node.js + npm | 前端开发 | `brew install node` |

## 环境变量（Muku）

在 `../Muku/.env` 中配置：
- `OPENROUTER_API_KEY` — 音频转录
- `AI_CLEANUP_API_KEY` — 逐字稿清洗（智谱）
- `ARTICLE_DRAFT_API_KEY` — 解析稿生成（智谱）
