<template>
  <section class="page">
    <nav class="nav">
      <h1>SkyEditor</h1>
      <select v-model="selectedFile" @change="onFileChange">
        <option v-for="(file, idx) in list" :key="idx">{{ file }}</option>
      </select>

      <div class="flex-auto"></div>
      <button>Save</button>
      <FileButton @pick="onPickFile" />
    </nav>
    <div class="editor-body">
      <Outline />
      <div class="canvas-container" ref="canvasContainer"> </div>
    </div>
    <!-- <DocOutline /> -->
    <!-- <Render /> -->
  </section>
</template>
<script lang="ts">
import { SkyView } from '../lib/editor/view';
import { defineComponent } from 'vue';
import FileButton from './file-button.vue';
import Outline from './outline/outline.vue';
import { EditorState } from './editor-state';
import { watch } from 'vue';

const docLists = 'http://localhost:3031/docs';
const api = 'http://localhost:3031/docs/';

async function loadSketchFile(url: string) {
  return fetch(url).then((res) => {
    if (res.status !== 200) {
      return Promise.reject(new Error('Load sketch file error: ' + res.status + ':' + res.statusText));
    }
    return res.arrayBuffer();
  });
}

declare var window: Window &
  typeof globalThis & {
    skyView?: SkyView;
  };

export default defineComponent({
  components: {
    FileButton,
    Outline,
  },
  data() {
    return {
      list: [],
      pages: [] as string[],
      selectedFile: (localStorage.getItem('lastChooseFile') || '') as string,
      selectedPage: (localStorage.getItem('lastChosePage') || '') as string,
    };
  },

  beforeDestroy() {
    window.skyView?.dispose();
  },

  mounted() {
    this.fetchLocalSketchFileList();

    watch(EditorState.shared.selectedPageIndex, (idx) => {
      localStorage.setItem('lastChosePage', this.pages[idx] + '');
    });
  },
  methods: {
    fetchLocalSketchFileList() {
      return fetch(docLists)
        .then(
          (res) => res.json(),
          (err) => {
            console.error(err);
            console.log('Cant find local files, please select or drop a file on this web app.');
          }
        )
        .then((val) => {
          this.list = val;
          if (!this.selectedFile) {
            this.selectedFile = val[0];
          }

          this.loadFile();
        });
    },
    loadFile(this: any) {
      loadSketchFile(api + this.selectedFile)
        .then((buffer) => this.openSketch(buffer))
        .catch((err) => {
          console.error(err);
          console.log('Cant load local files. Please check local development env.');
        });
    },

    async openSketch(buffer: ArrayBuffer) {
      await EditorState.shared.openSketchArrayBuffer(buffer, this.$refs['canvasContainer'] as HTMLElement);
      this.pages = EditorState.shared.pages;
      if (!this.selectedPage) {
        this.selectedPage = this.pages[0];
      }
      this.renderPage();
    },

    onFileChange(this: any) {
      localStorage.setItem('lastChooseFile', this.selectedFile + '');
      this.loadFile();
    },

    renderPage(this: any) {
      let idx = this.pages.indexOf(this.selectedPage);
      if (idx === -1) {
        idx = 0;
        this.selectedPage = this.pages[0];
      }

      EditorState.shared.selectPage(idx);
    },
    onPickFile(file: File) {
      file.arrayBuffer().then((buffer) => this.openSketch(buffer));
    },
  },
});
</script>
<style scoped>
.page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.nav {
  background: rgb(33, 31, 31);
  height: 32px;
  color: white;
  display: flex;
  align-items: center;
  padding: 0 12px;
  z-index: 1000;
  position: relative;
}

.editor-body {
  flex: 1;
  height: 0;
  display: flex;
}

.canvas-container {
  flex: 1;
  width: 0;
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
