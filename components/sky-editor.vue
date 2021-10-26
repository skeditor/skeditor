<template>
  <section class="page">
    <nav class="nav">
      <h1>SkyEditor</h1>
      <select v-model="selectedFile" @change="onFileChange">
        <option v-for="(file, idx) in list" :key="idx">{{ file }}</option>
      </select>

      <select v-model="selectedPage" @change="onPageChange">
        <option v-for="(file, idx) in pages" :key="idx">{{ file }}</option>
      </select>

      <div class="flex-auto"></div>
      <button>open</button>
      <button>b</button>
      <FileButton @pick="onPickFile" />
    </nav>
    <div class="canvas-container" ref="canvasContainer"> </div>
    <!-- <DocOutline /> -->
    <!-- <Render /> -->
  </section>
</template>
<script lang="ts">
import JSZip from 'jszip';
import { CanvaskitPromised } from '../lib/editor/util/canvaskit';
import { SkyModel } from '../lib/editor/model';
import { SkyView } from '../lib/editor/view';
import { defineComponent } from 'vue';
import FileButton from './file-button.vue';

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

function openSketchArrayBuffer(buffer: ArrayBuffer, el: HTMLElement) {
  return JSZip.loadAsync(buffer).then(async (zipFile) => {
    console.log('>>> open', zipFile);

    await CanvaskitPromised;
    const skyModel = new SkyModel();
    await skyModel.readZipFile(zipFile);
    const view = await SkyView.create(skyModel, el);
    return [view, skyModel] as [SkyView, SkyModel];
  });
}

declare var window: Window &
  typeof globalThis & {
    skyView?: SkyView;
  };

export default defineComponent({
  components: {
    FileButton,
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
    fetch(docLists)
      .then((res) => res.json())
      .then((val) => {
        this.list = val;
        if (!this.selectedFile) {
          this.selectedFile = val[0];
        }

        this.loadFile();
      });
  },
  methods: {
    loadFile(this: any) {
      loadSketchFile(api + this.selectedFile).then((buffer) => this.openSketch(buffer));
    },

    openSketch(buffer: ArrayBuffer) {
      window.skyView?.dispose();
      openSketchArrayBuffer(buffer, this.$refs['canvasContainer'] as HTMLElement)
        .then(async ([view, model]) => {
          window.skyView = view;
          this.pages = model.pages.map((page) => {
            return page.name;
          });
          if (!this.selectedPage) {
            this.selectedPage = this.pages[0];
          }
          this.renderPage();
        })
        .catch((err) => {
          console.error('Cant load sketch file', err);
        });
    },

    onFileChange(this: any) {
      localStorage.setItem('lastChooseFile', this.selectedFile + '');
      this.loadFile();
    },

    onPageChange(this: any) {
      localStorage.setItem('lastChosePage', this.selectedPage + '');
      this.renderPage();
    },

    renderPage(this: any) {
      let idx = this.pages.indexOf(this.selectedPage);
      if (idx === -1) {
        idx = 0;
        this.selectedPage = this.pages[0];
      }
      window.skyView?.renderPage(idx);
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
.canvas-container {
  flex: 1;
  height: 0;
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
