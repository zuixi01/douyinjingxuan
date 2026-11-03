# 抖音精选 · 知识收藏原型

[English](README.en.md) · [参与贡献](CONTRIBUTING.md) · [架构说明](docs/ARCHITECTURE.md) · [素材与授权](docs/ASSETS.md)

一个独立、非官方的短视频学习与知识收藏原型：用 React 展示视频和预置笔记，把感兴趣的内容保存为可检索、可导出的知识卡片。适合研究交互设计、前后端数据流和个人知识整理流程。

本项目与抖音、字节跳动及视频原作者不存在已声明的官方合作或隶属关系。项目名称中的“抖音精选”用于描述界面灵感与演示主题。

**当前阶段：可本地运行的演示原型。** 仓库已公开；这里正在补齐开源文档、验证和维护流程，尚不承诺生产服务能力或稳定 API。页面中的“AI”内容主要来自预置数据和历史处理产物；运行应用不调用实时大模型，手动文本整理也采用规则提取。没有账号体系、权限隔离或生产多租户支持。

## 可以体验什么

- 浏览预置内容，播放本地视频，查看摘要与时间戳，并从笔记跳转到视频片段。
- 新建知识分区、收藏视频卡片、录入文本笔记，按关键字、标签和分区查找内容。
- 查看由预置关键词和关联规则组织的知识视图，将收藏导出为 Markdown。
- 独立运行前端，使用浏览器本地存储；也可启动 FastAPI，把分区和卡片保存到本地 JSON 或可选 SQLite 数据库。

示例标题、点赞数、作者字段、摘要和时间戳是演示数据，可能与视频原内容存在偏差；知识关联视图不是经过验证的事实图谱。视频、转写稿和品牌元素的再分发授权尚待逐项确认，详见 [素材清单](docs/ASSETS.md)。

## 快速开始

需要 Git、Node.js **22.x（至少 22.13）或 24+** 以及 npm，与 `package.json` 的 `engines` 一致。后端另需 Python **3.11 或更新版本**。请从项目根目录执行下面的命令。

### 1. 获取代码

完整克隆会包含历史中跟踪的视频和音频，下载量较大：

```bash
git clone https://github.com/zuixi01/douyinjingxuan.git
cd douyinjingxuan
```

只研究界面、笔记和代码时，可以使用轻量克隆，排除大体积媒体：

```bash
git clone --depth 1 --filter=blob:none --no-checkout https://github.com/zuixi01/douyinjingxuan.git
cd douyinjingxuan
git sparse-checkout set --no-cone '/*' '!/public/videos/' '!/cache/'
git checkout main
```

当前默认应用不依赖 `cache/`，排除整个目录仍可构建，并浏览 `src/data/feed.js` 中的预置摘要与知识库界面。未下载视频时无法完整体验本地播放；如需研究历史解析稿、根目录旧页面或运行缓存处理脚本，再调整稀疏检出规则取回所需缓存。排除文件不会清除已有 Git 历史，也不替代第三方内容的授权核实。

### 2. 启动前端

```bash
npm ci
npm run dev
```

打开终端显示的地址，通常是 <http://127.0.0.1:5173>。开发服务器默认只监听本机地址。

前端默认探测 `http://127.0.0.1:8000`。后端不可用时进入浏览器本地模式；页面加载时确定使用本地或后端数据源。使用后端期间的请求失败会显示错误，不会悄悄转为本地保存；调整后端或连接状态后刷新页面重新选择数据源。本地与后端数据不会自动迁移或合并，清理浏览器站点数据会丢失本地收藏，重要内容请先导出。

如需修改 API 地址，复制根目录 `.env.example` 为 `.env.local`，设置：

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

修改后重启 Vite；构建产物中的地址在构建时确定。`VITE_` 变量会进入浏览器代码，不要放入密钥。

### 3. 启动可选后端

在另一个终端、项目根目录创建环境：

```bash
python -m venv .venv
```

macOS / Linux：

```bash
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

Windows PowerShell 可直接使用虚拟环境解释器，无需修改执行策略：

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

健康检查：<http://127.0.0.1:8000/api/health>；交互式 API 文档：<http://127.0.0.1:8000/docs>。确认后端启动后刷新前端。

`backend/requirements.txt` 固定了五个顶层依赖版本，尚不是包含全部传递依赖的完整锁文件。

后端没有登录鉴权，连接到它的客户端共享同一份数据。默认绑定本机地址用于个人开发；CORS 允许来源设置并不提供访问控制。请勿把个人笔记直接放在未受保护的公共 API 上。

## 配置与数据

| 变量 | 默认值 / 用途 |
| --- | --- |
| `VITE_API_BASE_URL` | 前端 API 地址，默认 `http://127.0.0.1:8000`；由 Vite 读取 |
| `KNOWLEDGE_STORAGE_BACKEND` | `json`；设为 `database` 使用 SQLAlchemy 存储 |
| `KNOWLEDGE_DATA_DIR` | `backend/data`；JSON 文件和默认 SQLite 文件的保存目录 |
| `DATABASE_URL` | 仅 `database` 模式读取；默认使用数据目录中的 `knowledge.db`（SQLite） |
| `KNOWLEDGE_CORS_ORIGINS` | 逗号分隔的允许来源；默认允许 `localhost`、`127.0.0.1` 的 `5173` 和 `4173` 端口 |

