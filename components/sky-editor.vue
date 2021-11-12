<template>
  <section class="page">
    <Nav @pick="onPickFile">
      <select v-if="list && list.length" v-model="selectedFile" @change="onFileChange">
        <option v-for="(file, idx) in list" :key="idx">{{ file }}</option>
      </select>
    </Nav>
    <div class="editor-body">
      <Outline v-if="sideBarOpen" />
      <div class="canvas-container" ref="canvasContainer">
        <EmptyPlaceholder v-if="isEmpty" @pick="onPickFile">
          <Examples @selectExample="onSelectExample" />
        </EmptyPlaceholder>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import FileButton from './file-button.vue';
import Outline from './outline/outline.vue';
import { EditorState } from './editor-state';
import EmptyPlaceholder from './empty-placeholder.vue';
import { watch } from 'vue';
import Nav from './nav.vue';
import Examples from './examples.vue';
import { localStorageRef } from './composables/localstorage';
import { ref, onMounted } from 'vue';

const docLists = 'http://localhost:3031/docs';
const api = 'http://localhost:3031/docs/';

const isEmpty = ref(true);
const list = ref([]);
const pages = ref([] as string[]);
const selectedFile = localStorageRef('LastChooseFile', '');
const selectedPage = localStorageRef('LastChosePage', '');
const sideBarOpen = EditorState.shared.showSidebar;

const canvasContainer = ref();

onMounted(() => {
  fetchLocalSketchFileList();

  watch(EditorState.shared.selectedPageIndex, (idx) => {
    selectedPage.value = pages.value[idx];
  });
});

function fetchLocalSketchFileList() {
  return fetch(docLists)
    .then((res) => res.json())
    .then((val) => {
      list.value = val;
      if (!selectedFile.value) {
        selectedFile.value = val[0];
      }

      loadFile();
    })
    .catch(() => {
      console.log('Cant find local files, please select or drop a file on this web app.');
    });
}
function loadSketchFile(url: string) {
  return fetch(url).then((res) => {
    if (res.status !== 200) {
      return Promise.reject(new Error('Load sketch file error: ' + res.status + ':' + res.statusText));
    }
    return res.arrayBuffer();
  });
}
function loadFile() {
  loadSketchFile(api + selectedFile.value)
    .then((buffer) => openSketch(selectedFile.value, buffer))
    .catch((err) => {
      console.error(err);
      console.log('Cant load local files. Please check local development env.');
    });
}

async function openSketch(filename: string, buffer: ArrayBuffer) {
  await EditorState.shared.openSketchArrayBuffer(removeExt(filename), buffer, canvasContainer.value as HTMLElement);
  isEmpty.value = false;
  pages.value = EditorState.shared.pages;
  if (!selectedPage.value) {
    selectedPage.value = pages.value[0];
  }
  renderPage();
}

function onFileChange() {
  loadFile();
}

function renderPage() {
  let idx = pages.value.indexOf(selectedPage.value);
  if (idx === -1) {
    idx = 0;
    selectedPage.value = pages.value[0];
  }
  EditorState.shared.selectPage(idx);
}
function removeExt(str: string) {
  const extIdx = str.toLowerCase().lastIndexOf('.sketch');
  return str.slice(0, extIdx);
}
function onPickFile(file: File) {
  file.arrayBuffer().then((buffer) => openSketch(file.name, buffer));
}

function onSelectExample({ buffer, filename }) {
  openSketch(filename, buffer);
}
</script>
<style scoped>
.page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
/* .nav {
  background: rgb(33, 31, 31);
  height: 32px;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 12px;
  z-index: 1000;
  position: relative;
} */

.editor-body {
  flex: 1;
  height: 0;
  display: flex;
}

.canvas-container {
  flex: 1;
  width: 0;
  position: relative;
}

h1 {
  font-size: 16px;
  font-family: sans-serif;
  margin-right: 12px;
}
.flex-auto {
  width: 0;
  flex: 1;
}
</style>
