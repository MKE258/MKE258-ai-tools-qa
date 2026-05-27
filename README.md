# ai-tools-qa source

这是 `tools.aitoolsguide.top` / `ai-tools-qa` 的可维护源码重建版。

目标：

- 保留原页面内容和原有前端逻辑。
- 保留 `/ask`、`/image`、`/hot` 三个接口。
- 后续优化只改 `public/index.html`，不要直接覆盖 Worker 线上版本。

常用命令：

```powershell
npm install
npm run sync:data
npm run check
npm run deploy
```

密钥要求：

- `DEEPSEEK_API_KEY`：用于 `/ask`
- `SERPER_API_KEY`：当前源码保留配置位，后续可用于搜索增强
- `AI` Workers AI binding：用于 `/image`

当前线上已回滚到旧版本。发布本源码前，需要先本地预览和接口验证。

线上信息：

- 域名：https://tools.aitoolsguide.top/
- Worker：`ai-tools-qa`
- 当前已验证版本：`e1cd937a-98e4-4c4a-a928-04d0f2da89be`
- 回滚版本：`ff550c9d-f24d-41fd-b85c-1d375be1759c`

发布前检查：

```powershell
npm run check
npx wrangler deploy --dry-run
```

发布后验证：

```powershell
Invoke-WebRequest https://tools.aitoolsguide.top/
Invoke-WebRequest https://tools.aitoolsguide.top/hot?tab=kr36
```

## 工具数据维护

- 数据文件：`data/tools.json`
- 后台页面：`/admin`
- 后台目前是安全的离线编辑模式：可导入、编辑、导出 JSON，不直接写线上数据。

维护流程：

```powershell
# 1. 用 /admin 导出新的 tools.json，覆盖 data/tools.json
# 2. 同步数据到首页
npm run sync:data

# 3. 检查并部署
npm run check
npm run deploy
```

当前不做线上直接写入，是为了避免未授权人员修改工具库。后续如果需要真正的在线后台，需要增加鉴权和 KV/D1 存储。
