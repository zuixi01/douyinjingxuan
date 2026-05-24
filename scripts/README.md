# 知识库构建工具

## 功能说明

本工具用于从缓存的视频解析数据中构建结构化的知识库。

### 支持的功能

- **扫描缓存**: 检测可用的视频缓存文件
- **构建数据**: 从缓存生成 `feed-data.js`
- **导出 Markdown**: 将知识库导出为 Markdown 文件
- **查看统计**: 显示缓存文件的统计信息

## 使用方法

### 前置条件

1. 安装 Node.js (v16+)
2. 确保 `cache/mp3/` 目录下有解析数据

### 命令列表

```bash
# 显示帮助
node scripts/build-knowledge-base.cjs --help

# 扫描可用的视频缓存
node scripts/build-knowledge-base.cjs --scan

# 构建 feed-data.js
node scripts/build-knowledge-base.cjs --build

# 导出所有视频知识库为 Markdown
node scripts/build-knowledge-base.cjs --export-all

# 导出指定视频的知识库
node scripts/build-knowledge-base.cjs --video darwin

# 显示缓存统计信息
node scripts/build-knowledge-base.cjs --info
```

## 视频 ID 列表

| ID | 标题 | 分类 |
|---|---|---|
| darwin | 达尔文的死敌 | 科普 |
| codex | Codex 零基础教程 | AI |
| mars | 地球上的火星 | 旅行 |
| academic | 论文造假真相 | 教育 |
| money | 研究赚钱 | 成长 |
| detective | 天才车手凶杀案 | 故事 |
| ai-career | AI 职场破局 | 职场 |
| claude-code | Claude Code 教程 | AI |
| uk-vlog | 英国留学日记 | 生活 |
| life-motivation | 人生逆袭 | 社会 |

## 缓存文件结构

每个视频的缓存文件位于 `cache/mp3/` 目录下：

```
cache/mp3/
├── {video-id} - 解析稿.md      # 带时间戳的内容分析
├── {video-id} - 知识库.md      # 结构化知识摘要
├── {video-id} - 逐字稿.md      # 完整文字转录
├── {video-id} - 原始逐字稿.txt  # 原始转录文本
├── {video-id} - 转写信息.json   # 转录元数据
└── {video-id}.mp3               # 音频文件
```

## Windows 部署

### 方法一：直接运行

1. 安装 Node.js: https://nodejs.org/
2. 克隆项目
3. 打开命令提示符或 PowerShell
4. 运行命令：

```cmd
cd douyinjingxuan
node scripts/build-knowledge-base.cjs --scan
```

### 方法二：使用 WSL (推荐)

1. 安装 WSL: https://docs.microsoft.com/windows/wsl/install
2. 在 WSL 中安装 Node.js
3. 克隆项目并运行

## 添加新视频

1. 在 `scripts/build-knowledge-base.cjs` 的 `VIDEO_CONFIG` 中添加视频配置
2. 将解析文件放入 `cache/mp3/` 目录
3. 运行 `node scripts/build-knowledge-base.cjs --build`

## 常见问题

### Q: 为什么使用 .cjs 扩展名？

A: 因为项目的 `package.json` 设置了 `"type": "module"`，使用 `.cjs` 可以让脚本以 CommonJS 模式运行。

### Q: 如何在浏览器中使用知识库？

A: 运行 `--build` 命令后，会生成 `src/feed-data.js`，项目会自动使用这些数据。

### Q: 导出的 Markdown 文件在哪里？

A: 导出的文件位于项目根目录的 `exports/` 文件夹中。