**后端不会自动读取 `.env` / `.env.local`。** 必须在启动后端的终端设置环境变量。例如使用独立数据目录与 SQLite：

```bash
# macOS / Linux；先激活虚拟环境
export KNOWLEDGE_DATA_DIR="$PWD/.local-data"
export KNOWLEDGE_STORAGE_BACKEND=database
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

```powershell
# Windows PowerShell
$env:KNOWLEDGE_DATA_DIR = Join-Path (Get-Location) '.local-data'
$env:KNOWLEDGE_STORAGE_BACKEND = 'database'
.\.venv\Scripts\python.exe -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

JSON 为默认模式，有进程内锁和原子文件替换，仍只适合**单进程、本机开发**；不要以多个 worker 共用该文件。SQLite 是可选持久化方式，也不提供用户隔离，尚未验证多进程初始化与部署。切换存储模式不会自动搬迁已有数据，迁移前先备份原文件。

运行数据不再由 Git 跟踪。首次使用全新的后端存储时，系统创建默认分区，卡片为空；纯前端模式仍带有一条示例收藏。已有本地数据文件会保留，不会因更新代码自动清空。

## 检查与构建

```bash
npm run check
npm run preview
```

`npm run check` 依次执行前端测试、缓存脚本测试和构建；也可用 `npm test`、`npm run test:scripts`、`npm run build` 单独定位问题。后端测试在已安装依赖的 Python 环境中执行：

```bash
python -m pytest backend/tests -q
```

PowerShell 未激活环境时，使用 `.\.venv\Scripts\python.exe -m pytest backend/tests -q`。测试应使用临时存储，不修改个人知识库。

`npm run build` 生成 `dist/`。`npm run preview` 是本机构建预览命令。CI 配置在 Ubuntu / Windows 上使用 Node.js 22 检查前端，在 Ubuntu 上使用 Python 3.11 / 3.13 检查后端，并执行 npm 高危依赖审计；是否通过以对应提交的实际检查结果为准。当前仓库没有配置 GitHub Pages 自动部署；推送 `main` 不会自动发布网站。

## 从哪里修改

```text
src/main.jsx                    React 入口
src/app/App.jsx                 主界面与视频交互
src/data/feed.js                当前应用使用的视频和预置笔记数据
src/features/knowledge/         知识库页面、卡片模型与关联规则
src/services/                  API 请求、笔记预览与知识库操作
src/lib/storage.js             浏览器存储
article-drafts.js               仅供历史根页面使用的解析稿导入器
backend/app.py                 FastAPI 路由与 CORS
backend/repository.py          JSON / SQLAlchemy 存储
backend/tests/                 后端测试
scripts/build-knowledge-base.cjs 历史缓存扫描与导出工具
```

根目录的 `douyin_featured_ui_demo.jsx`、`feed-data.js` 和 `src/feed-data.js` 是历史实现或数据副本，不是当前主入口。缓存脚本的 `--build` 仍输出 `src/feed-data.js`，**不会自动更新 `src/data/feed.js`**；使用前阅读 [脚本说明](scripts/README.md)。

## 参与和发布

欢迎提交可复现的问题、小范围修复和文档改进。提交前阅读 [贡献指南](CONTRIBUTING.md) 和 [行为准则](CODE_OF_CONDUCT.md)；安全问题请参考 [安全政策](SECURITY.md)。

下一步重点是确认并替换授权不明的素材、统一历史数据入口、完善错误与可访问性交互。正式发布条件与后续方向见 [发布检查与路线图](docs/RELEASING.md)。项目目前不声明正式稳定版本或维护响应时限。

## 许可证与致谢

本次开源准备**拟为项目原创代码采用 [MIT License](LICENSE)**；维护者需在合并发布前确认相应版权及许可选择。MIT 不覆盖本仓库中的第三方视频、音频、转写原文、品牌、商标或其他未获许可的内容，也不代表已经取得其再分发授权。依赖库各自保留原许可证。

感谢 React、Vite、Tailwind CSS、Framer Motion、Lucide、FastAPI 与 SQLAlchemy 等开源项目。历史笔记由外部媒体处理流程产生，应用运行不需要配置这些流程的模型密钥。第三方内容来源与许可状态见 [docs/ASSETS.md](docs/ASSETS.md)。
