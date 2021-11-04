<template>
  <div class="layers">
    <RecycleScroller
      ref="scrollerRef"
      class="scroller"
      :items="outlineListRef"
      :item-size="RowHeight"
      key-field="objectId"
      v-slot="{ item }"
    >
      <LayerItem
        :layer="item"
        @dblclick="focusLayer(item)"
        @click="selectLayer(item)"
        @toggle="onToggleOutlineGroup"
        @toggleLock="onToggleLayerLock"
        @toggleVisible="onToggleLayerVisible"
        :selected="selectedLayerIdRef === (item as SkyBaseLayer).objectId"
        :hovered="hoveredLayerIdRef === (item as SkyBaseLayer).objectId"
        @mouseenter="onPointerEnterLayer(item as SkyBaseLayer)"
        @mouseleave="onPointerLeaveLayer"
      />
    </RecycleScroller>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import { userPerfectScrollbar } from '~/components/ui/scrollbar-composable';
import { EditorState } from '~/components/editor-state';
import LayerItem from './layer-item.vue';
import { SkyBaseLayer } from '~/lib/editor/model';

const scrollerRef = ref();
const realElRef = computed(() => scrollerRef.value?.$el as HTMLElement | undefined);
userPerfectScrollbar(realElRef);

const RowHeight = 26;

const {
  outlineListRef,
  onToggleOutlineGroup,
  selectedPageIndex,
  selectLayer,
  focusLayer,
  hoveredLayerIdRef,
  selectedLayerIdRef,
  onToggleLayerLock,
  onToggleLayerVisible,
  onPointerLeaveLayer,
  onPointerEnterLayer,
} = EditorState.shared;

watch(selectedLayerIdRef, () => {
  nextTick(() => {
    const selectedLayer = EditorState.shared.selectedLayerModel;
    const containerEl = realElRef.value;
    if (!selectedLayer || !containerEl) return;

    const list = outlineListRef.value;
    const idx = list.indexOf(selectedLayer);

    if (idx === -1) return;

    const viewportHeight = containerEl.clientHeight;
    const start = containerEl.scrollTop;
    const end = start + viewportHeight;

    const startIdx = Math.ceil(start / RowHeight);
    const endIdx = Math.floor(end / RowHeight);

    // 移动到最近可见区域

    // top
    if (idx <= startIdx) {
      containerEl.scrollTop = idx * RowHeight;
    }

    // bottom
    if (idx >= endIdx) {
      containerEl.scrollTop = idx * RowHeight - viewportHeight + RowHeight;
    }
  });
});

watch(selectedPageIndex, () => {
  if (realElRef.value) {
    (realElRef.value as HTMLElement).scrollTop = 0;
  }
});
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
