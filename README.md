# ai-tools-qa source

这是 `tools.aitoolsguide.top` / `ai-tools-qa` 的可维护源码重建版。

目标：

- 保留原页面内容和原有前端逻辑。
- 保留 `/ask`、`/image`、`/hot` 三个接口。
- 后续优化只改 `public/index.html`，不要直接覆盖 Worker 线上版本。

常用命令：

```powershell
npm install
npm run validate:data
npm run validate:html
npm run sync:data
npm run check
npm run deploy:dry
npm run deploy
```

密钥要求：

- `DEEPSEEK_API_KEY`：用于 `/ask`
- `SERPER_API_KEY`：当前源码保留配置位，后续可用于搜索增强
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`：用于真实账号登录
- `ADMIN_TOKEN`：用于访问只读统计 API
- `AI` Workers AI binding：用于 `/image`
- `DB` D1 binding：用于账号、会话、服务端收藏、推荐记录和点击/提问事件

当前源码已作为后续维护的 source of truth。发布前必须先本地预览并验证动态接口。

线上信息：

- 域名：https://tools.aitoolsguide.top/
- Worker：`ai-tools-qa`
- 当前已部署版本：`8acf718e-ab0e-4cab-82e9-0388321abe60`
- 回滚版本：`140e229d-d034-4304-923b-aa9c609bdcef`

发布前检查：

```powershell
npm run check
npm run deploy:dry
```

发布后验证：

```powershell
Invoke-WebRequest https://tools.aitoolsguide.top/
Invoke-WebRequest https://tools.aitoolsguide.top/hot?tab=kr36
```

## 工具数据维护

- 数据文件：`data/tools.json`
- 后台页面：`/admin`
- 后台工具数据维护是安全的离线编辑模式：可导入、编辑、导出 JSON，不直接写线上数据。
- 后台数据看板是只读模式：输入 `ADMIN_TOKEN` 后读取 `/api/admin/stats`，token 仅保存到当前浏览器 `sessionStorage`。

维护流程：

```powershell
# 1. 用 /admin 导出新的 tools.json，覆盖 data/tools.json
# 2. 同步数据到首页
npm run sync:data

# 3. 校验、检查并部署
npm run validate:data
npm run validate:html
npm run check
npm run deploy:dry
npm run deploy
```

当前不做线上直接写入，是为了避免未授权人员修改工具库。后续如果需要真正的在线后台，需要增加鉴权和 KV/D1 存储。

## 后端基础能力

已预留以下 API：

- `GET /api/auth/me`
- `GET /api/auth/github/login`
- `GET /api/auth/github/callback`
- `POST /api/auth/logout`
- `GET|POST|DELETE /api/favorites`
- `POST /api/recommend`
- `POST /api/events`
- `GET /api/admin/stats`

D1 初始化：

```powershell
npm run db:migrate:local
npm run db:migrate:remote
```

部署前需要先在 `wrangler.toml` 填入真实 D1 `database_id`，并在 Cloudflare 配置 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`、`DEEPSEEK_API_KEY`。

后端安全边界：

- Session cookie 存随机 token，D1 只保存 SHA-256 摘要。
- `/api/events` 只接受预设事件类型：`tool_click`、`official_click`、`ask_tool`、`question`、`recommend`、`favorite_add`、`favorite_remove`、`quiz_open`、`search`。
- `/ask`、收藏、推荐和事件上报都有 D1 简单窗口限流。
- `/api/admin/stats` 需要 `Authorization: Bearer <ADMIN_TOKEN>`。
- `/api/admin/stats` 返回 totals、事件类型、热门搜索词、收藏排行、问 AI 排行、官网点击排行和最近事件。

首页接入：

- 顶部登录入口跳转 GitHub OAuth；未配置 OAuth 时会显示后端错误，不再使用假登录状态。
- 工具收藏未登录时保留本地，登录后自动合并并同步到 `/api/favorites`。
- “让 AI 帮我选工具”提交到 `/api/recommend`，结果可直接问 AI、去官网或收藏。
- 搜索、问工具用法、官网点击和推荐打开会上报到 `/api/events`。
