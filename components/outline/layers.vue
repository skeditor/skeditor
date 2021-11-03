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
      <LayerItem
        :layer="item"
        @toggle="onToggleOutlineGroup"
        @select="selectLayer"
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
import { ref, computed, watch } from 'vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import { userPerfectScrollbar } from '~/components/ui/scrollbar-composable';
import { useEditor } from '~/components/editor-state';
import LayerItem from './layer-item.vue';
import { SkyBaseLayer } from '~/lib/editor/model';

const scrollerRef = ref();
const realElRef = computed(() => scrollerRef.value?.$el);
userPerfectScrollbar(realElRef);

const {
  outlineListRef,
  onToggleOutlineGroup,
  selectedPageIndex,
  selectLayer,
  hoveredLayerIdRef,
  selectedLayerIdRef,
  onToggleLayerLock,
  onToggleLayerVisible,
  onPointerLeaveLayer,
  onPointerEnterLayer,
} = useEditor();

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
