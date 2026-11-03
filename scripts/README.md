# 历史知识库缓存工具

`scripts/build-knowledge-base.cjs` 从 `cache/mp3/` 读取已经存在的解析稿、知识库和转写元数据，用于扫描、导出或生成历史格式的数据文件。它不会下载视频，也不会调用模型或执行音频转写。

**重要：`--build` 写入的是 `src/feed-data.js`。当前应用实际读取 `src/data/feed.js`，因此运行脚本不会自动更新主界面。** 在统一这两个入口前，应把脚本视为历史数据工具；不要直接覆盖当前数据或宣称已经接入。

## 使用条件

在项目根目录使用 Node.js 22.x（至少 22.13）或 24+ 运行，无需为脚本单独安装依赖。输入内容的来源、准确性与可再分发许可需要单独确认，见 [素材清单](../docs/ASSETS.md)。

```text
cache/mp3/
├── {id} - 解析稿.md
├── {id} - 知识库.md
├── {id} - 逐字稿.md
├── {id} - 原始逐字稿.txt
├── {id} - 转写信息.json
└── {id}.mp3
```

脚本按 `VIDEO_CONFIG` 中的 ID 与文件名匹配。发现解析稿且 ID 已配置时会列出该条目；生成数据需要解析稿，知识库或时长元数据缺失时可能使用默认字段。扫描显示的 `complete` 只表示解析稿与知识库存在，不代表内容准确、来源获授权或主应用可播放。

## 命令

```bash
# 帮助、扫描与统计：只读输入
node scripts/build-knowledge-base.cjs --help
node scripts/build-knowledge-base.cjs --scan
node scripts/build-knowledge-base.cjs --info

# 将指定条目的整理结果输出到终端
node scripts/build-knowledge-base.cjs --video darwin

# 写入 exports/{id}.md 与 exports/README.md，可能覆盖同名文件
node scripts/build-knowledge-base.cjs --export-all

# 覆盖历史数据文件 src/feed-data.js，不更新当前主应用数据源
node scripts/build-knowledge-base.cjs --build
```

仓库中的脚本扩展名是 `.cjs`，表示在项目的 ESM 配置中使用 CommonJS 模块。

目前配置的 ID：`darwin`、`codex`、`mars`、`academic`、`money`、`detective`、`ai-career`、`claude-code`、`uk-vlog`、`life-motivation`。

## 添加或替换内容

1. 先确认你有权使用、修改和再分发相应媒体与文本，更新素材清单。
2. 为脚本整理输入时，更新 `VIDEO_CONFIG` 并按对应 ID 放置文件。
3. 使用 `--scan` 检查文件匹配，使用 `--video <id>` 审阅导出结果。
4. 若目标是更新当前应用，还需明确更新 `src/data/feed.js`；只有修改历史根页面时才需检查 `article-drafts.js` 的解析稿导入映射。
5. 在主应用中核对标题、作者、摘要、时间戳和视频路径，执行相关测试与 `npm run build`。

当前默认应用和构建不依赖 `cache/`；轻量克隆可排除整个目录。使用本脚本或根目录历史页面前，需要取回对应缓存；缺少输入时脚本不能生成有效历史数据。未经核实的转写、作者字段和示例指标不能充当真实来源或授权证明。导出文件可能包含第三方内容或个人笔记，不应未经检查提交到仓库或发布。
