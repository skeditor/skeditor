<template>
  <div class="pages" :style="`height: ${height}px;`">
    <div class="bar">页面</div>
    <hr />
    <PerfectScrollbar>
      <div class="page-item" v-for="i in 10"> hello </div>
    </PerfectScrollbar>
    <hr />
    <Sash :side="'bottom'" @dragStart="onDragStart" @offset="onOffset" />
  </div>
</template>
<script lang="ts">
const InitHeight = 150;
const MinHeight = 150;
</script>
<script setup lang="ts">
import { ref } from 'vue';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import Sash from '~/components/ui/sash.vue';

const height = ref(InitHeight);

let _dragStartHeight = 0;

function onDragStart() {
  _dragStartHeight = height.value;
}

function onOffset(offset: number) {
  height.value = Math.max(_dragStartHeight + offset, MinHeight);
}
</script>

<style scoped>
.pages {
  display: flex;
  flex-direction: column;
  position: relative;
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
