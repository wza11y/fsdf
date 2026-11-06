# AI cooking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一个本地运行的 AI 健康家常菜生成器：输入主题 → 生成 8–10 道菜 → 转盘随机选一道 → 照着做。

**Architecture:** Next.js App Router 单页应用。页面逻辑在客户端；唯一服务端入口 `/api/generate` 持有 DeepSeek key 并调用 OpenAI 兼容接口，用 JSON 模式约束输出，服务端校验后返回。访问口令、限流、每日上限都在服务端；历史与收藏只在 localStorage。

**Tech Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Zod · Vitest + React Testing Library · jsdom

**Spec:** 本轮对话中的方案（未单独落盘）。执行者以本计划 + 该对话为准。

**项目位置：** `C:\Users\wz\ai-cooking`

## Global Constraints

- 所有界面文案、错误提示、模型输出一律**中文**。
- 每次生成 **8–10 道菜，不得少于 8 道**；不足 8 道自动重试一次，仍不足则返回可重试的错误。
- 密钥与口令只在服务端：`DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL`、`ACCESS_CODE`。**任何变量都不得加 `NEXT_PUBLIC_` 前缀**。
- `ACCESS_CODE` 未配置时默认拒绝所有访问（fail closed），不得静默放行。
- 不登录、不数据库；持久化只用 localStorage。
- 只监听 localhost；不绑 `0.0.0.0`，不开内网穿透。
- 防护顺序：口令 cookie → Origin 校验 → IP 限流 → 每日上限 → DeepSeek key。
- 无 key / key 错 / 超时 / 限流 / 内容非法，各有一条可直接执行的中文提示。
- 桌面（≥1024px）与手机（375px）都要可用。

## Review Focus

以下是最可能让真实使用者出问题的五类情况，每类都已在对应任务里放了测试：

1. 模型只返回 7 道或出现重名 → 先去重；去重后仍不足 8 道才自动重试一次，仍不足则给出可重试提示（Task 2、Task 4、Task 7、Task 13）。
2. `cravingScore` 返回越界值或字符串 → 应夹到 0–100 的整数，而不是显示 "150/100"（Task 2）。
3. 主题为空/全空格/超长 → 应在前端禁用、服务端 400，而不是发一个空 prompt（Task 7、Task 9）。
4. localStorage 不可用或写满（无痕模式、iOS 配额）→ 应降级，页面照常可用（Task 8）。
5. 生成中连点或并发请求 → 按钮应禁用 + 服务端限流兜底（Task 13、Task 6）。

## File Structure

```
ai-cooking/
  app/
    layout.tsx                 全局壳、字体、metadata
    page.tsx                   首页：表单 + 结果 + 抽屉
    gate/page.tsx              口令页
    api/auth/route.ts          口令校验 + 下发 cookie
    api/generate/route.ts      生成入口（鉴权、限流、校验、调用模型）
    globals.css                设计 token + 基础样式
  components/
    ThemeForm.tsx  DishCard.tsx  DishGrid.tsx  RouletteWheel.tsx
    HistoryDrawer.tsx  FavoritesDrawer.tsx  ErrorBanner.tsx  SkeletonGrid.tsx
  hooks/
    use-generate.ts            生成状态机（idle/loading/success/error）
  lib/
    types.ts  schema.ts  prompt.ts  deepseek.ts  auth.ts
    rate-limit.ts  storage.ts  format.ts  roulette.ts
  tests/                       vitest 用例，按模块命名
  proxy.ts                     口令门（Next 16 的 middleware 新约定）
  vitest.config.ts  .env.local.example
```

---

### Task 1: 项目脚手架与工具链

**Files:** Create `ai-cooking/`（脚手架产物）、`vitest.config.ts`、`tests/setup.ts`、`.env.local.example`；Modify `app/globals.css`、`.gitignore`

**Interfaces:** Produces — 可运行的 `npm run dev`、`npx vitest run`、`npm run build`。

