<template>
  <div class="examples">
    <h2>See some examples:</h2>
    <ul>
      <li v-for="file in fileList" @click="onOpen(file)">{{ file }}</li>
    </ul>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const emit = defineEmits<{
  (e: 'selectExample', value: { buffer: ArrayBuffer; filename: string }): void;
}>();

const fileList = ref([]);
fetch(process.env.PUBLIC_PATH + 'samples/manifest.json')
  .then((res) => res.json())
  .then((arr) => {
    fileList.value = arr;
  });

function onOpen(filename: string) {
  fetch(process.env.PUBLIC_PATH + 'samples/' + filename)
    .then((res) => res.arrayBuffer())
    .then((buffer) => {
      emit('selectExample', { buffer, filename });
    });
}
</script>
<style scoped>
.examples {
  margin-bottom: 200px;
  margin-left: 50px;
}
h2 {
  font-size: 18px;
}
li {
  cursor: pointer;
  padding: 4px 0;
}
li:hover {
  color: #1c7dff;
}
</style>
