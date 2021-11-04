<template>
  <div
    class="empty"
    :class="{ active: active }"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div class="content" @click="pick">
      <DropHereIcon class="drop-icon" />
      <p class="tip">Drop Sketch Files Here</p>
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

function onDrop(event: DragEvent) {
  event.preventDefault();
  active.value = false;
  const file = Array.from(event.dataTransfer?.files || []).find((file) => {
    return file.name.toLowerCase().endsWith('.sketch');
  });
  if (file) {
    emit('pick', file);
  } else {
    alert('It it not a sketch file!');
  }
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