- [ ] **Step 1:** 在 `C:\Users\wz` 执行 `npx create-next-app@latest ai-cooking --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm`，提示项一律接受与上述 flag 一致的值。
- [ ] **Step 2:** 安装测试依赖：`npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`；安装运行依赖：`npm i zod`。
- [ ] **Step 3:** 写 `vitest.config.ts`：environment `jsdom`、setupFiles `tests/setup.ts`、alias `@` → 项目根。`tests/setup.ts` 引入 `@testing-library/jest-dom/vitest`。
- [ ] **Step 4:** 写冒烟测试 `tests/smoke.test.tsx`：`render(<div>AI cooking</div>)` 后断言文本可见。
- [ ] **Step 5:** 运行 `npx vitest run`，预期 1 passed。
- [ ] **Step 6:** 写 `.env.local.example`（四个变量名 + 空值 + 中文注释），确认 `.gitignore` 含 `.env*.local`。
- [ ] **Step 7:** 运行 `npm run build`，预期成功。`git commit -m "chore: scaffold ai-cooking"`。

---

### Task 2: 领域类型与配方校验

**Files:** Create `lib/types.ts`、`lib/schema.ts`、`tests/schema.test.ts`

**Interfaces:**
- Produces: `Dish`、`GenerateInput`、`Generation`、`ApiErrorCode`；`parseDishes(raw: unknown, opts?: { min?: number }): Dish[]`（去重、夹分、至少 `min` 道，否则抛 `TooFewDishesError`），默认 `min = 8`。

```ts
type Dish = {
  id: string; name: string; styleTags: string[];
  cravingScore: number;            // 0–100 整数
  reason: string; cookTimeMinutes: number; servings: number;
  difficulty: '简单' | '中等';
  ingredients: { name: string; amount: string }[];
  steps: string[];                 // 3–6 步
  tip: string; healthNote: string;
}
type GenerateInput = { theme: string; maxMinutes?: number; servings?: number; taste?: '下饭' | '清淡' | '高蛋白' }
```

- [ ] **Step 1:** 写失败测试：合法 10 道通过；9 道通过；重名去重后剩 9 道且不抛错；去重后 7 道抛 `TooFewDishesError`；`cravingScore: 150` 被夹为 100、`"88"` 转为 88；缺 `steps` 抛 `SchemaError`；空数组合法输入抛错。
- [ ] **Step 2:** `npx vitest run tests/schema.test.ts`，预期失败。
- [ ] **Step 3:** 用 Zod 实现 schema，`.transform` 完成去重与夹分；`id` 用 `crypto.randomUUID()` 补齐，模型不负责 id。
- [ ] **Step 4:** 再跑，预期全绿。
- [ ] **Step 5:** `git commit -m "feat: dish schema and normalization"`。

---

### Task 3: 提示词构建

**Files:** Create `lib/prompt.ts`、`tests/prompt.test.ts`

**Interfaces:** Produces — `buildSystemPrompt(): string`、`buildUserPrompt(input: GenerateInput): string`。

- [ ] **Step 1:** 写测试：system prompt 包含"中文""10 道""至少 8 道""JSON"，且**不包含**"小红书""抖音""平台""内容类型"；user prompt 出现主题原文、耗时/人数/口味（有值时）；theme 前后空白被 trim。
- [ ] **Step 2:** 运行，预期失败。
- [ ] **Step 3:** 实现两函数。system prompt 固定这些约束：全部中文；3–6 步；配料带用量；每道给"不翻车关键点"；健康只描述少油/高蛋白/蔬菜量，不做疗效承诺；覆盖不同主食材与烹饪方式；心动值评分标准 + 理由必须回扣主题；只输出 JSON，不要 markdown 围栏。
- [ ] **Step 4:** 运行，预期通过。
- [ ] **Step 5:** `git commit -m "feat: prompt builder"`。

---

### Task 4: DeepSeek 客户端

**Files:** Create `lib/deepseek.ts`、`tests/deepseek.test.ts`

**Interfaces:** Produces — `generateDishes(input, deps): Promise<Dish[]>`，`deps = { fetch, apiKey, baseUrl, model, timeoutMs? }`；错误类 `MissingKeyError | InvalidKeyError | RateLimitError | TimeoutError | TooFewDishesError | UpstreamError`。

