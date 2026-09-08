# 内容更新与发版 SOP

> 目标：把「后台改内容」和「代码改功能」两类变更，**安全、可预期地**送到玩家端。
> 适用：CozyCreatures（GitHub Pages 静态托管 + GitHub Actions 自动部署 + 手写 Service Worker）。

---

## 零、先记住三条铁律

1. **线上没有后台。** `/#/admin` 路由只在 `import.meta.env.DEV` 时注册（`src/router/index.ts`），生产构建压根不含这个页面；保存接口 `/__admin_api/*` 是 `vite.config.ts` 里的 **dev 中间件**，只写你本机磁盘。**改内容必须在本地 dev 里改，然后 commit + push。**
2. **一切以 `main` 分支为准。** push 到 `main` 即触发 `.github/workflows/deploy.yml` 自动构建部署，无需手动上线。
3. **CI 会先跑内容校验。** `node scripts/validate-content.mjs` 在 build 之前执行，**内容 JSON 结构不合法 → 部署直接失败，旧版本继续在线上**（不会半吊子）。

---

## 一、内容更新（公告 / 音乐 / 画廊 / 灵植…走后台改的那种）

### 流程图

```
本地 dev 起服务 → 进后台改 → 保存（写本机 public/content/*.json）
   → 本地校验 + 本地验收 → git commit → git push main
   → CI 自动构建部署（约 2–5 分钟）→ 玩家刷新页面即生效
```

### 详细步骤

**1. 启本地服务（后台只存在于 dev）**

```bash
npm run dev
```

**2. 进后台**

- 打开 `http://localhost:5173/#/admin`
- 输入口令（`.env.local` 里的 `ADMIN_TOKEN`；401 会弹输入框）

**3. 改内容并保存**

- 左侧选模块 → 编辑 → 点「保存」
- 保存 = POST `/__admin_api/<模块id>` → 写入 `public/content/<模块id>.json`（**你本机文件**）
- 图片/音频上传走 `/__admin_api/upload`，落到 `public/` 下的对应目录，**这些新文件也要一起提交**

**4. 本地校验（别跳过，CI 也会跑这一关）**

```bash
node scripts/validate-content.mjs
```

**5. 本地验收**

dev 下内容即时生效，直接刷新游戏页面确认效果。**别把没验过的内容推上去。**

**6. 提交推送**

```bash
git add public/content/ public/images/ public/audio/ ...   # 内容 + 新增素材
git commit -m "content: 更新xxx"
git push origin main
```

**7. 等 CI 变绿**

看 Actions 状态（最近一次部署对应哪个 commit、成功与否）：

```bash
curl "https://api.github.com/repos/kekeliang1983-ship-it/kekeliang1983-ship-it.github.io/actions/runs?per_page=3"
```

或浏览器打开仓库 → **Actions** 页。

**8. 验证线上内容已更新**

```bash
curl https://kekeliang1983-ship-it.github.io/content/notices.json
```

**9. 玩家侧**

玩家**刷新页面**即可拿到新内容，无需重装、无需清缓存。
原因：`public/sw.js` 对路径含 `/content/` 的请求**强制走网络、不读缓存**（`e.respondWith(fetch(req))`），保证「改完 → 刷新即得」。

### 内容侧的坑

| 坑 | 说明 | 应对 |
|---|---|---|
| 线上改不了 | 生产无后台、无写接口 | 只在本地 dev 改，改完走 git |
| 换机器丢改动 | 后台写的是**当前这台**机器的文件 | 在哪台改的，就在哪台 commit |
| 结构不合法 | CI 校验失败 → 不会上线 | 本地先跑 `validate-content.mjs` |
| 素材没跟着提交 | 内容引用了图但图没 push → 线上裂图 | 提交时连同 `public/` 下的新素材一起 add |
| 误改想回退 | 用后台「快照回滚」（本地 localStorage 保留保存前内容，最多 10 条） | 改前不必手动备份；也可 `git revert` |

---

## 二、功能更新（代码 / 我改的那种）

### 流程图

```
改代码 → 本地 typecheck + build → commit → push main
   → CI: npm ci → validate-content → npm run build → upload dist → deploy pages
   → Actions 变绿 → 玩家刷新/重开即生效
```

### 详细步骤

**1. 本地验证（我做）**

```bash
npx vue-tsc --noEmit    # 类型
npm run build           # 构建
```

**2. 提交推送（我做）**

```bash
git add <改动文件>
git commit -m "feat: xxx"
git push origin main
```

**3. CI 自动部署**

`.github/workflows/deploy.yml` 在 push `main` 时执行：

```
npm ci → node scripts/validate-content.mjs → npm run build
      → upload-pages-artifact(dist) → deploy-pages
```

只需等它变绿，**没有手动部署步骤**。

**4. 玩家侧生效规则（重要）**

| 资源类型 | 文件名 | 玩家怎么拿到新版 |
|---|---|---|
| JS / CSS | 带内容哈希（如 `main-BMbru_0z.css`） | **刷新一次**即得（`index.html` 是网络优先，会指向新的哈希文件） |
| `public/` 下的图片 / 音频 / 壁纸 | **固定文件名** | SW 是「缓存优先 + 后台更新」→ **第一次刷新可能仍是旧的，再刷新一次**才生效 |
| `/content/*.json` | 固定文件名 | 强制走网络，**刷新即得** |

**5. 需要「立刻全部作废旧缓存」时**

改 `public/sw.js` 顶部的缓存版本号：

```js
const CACHE = 'lingjing-v3';   // → 'lingjing-v4'
```

新 SW 激活时会删掉旧 cache 并 `clients.claim()`，玩家下次打开就是全新版本。
**只在确实需要强刷时改**，日常发版不用动。

**6. 回滚**

```bash
git revert <出问题的 commit>
git push origin main
```

CI 会用回退后的代码重新构建部署。

---

## 三、发布前检查清单（每次都过一遍）

- [ ] 本地 `npx vue-tsc --noEmit` 无报错
- [ ] 本地 `npm run build` 通过
- [ ] 内容改动：`node scripts/validate-content.mjs` 通过
- [ ] 新增/替换的素材文件已一并 `git add`
- [ ] commit 信息写清楚（内容改动用 `content:` 前缀，功能用 `feat:`/`fix:`）
- [ ] push 后确认 Actions 是 **success**（不是只看 push 成功）
- [ ] 线上抽查：`curl https://kekeliang1983-ship-it.github.io/content/<模块>.json`
- [ ] 真机（手机）打开确认，不只信电脑浏览器

---

## 四、常见疑问

**Q：能不能让玩家不刷新就自动拿到新内容/新版本？**
目前不做自动刷新（会打断玩家）。内容走网络，玩家下次打开或刷新即新。若将来需要，可在 SW 里加「检测到新版本 → 弹一个『有新内容，点击刷新』的轻提示」。

**Q：玩家装了 PWA（添加到桌面）后更新会不会卡住？**
一般刷新/重开即可。iOS 上 Safari 对缓存更激进，必要时让玩家**下拉刷新**或**关掉重开**；极端情况按第二节第 5 条 bump SW 版本号。

**Q：只改了 JSON，也要重新构建吗？**
要。内容文件在 `public/content/`，构建时会被拷进 `dist`，必须走一次完整部署。

**Q：我能在线上后台改内容给运营同学用吗？**
当前架构不行（静态托管、无后端）。若要支持「非技术同学在线改内容」，需要把内容搬到带写权限的后端（Supabase 表 / Headless CMS），这是另一个改造项。
