# AGENT.md — 项目协作说明

本项目是独立、非官方的短视频知识收藏原型。对外说明与运行命令以 `README.md` 为入口，能力边界以真实代码为准。不要把准备工作表述为已经发布、已完成授权或具备生产能力。

## 真实入口与技术栈

- 前端：React 19、Vite 8、Tailwind CSS、Framer Motion 14、Lucide 1。
- 后端：FastAPI、Pydantic、SQLAlchemy；JSON 默认，数据库可选。
- 验证：Vitest / Testing Library / jsdom 30 与 pytest。
- `src/main.jsx` 加载 `src/app/App.jsx`；当前视频和预置笔记数据来自 `src/data/feed.js`。
- 知识库界面与规则在 `src/features/knowledge/`，数据访问在 `src/services/`，浏览器存储在 `src/lib/storage.js`。
- `article-drafts.js` 直接导入 `cache/mp3/* - 解析稿.md`，仅由历史根页面引用；当前 `src/main.jsx` 主入口不依赖它或 `cache/`。
- API 路由在 `backend/app.py`，存储在 `backend/repository.py`，约束在 `backend/schemas.py`。

根目录 `douyin_featured_ui_demo.jsx`、`feed-data.js` 与 `src/feed-data.js` 属于历史实现或数据副本，不是当前应用入口。`scripts/build-knowledge-base.cjs --build` 仍输出 `src/feed-data.js`，不能据此宣称主应用数据已更新。

## 工作约定

1. 修改前查看分支、已有改动及适用指令，先定位调用关系，避免覆盖他人改动。
2. 做满足目标的最小完整修改，不顺手改写历史文件、格式化全仓库或引入无关依赖。
3. UI 改动遵循现有组件风格，并考虑键盘、小屏、加载与错误状态。
4. 不把 API 写入失败降级为看似成功的本地保存；本地和后端数据源应在页面会话内保持一致。
5. 测试使用临时数据目录与独立仓库实例，不删除或重置真实 `backend/data/knowledge.json`。
6. 不提交凭据、`.env`、个人笔记、运行数据库、导出、依赖目录或构建产物。
7. 没有明确来源与许可的媒体、转写和品牌素材不能按项目 MIT 许可处理；新增素材同步更新 `docs/ASSETS.md`。
8. 不在没有证据时宣称实时模型、语义推理、用户隔离、安全审计、稳定版本或部署成功。

## 常用命令

前端需要 Node.js 22.x（至少 22.22.2）、24.x（至少 24.15.0）或 26+：

```bash
npm ci
npm run dev -- --host 127.0.0.1
npm run check
npm test
npm run test:scripts
npm run build
npm run preview
```

后端需要 Python 3.11+，在仓库根目录及独立虚拟环境中运行：

```bash
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
python -m pytest backend/tests -q
```

Windows 无需激活环境也可使用 `.\.venv\Scripts\python.exe`。`npm run check` 包含前端测试、脚本测试和构建。前端变更运行相应检查；后端变更运行后端测试，并按风险检查存储行为。纯文档变更核对命令、入口和链接。交付需说明实际验证和缺口，不声称未执行的检查通过。

## 配置和运行限制

- Vite 读取 `VITE_API_BASE_URL`；它是公开配置，不能放入密钥。
- 后端读取进程环境变量，不自动读取 `.env` 文件。
- `KNOWLEDGE_DATA_DIR` 指定持久化目录。
- `KNOWLEDGE_STORAGE_BACKEND=json|database` 选择存储；数据库模式可设 `DATABASE_URL`。
- `KNOWLEDGE_CORS_ORIGINS` 用逗号分隔允许来源；CORS 不提供鉴权。
- JSON 锁仅限单进程，不得以多个 worker 共享写入；SQLite 也没有用户隔离，未验证多进程初始化或部署。
- 运行数据不由 Git 跟踪；全新后端存储从默认分区和空卡片开始，更新代码不得删除已有本地数据。
- 笔记预览使用预置字段，文本整理使用规则；日常运行没有实时 LLM 调用，也不要求模型密钥。

## 文档与发布

- `docs/ARCHITECTURE.md`：数据流、接口和历史实现边界。
- `docs/ASSETS.md`：素材来源与许可状态。
- `docs/RELEASING.md`：发布前检查与尚未承诺的路线图。
- `scripts/README.md`：历史缓存扫描和导出命令。
- `CONTRIBUTING.md` / `SECURITY.md` / `CODE_OF_CONDUCT.md`：社区协作约定。

仓库已公开；目前没有自动 GitHub Pages 部署。推送 `main` 不会自动发布网站，不应在文档中虚构演示地址或上线步骤。发布、服务器操作、删除与历史重写必须遵循当前任务授权及适用的用户级操作流程。
