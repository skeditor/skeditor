<template>
  <div class="pages" :style="`height: ${height}px;`">
    <div class="bar">页面</div>
    <hr />
    <PerfectScrollbar>
      <div
        class="page-item"
        :class="{ ['page-item__active']: idx === selectedPageIndex }"
        v-for="(page, idx) in pagesRef"
        @click="selectPage(idx)"
      >
        {{ page }}
      </div>
    </PerfectScrollbar>
    <hr />
    <Sash :side="'bottom'" @dragStart="onDragStart" @offset="onOffset" />
  </div>
</template>
<script setup lang="ts">
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import Sash from '~/components/ui/sash.vue';
import { setupPages } from './pages-business';
import { useEditor } from '~/components/editor-state';

const { pagesRef, selectedPageIndex, selectPage } = useEditor();

const { height, onDragStart, onOffset } = setupPages();
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
  padding: 4px 0;
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
  cursor: default;
}

.page-item__active {
  background-color: black;
  color: white;
}
.page-item:hover {
  /* background-color: #cbccd9; */
}

hr {
  height: 1px;
  background-color: #cbc7cf;
  margin: 0;
  padding: 0;
  border: none;
}
</style>
