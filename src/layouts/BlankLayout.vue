<!-- src/layouts/BlankLayout.vue —— 空白布局（Splash启动页/未来全屏沉浸页）-->
<template>
  <div class="blank-layout">
    <router-view />
  </div>
</template>

<style scoped>
.blank-layout {
  width: 100vw;
  min-height: 100vh;
  min-height: calc(var(--app-height, 100vh));
  overflow: hidden;
}
</style>
