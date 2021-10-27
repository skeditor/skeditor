<template>
  <div ref="sashEl" :style="style" class="sash"></div>
</template>
<!-- 需要 parent relative/absolute 定位。 然后再指定 sash 的位置-->
<script setup lang="ts">
import { ref, watch } from 'vue';
import { useDrag } from './drag';

const emit = defineEmits<{
  (e: 'dragStart'): void;
  (e: 'offset', offset: number): void;
}>();

const props = defineProps<{ side: 'right' | 'bottom' | 'top' | 'left' }>();

const _isHor = props.side === 'bottom' || props.side === 'top';

const style = {
  width: _isHor ? '100%' : '6px',
  height: _isHor ? '6px' : '100%',
  cursor: _isHor ? 'ns-resize' : 'ew-resize',
  top: _isHor ? undefined : '0px',
  left: _isHor ? '0px' : undefined,
  [props.side]: '-3px',
};

const sashEl = ref<HTMLElement>();

const _dragEvents = useDrag(sashEl, style.cursor);

watch(_dragEvents.dragStart, () => {
  emit('dragStart');
});
watch(_dragEvents.offset, (offset) => {
  const _offset = _isHor ? offset.y : offset.x;
  emit('offset', _offset);
});
</script>
<style scoped>
.sash {
  position: absolute;
  /* background-color: red; */
}
</style>
