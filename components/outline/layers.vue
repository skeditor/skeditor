<template>
  <div class="layers">
    <RecycleScroller
      ref="scrollerRef"
      class="scroller"
      :items="outlineListRef"
      :item-size="26"
      key-field="objectId"
      v-slot="{ item }"
    >
      <LayerItem :layer="item" @toggle="onToggleOutlineGroup" />
    </RecycleScroller>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import { userPerfectScrollbar } from '~/components/ui/scrollbar-composable';
import { useEditor } from '~/components/editor-state';
import LayerItem from './layer-item.vue';

const scrollerRef = ref();
const realElRef = computed(() => scrollerRef.value?.$el);
userPerfectScrollbar(realElRef);

const { outlineListRef, onToggleOutlineGroup } = useEditor();
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
