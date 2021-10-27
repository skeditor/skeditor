<template>
  <input ref="input" @change="onFilePicked" type="file" accept=".sketch" style="display: none" />
  <button @click="onClick">Open File</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'pick', value: File): void;
}>();

const input = ref<HTMLInputElement>();

function onClick() {
  input.value?.click();
}
function onFilePicked() {
  const files = input.value?.files;
  if (files && files.length > 0) {
    emit('pick', files[0]);
  }
}
</script>
