# 新手引导 · 首入流程设计（P1）

> 设计时间：2026-09-06
> 目标：玩家第一次打开《灵境·治愈小生物》时，用最少步骤理解「养宠 / 种植 / 听乐」核心循环，并知道公告铃铛的存在。
> 约束：纯本机、不依赖联机；与现有 hash 路由与 Splash 启动页接轨；不破坏现有 5 Tab 结构。

## 一、现状锚点（真实结构）
- 启动页：`/splash`（SplashPage，BlankLayout，无状态栏/Tab）
- 主框架：`/app`（AppLayout：状态栏 + 内容 + 条件 TabBar）
- 底部 5 Tab：`首页(home)` / `灵植(farm)` / `天籁(music)` / `仙宠(pet)` / `我的(me)`
- 二级页（slide-left，无 Tab）：`画境(gallery)` / `神龛(shrine)` / `法器(artifacts)` / `情绪瓶(bottle)` / `仙宠竞速(race)`
- stores 中**无** `onboard` / `firstVisit` / `guide` 等首访字段 → 引导为全新模块。

## 二、触发与判定
- 标志位：`localStorage` 键 `cc_onboarded`（或并入 `useUserStore` 持久化段）。
- 判定点：SplashPage `onMounted` 时读取；未置位 → 进入引导序列；已置位 → 直接进 `/app/home`。
- 重看入口：`我的(me)` 页新增「新手帮助」入口，可重新播放引导（不清空进度）。

## 三、引导序列（3 步，可跳过）
1. **欢迎 / 世界观**（1 屏）
   - 文案：「欢迎来到灵境。这里住着等你陪伴的小生物，慢慢来，不着急。」
   - 视觉：现有 Splash 背景 + 一行柔光标题。
2. **三步核心玩法**（1 屏，图文卡片）
   - 养仙宠 → 对应 Tab「仙宠(pet)」：轻抚小生物，好感度慢慢涨。
   - 种灵植 → 对应 Tab「灵植(farm)」：浇水、收集露水有惊喜。
   - 听天籁 → 对应 Tab「天籁(music)」：用音乐安抚心境。
3. **小提示**（1 屏）
   - 「首页右上角铃铛是系统公告，点开即已读；每天来一趟，小生物会更亲近你。」

CTA：「进入灵境」→ 置位 `cc_onboarded` → `router.replace('/app/home')`。
全程支持「跳过」→ 等同完成。

## 四、首入轻提示（可选增强）
- 首次进入首页后，对底部 5 Tab 做一次性脉冲高亮（按顺序闪过「仙宠 / 灵植 / 天籁」），引导视线。
- 仅首次触发，标志位 `cc_tabhint_done` 控制，避免每次打扰。

## 五、实现要点（落地时）
- 新增 `src/views/splash/OnboardingOverlay.vue`（或独立 `onboarding/` 组件），由 SplashPage 条件渲染。
- 状态：在 `useUserStore` 增加 `onboarded: boolean` 并加入 persist 白名单（与 `readNoticeIds` 同机制）。
- 文案与图片走内容外置思路，后期可由公告/运营位替换，不在组件里写死长文案。
- 不新增路由，避免与现有 hash 路由耦合；引导作为 Splash 的覆盖层。

## 六、验收
- 清 `cc_onboarded` 后首次启动必现引导；走完/跳过后再启动不再出现。
- 「我的 → 新手帮助」可重看，且不影响已有进度（好感度/灵植等）。
- 引导期间不触发联机请求（离线可用）。
