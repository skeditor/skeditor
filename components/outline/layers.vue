<template>
  <div class="layers">
    <RecycleScroller ref="scrollerRef" class="scroller" :items="list" :item-size="32" key-field="id" v-slot="{ item }">
      <div class="user">
        {{ item.text }}
      </div>
    </RecycleScroller>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import { userPerfectScrollbar } from '~/components/ui/scrollbar-composable';

const list = '*'
  .repeat(100)
  .split('')
  .map((v, idx) => ({
    id: idx,
    text: idx + '-',
  }));
const scrollerRef = ref();
const realElRef = computed(() => scrollerRef.value?.$el);
userPerfectScrollbar(realElRef);
</script>
<style scoped>
.layers {
  height: 0;
  flex: 1;
}
.layers > .scroller {
  height: 100%;
  overflow-y: hidden !important;
}
.user {
  height: 32px;
  border: 1px solid red;
}
</style>
<style src="vue-virtual-scroller/dist/vue-virtual-scroller.css"></style>
