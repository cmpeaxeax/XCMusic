<template>
  <!-- 加载动画 -->
  <div class="loading-spinner"></div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  name: "YLoading",
});
</script>

<style scoped>
@keyframes rotation {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.loading-spinner {
  margin: auto;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border-top: 3px solid rgb(var(--highlight-color-rgb));
  border-right: 3px solid transparent;
  -webkit-animation: rotation 1s linear infinite;
  animation: rotation 1s linear infinite;
}
</style>
