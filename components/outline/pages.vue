<template>
  <div class="pages" style="height: 150px">
    <div class="bar">页面</div>
    <hr />
    <PerfectScrollbar>
      <div class="page-item" v-for="i in 10"> hello </div>
    </PerfectScrollbar>
    <hr />
  </div>
</template>
<script setup lang="ts">
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
</script>
<style src="vue3-perfect-scrollbar/dist/vue3-perfect-scrollbar.css"></style>

<style scoped>
.pages {
  padding: 8px 0;
  display: flex;
  flex-direction: column;
}
.bar {
  font-size: 14px;
  color: #707070;
  margin: 8px;
}
.ps {
  height: 0;
  flex: 1;
}

.page-item {
  font-size: 12px;
  color: #1f1f1f;
  border-radius: 4px;
  height: 26px;
  padding-left: 20px;
  display: flex;
  align-items: center;
  margin: 0 8px;
}
.page-item:hover {
  background-color: #cbccd9;
}

hr {
  height: 1px;
  background-color: #cbc7cf;
  margin: 0;
  padding: 0;
  border: none;
}
</style>
