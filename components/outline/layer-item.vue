<template>
  <div class="layer-item" @click="emit('select')">
    <div :style="spacingStyle"></div>
    <img
      v-if="isGroup"
      class="collapse-icon"
      :class="isGroupClosed && 'close'"
      src="~@/assets/imgs/img.chevron.down.11_Normal@2x.png"
      @click.stop="emit('toggle', layer as SkyBaseGroup)"
    />
    <div v-else class="collapse-icon"></div>
    <LayerIcon :layer="layer" />
    <p class="text-overflow flex-h-auto">{{ layer.name }}</p>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { SkyBaseGroup, SkyBaseLayer } from '~/lib/editor/model';
import LayerIcon from './layer-icon.vue';

const props = defineProps<{ layer: SkyBaseLayer }>();

const emit = defineEmits<{
  (event: 'toggle', layer: SkyBaseGroup): void;
  (event: 'select'): void;
}>();

// 都必须从 props 上获取，因为 layer 可能传入新的
const isGroup = computed(() => props.layer instanceof SkyBaseGroup);
const isGroupClosed = computed(() => props.layer instanceof SkyBaseGroup && !props.layer.isOutlineExpanded);

const spacingStyle = computed(() => ({
  width: props.layer.depth * 8 + 'px',
}));
</script>
<style scoped>
.layer-item {
  height: 26px;
  font-size: 12px;
  margin: 0 8px;
  display: flex;
  align-items: center;
  cursor: default;
}

.collapse-icon {
  width: 11px;
  height: 11px;
  margin-right: 4px;
}
.collapse-icon.close {
  transform: rotate(-90deg);
}
</style>
