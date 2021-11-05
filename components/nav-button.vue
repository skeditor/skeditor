<template>
  <div class="nav-button">
    <slot />
  </div>
</template>
<script setup lang="ts"></script>
<style scoped>
.nav-button {
  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 36px;
  color: white;
}
.nav-button:hover,
.nav-button:active {
  background-color: #333333;
}
</style>
