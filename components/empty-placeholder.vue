<template>
  <div
    class="empty"
    :class="{ active: active }"
    @mouseover="onMouseOver"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
  >
    <div class="content" @click="pick">
      <DropHereIcon class="drop-icon" />
      <p class="tip">Click or Drop Sketch Files Here</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import DropHereIcon from '~/assets/svg-comp/drop-here.svg';
import { ref } from 'vue';
import { useSketchFilePicker } from './composables/file-picker';
let active = ref(false);

const emit = defineEmits<{
  (e: 'pick', value: File): void;
}>();

const { pick } = useSketchFilePicker((file) => emit('pick', file));

function isDropFile(event: DragEvent) {
  const dropItems = Array.from(event.dataTransfer?.items || []);
  return dropItems.some((item) => {
    return item.kind === 'file';
  });
}

function onDragLeave() {
  active.value = false;
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  if (isDropFile(event)) {
    active.value = true;
  }
}

function onDragEnter(event: DragEvent) {
  event.preventDefault();
  if (isDropFile(event)) {
    active.value = true;
  }
}
function onMouseOver() {
  active.value = false;
}
</script>
<style scoped>
.empty {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909096;
}

.content {
  margin-bottom: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.content:hover {
  color: #1c7dff;
  cursor: pointer;
}

.empty.active {
  color: #1c7dff;
}
.tip {
  font-size: 24px;
  margin-top: 20px;
}
</style>