- [ ] **Step 1:** 写测试（fetch 注入为 mock）：空 apiKey 抛 `MissingKeyError`；401→`InvalidKeyError`；429→`RateLimitError`；永不 resolve 的 fetch + `timeoutMs: 50` → `TimeoutError`；返回带 ```json 围栏的内容能解析；首次返回非法 JSON、第二次合法 → 共调用 2 次且第二次 `temperature` 更低；首轮 7 道、次轮 9 道 → 返回 9 道且共调用 2 次；两轮都 7 道 → 抛 `TooFewDishesError`。
- [ ] **Step 2:** 运行，预期失败。
- [ ] **Step 3:** 实现：POST `${baseUrl}/chat/completions`，body 含 `model`、`messages`、`temperature: 0.85`、`max_tokens: 6000`、`response_format: { type: 'json_object' }`；`AbortController` 超时；剥围栏后 `parseDishes`；JSON 解析失败重试一次（`temperature: 0.3`）；`TooFewDishesError` 重试一次，追加"上一批不足 8 道，请补足并精简步骤"。
- [ ] **Step 4:** 运行，预期通过。
- [ ] **Step 5:** `git commit -m "feat: deepseek client with retry"`。

---

### Task 5: 访问口令门

**Files:** Create `lib/auth.ts`、`tests/auth.test.ts`、`app/api/auth/route.ts`、`tests/auth-route.test.ts`、`app/gate/page.tsx`、`components/GateForm.tsx`、`proxy.ts`

**Interfaces:** Produces — `AUTH_COOKIE = 'ai_cooking_auth'`、`deriveToken(accessCode): Promise<string>`（Web Crypto HMAC-SHA256，edge 与 node 都能跑）、`verifyToken(token?, accessCode): Promise<boolean>`（常数时间比较）。

- [ ] **Step 1:** 写测试：同一口令派生结果稳定、不同口令不同；`verifyToken` 对错值/`undefined` 返回 false；`POST /api/auth` 错口令返回 401；同一 IP 10 分钟内错 5 次返回 429；对的口令返回 200 且 `Set-Cookie` 含 `HttpOnly`、`Max-Age`（30 天）、`SameSite=Lax`；`ACCESS_CODE` 缺失时返回 500 `MISSING_ACCESS_CODE`。
- [ ] **Step 2:** 运行，预期失败。
- [ ] **Step 3:** 实现 `lib/auth.ts` 与路由。cookie 值 = `deriveToken(code)`，不存任何状态。
- [ ] **Step 4:** 写 `proxy.ts`（Next 16 约定，导出 `proxy`）：matcher 排除 `/_next`、静态资源、`/gate`、`/api/auth`；`ACCESS_CODE` 缺失时拒绝一切；页面请求无有效 cookie → 重定向 `/gate`；`/api/*` 无有效 cookie → 401 JSON `{ code: 'UNAUTHORIZED' }`。
- [ ] **Step 5:** 写 `/gate` 页与 `GateForm`（中文：标题、说明、输入框、按钮、错误提示）。
- [ ] **Step 6:** 运行测试通过；`npm run build` 通过（`proxy.ts` 固定 Node.js 运行时，可使用 `node:crypto`）。
- [ ] **Step 7:** `git commit -m "feat: access code gate"`。

---

### Task 6: 限流与每日上限

**Files:** Create `lib/rate-limit.ts`、`tests/rate-limit.test.ts`

**Interfaces:** Produces — `checkAndConsume(key: string, now?: number): { ok: true } | { ok: false; retryAfterMs: number }`、`resetRateLimit(): void`；常量 `PER_MINUTE = 3`、`PER_DAY_GLOBAL = 50`。

- [ ] **Step 1:** 写测试：同一 key 第 4 次失败并给出 `retryAfterMs`；不同 key 互不影响；全局累计 50 次后新 key 也被拒；`resetRateLimit()` 后恢复。
- [ ] **Step 2:** 运行，预期失败。
- [ ] **Step 3:** 实现模块级 `Map` + 滑动窗口（60 秒）+ 全局日计数（按本地日期键重置）。
- [ ] **Step 4:** 运行，预期通过。
- [ ] **Step 5:** `git commit -m "feat: in-memory rate limit"`。

---

### Task 7: /api/generate

**Files:** Create `app/api/generate/route.ts`、`tests/generate-route.test.ts`

**Interfaces:** Consumes — Task 5 的 cookie 校验、Task 6 的 `checkAndConsume`、Task 4 的 `generateDishes`、Task 2 的 `parseDishes`。Produces — `POST` 返回 `{ dishes: Dish[] }` 或 `{ code: ApiErrorCode, message: string }`。

- [ ] **Step 1:** 写测试（mock `lib/deepseek`，直接调用 route 的 `POST`）：无 cookie→401；`theme` 空/全空格→400 `BAD_REQUEST`；`theme` > 300 字→400；环境无 `DEEPSEEK_API_KEY`→500 `MISSING_API_KEY` 且 message 含 `DEEPSEEK_API_KEY`；伪造 `Origin: https://evil.com`→403 `BAD_ORIGIN`；被限流→429 `RATE_LIMIT`；正常→200 且 `dishes` 非空；两轮都 <8 道→502 `TOO_FEW`。
- [ ] **Step 2:** 运行，预期失败。
- [ ] **Step 3:** 实现：读 cookie → Origin/Host 校验（仅允许 `localhost` / `127.0.0.1`）→ 读 env → 校验 body（Zod）→ 限流（IP 取 `x-forwarded-for` 首项，缺省 `local`）→ 调客户端 → 错误类映射到 `ApiErrorCode`。返回体**不包含**任何堆栈或上游原文。
- [ ] **Step 4:** 运行，预期通过。
- [ ] **Step 5:** 用真实 key 冒烟一次，确认 `DEEPSEEK_MODEL` 可用（若 `DeepSeek-flash` 不被接受，改用 `deepseek-chat` 并记录到 `.env.local`）。
- [ ] **Step 6:** `git commit -m "feat: generate api route"`。

---

### Task 8: localStorage 与文本格式化

**Files:** Create `lib/storage.ts`、`lib/format.ts`、`tests/storage.test.ts`、`tests/format.test.ts`

**Interfaces:** Produces — `loadHistory(): Generation[]`、`saveGeneration(g): void`（前插、上限 30）、`loadFavorites(): Dish[]`、`toggleFavorite(dish): boolean`、`removeGeneration(id): void`、`dishToText(dish): string`。

- [ ] **Step 1:** 写测试：保存两次后新的在前；第 31 次后长度仍为 30；写入损坏 JSON 后 `loadHistory()` 返回 `[]` 不抛；`localStorage.setItem` 抛 QuotaExceeded 时 `saveGeneration` 不抛；`toggleFavorite` 返回加入/移除状态；`dishToText` 输出形如 `菜名\n风格：…\n心动值：…\n配料：…\n步骤：1. …\n关键点：…`。
- [ ] **Step 2:** 运行，预期失败。
- [ ] **Step 3:** 实现，所有读写包 `try/catch` 并静默降级。
- [ ] **Step 4:** 运行，预期通过。
- [ ] **Step 5:** `git commit -m "feat: local history and favorites"`。

---

### Task 9: 页面骨架与输入表单

**Files:** Create `components/ThemeForm.tsx`、`tests/theme-form.test.tsx`；Modify `app/layout.tsx`、`app/page.tsx`、`app/globals.css`

**Interfaces:** Produces — `<ThemeForm onSubmit={(input: GenerateInput) => void} disabled={boolean} />`；client hook `useGenerate()`（Task 13 完成实现，此处先占位返回 idle 状态）。

- [ ] **Step 1:** 写测试：主题为空时提交按钮 `disabled`；输入 `  番茄  ` 提交后 `onSubmit` 收到 trim 后的值；耗时/口味 chips 为单选，再点同一项取消；`disabled` 时按钮不可点。
- [ ] **Step 2:** 运行，预期失败。
- [ ] **Step 3:** 在 `globals.css` 定义设计 token：`--paper`（米白）、`--ink`（深墨）、`--chili`（辣椒红）、`--ginger`（姜黄）、圆角与间距；`layout.tsx` 加载中文衬线显示字 + 无衬线正文，设置 `lang="zh-CN"`。
- [ ] **Step 4:** 实现 `ThemeForm` 与 `app/page.tsx` 骨架（标题区、表单区、结果区占位）。
- [ ] **Step 5:** 运行测试通过；`npm run dev` 手动看 375px 与 1440px 两档布局。
- [ ] **Step 6:** `git commit -m "feat: page shell and theme form"`。

---

### Task 10: 结果卡片与复制/收藏

**Files:** Create `components/DishCard.tsx`、`components/DishGrid.tsx`、`tests/dish-card.test.tsx`

**Interfaces:** Consumes — `Dish`、`dishToText`。Produces — `<DishCard dish isFavorite onToggleFavorite onCopy />`；`<DishGrid dishes favorites onToggleFavorite />`。

- [ ] **Step 1:** 写测试：卡片显示菜名、标签、`心动值 88/100`、推荐理由、配料与步骤；点击复制调用 `navigator.clipboard.writeText(dishToText(dish))`；点击收藏触发回调；网格第一张卡片默认展开，其余折叠。
- [ ] **Step 2:** 运行，预期失败。
- [ ] **Step 3:** 实现卡片（菜名用衬线大字、心动值用细进度条、标签用小胶囊、配方区可折叠），网格桌面 3 列 / 平板 2 列 / 手机 1 列。
- [ ] **Step 4:** 运行，预期通过。
- [ ] **Step 5:** `git commit -m "feat: dish cards"`。

---

### Task 11: 历史与收藏抽屉

**Files:** Create `components/HistoryDrawer.tsx`、`components/FavoritesDrawer.tsx`、`tests/drawers.test.tsx`

**Interfaces:** Consumes — `loadHistory / loadFavorites / removeGeneration`。Produces — `<HistoryDrawer open onClose onRestore={(g: Generation) => void} />`、`<FavoritesDrawer open onClose onToggleFavorite />`。

- [ ] **Step 1:** 写测试：无数据时显示中文空状态；有数据时按时间倒序列出；点击历史项触发 `onRestore` 并关闭；收藏抽屉取消收藏后该项消失。
- [ ] **Step 2:** 运行，预期失败。
- [ ] **Step 3:** 实现：移动端从底部滑出、桌面从右侧滑出；`Esc` 关闭；遮罩点击关闭；焦点移入抽屉。
- [ ] **Step 4:** 运行，预期通过。
- [ ] **Step 5:** `git commit -m "feat: history and favorites drawers"`。

---

### Task 12: 转盘

**Files:** Create `lib/roulette.ts`、`components/RouletteWheel.tsx`、`tests/roulette.test.tsx`

**Interfaces:** Produces — `pickIndex(count: number, random?: () => number): number`；`<RouletteWheel dishes open onClose onPick={(index: number) => void} />`。

- [ ] **Step 1:** 写测试：`pickIndex(8)` / `pickIndex(10)` 结果在范围内且分布覆盖；`dishes.length < 2` 时转盘按钮禁用并提示；`prefers-reduced-motion` 命中时立即回调；正常时旋转结束后回调一次；8 段与 10 段都能渲染。
- [ ] **Step 2:** 运行，预期失败。
- [ ] **Step 3:** 实现：`conic-gradient` 按 `dishes.length` 动态等分 + 顶部指针；`transform: rotate()` + `cubic-bezier` 3 秒缓停；分段短标签；结果用 `aria-live="polite"` 播报；提供"再转一次"（不重新生成）。
- [ ] **Step 4:** 运行，预期通过；手动在桌面与手机各转 3 次，确认落点与高亮一致。
- [ ] **Step 5:** `git commit -m "feat: roulette wheel"`。

---

### Task 13: 生成状态机、错误态与整体 QA

**Files:** Modify `hooks/use-generate.ts`、`app/page.tsx`；Create `components/ErrorBanner.tsx`、`components/SkeletonGrid.tsx`、`tests/error-banner.test.tsx`、`tests/use-generate.test.tsx`

**Interfaces:** Consumes — `/api/generate`、`saveGeneration`、Task 5 的 401。Produces — `useGenerate(): { status, dishes, error, generate, reset }`，`status ∈ 'idle' | 'loading' | 'success' | 'error'`。

- [ ] **Step 1:** 写测试（mock `fetch`）：成功→`success` 且写入历史；每个错误码→对应中文文案；`MISSING_API_KEY` 文案含 `DEEPSEEK_API_KEY` 与 `.env.local`；`TOO_FEW` 文案带"再试一次"；401 时返回口令页标记；loading 期间再次调用被忽略（并发保护）。
- [ ] **Step 2:** 运行，预期失败。
- [ ] **Step 3:** 实现状态机与 `ErrorBanner`（错误码 → 一句人话 + 一个动作按钮：重试 / 稍后再试 / 去配置）。骨架屏 8–10 张卡片 + 计时提示。
- [ ] **Step 4:** 运行全部测试：`npx vitest run`，预期全绿；`npm run lint`、`npm run build` 均通过。
- [ ] **Step 5:** 手动 QA 清单（逐项打勾）：无 key 启动看到明确提示；正确 key 生成 8–10 道；转盘落点与高亮一致；复制内容可贴进微信；收藏后刷新仍在；历史恢复后可再转盘；375px 无横向滚动；刷新后口令仍有效。
- [ ] **Step 6:** `git commit -m "feat: generation states and error handling"`。
