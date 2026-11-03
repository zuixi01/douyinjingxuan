# 架构与实现边界

本文描述当前代码如何运行。安装与启动命令见 [README](../README.md)；未实现的能力属于 [路线图](RELEASING.md)，不应当作现有接口承诺。

## 前端入口

`index.html` 加载 `src/main.jsx`，由其挂载 `src/app/App.jsx`。主应用负责内容发现、视频播放器、笔记弹层与知识库导航；`src/features/knowledge/KnowledgePage.jsx` 展示知识卡片、筛选与关联视图，`model.js` 负责字段归一化及规则关联。

当前数据流：

```text
src/data/feed.js ──→ 视频卡片 / 预置摘要
                            │
                            ↓
                      src/app/App.jsx
                            │
                      src/services/
                       /          \
             localStorage         FastAPI
                              backend/app.py
                                    │
                           backend/repository.py
                              /             \
                         JSON 文件      SQLAlchemy / SQLite
```

根目录历史页面 `douyin_featured_ui_demo.jsx` 另行引用 `article-drafts.js`，由其通过 Vite `?raw` 导入 `cache/mp3/` 中的解析稿。当前 `src/main.jsx` → `src/app/App.jsx` 不引用这条历史链路，默认构建不需要 `cache/`；轻量克隆可排除整个目录。历史页面与缓存脚本需要的输入应按需取回。

## 存储模式

前端通过 `src/services/apiClient.js` 访问 API，在初始化时确定数据源。未能连接后端时使用 `src/lib/storage.js` 与 `localStorage`，默认内容由 `src/data/feed.js` 和知识模型提供。采用后端模式后，请求失败需要报告错误，不能把未成功的远程操作悄悄记为本地成功。

浏览器本地收藏与后端数据是独立集合，没有同步、冲突合并或自动迁移机制。改变后端连接状态后需要刷新页面。清理浏览器数据前应导出收藏；更换存储实现前应备份文件。

后端通过 `build_repository()` 选择存储：

- `KNOWLEDGE_STORAGE_BACKEND=json`：默认写入 `backend/data/knowledge.json`，使用进程内锁与临时文件原子替换；仅限单进程使用。
- `KNOWLEDGE_STORAGE_BACKEND=database`：通过 SQLAlchemy 保存；默认 SQLite 位于数据目录中的 `knowledge.db`，可用 `DATABASE_URL` 指定连接。
- `KNOWLEDGE_DATA_DIR`：覆盖默认数据目录。相对路径相对于启动进程的工作目录解析。

两个实现复用卡片构造和筛选规则。全新后端存储从默认分区与空卡片开始；运行数据不由 Git 跟踪，更新代码应保留已有本地文件。纯前端模式另外提供一条示例收藏。

数据库模式启动时通过 `create_all()` 建立表并补充默认分区，但没有版本化迁移或并发首次初始化保护，也未验证多进程部署。两个模式都没有用户身份、权限层或应用层数据加密。

## API 概览

具体字段与约束以 `backend/schemas.py` 和运行中的 `/docs` 为准。

| 接口 | 用途 |
| --- | --- |
| `GET /api/health` | 检查进程是否可访问 |
| `GET /api/sections` | 读取分区 |
| `POST /api/sections` | 创建分区 |
| `GET /api/cards` | 按 query、分区、标签、模式和排序读取卡片 |
| `POST /api/cards` | 保存卡片；同一内容在同一分区重复保存返回已有记录 |
| `DELETE /api/cards/{item_id}?section_id=...` | 删除对应分区的收藏 |
| `POST /api/intake/text` | 使用输入文本构造知识卡片 |
| `POST /api/ai/preview` | 归一化并返回传入的预置笔记 |

API 无鉴权；各客户端共享同一存储。健康检查不是模型、外部服务或端到端业务可用性检查。OpenAPI 中的 API 版本字段不代表项目已经发布对应的正式版本。

## “AI”在这里的含义

- 当前主应用的视频摘要和时间戳来自 `src/data/feed.js` 的预置数据；缓存解析稿仅供历史页面与工具使用。
- 预览接口整理传入字段，不调用模型。
- 文本录入截取已有段落并结合标签构造卡片，不是生成式摘要。
- 图谱相关字段来自关键词、默认关联和演示规则，不能作为事实抽取或语义推理结果。

日常启动和测试不需要模型 API 密钥。历史媒体处理曾使用外部工具；这些工具不是本仓库内置服务，也没有由本仓库维护的可重现完整转写流水线。

## 历史文件

`douyin_featured_ui_demo.jsx`、根目录 `feed-data.js` 和 `src/feed-data.js` 保留了早期实现或数据。当前 `src/main.jsx` 不从这些文件启动应用。

`scripts/build-knowledge-base.cjs --build` 仍写入 `src/feed-data.js`，与主数据源 `src/data/feed.js` 尚未统一。修改数据时应明确目标，不能以脚本成功推断主页面已经更新。详见 [脚本说明](../scripts/README.md)。

## 验证与发布边界

前端使用 Vitest / Testing Library 验证交互与服务行为，后端使用 pytest 验证 API 和存储行为。测试通过不等于已验证全部浏览器、素材真实性、无障碍或生产负载。

Vite 生成静态文件到 `dist/`，FastAPI 单独运行。当前没有自动 GitHub Pages 部署，也没有生产发布、监控或备份系统。公开部署前必须先解决访问控制与素材授权问题。
