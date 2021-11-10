<template>
  <nav class="nav">
    <NavButton @click="pick"><FileOpenIcon /></NavButton>
    <slot />
    <div :style="paddingStyle"></div>
    <p class="doc-title text-overflow">{{ title }}</p>

    <NavButton @click="onExportSelection"><SlicingIcon /></NavButton>
    <NavButton @click="onScaleDown"><ScaleDownIcon /></NavButton>
    <NavButton style="width: 60px">
      <p class="p-scale">{{ scaleStr }}</p>
    </NavButton>
    <NavButton @click="onScaleUp"><ScaleUpIcon /></NavButton>
    <a href="https://github.com/mightyjiao/sketch-editor" target="_blank">
      <NavButton><GithubIcon /></NavButton>
    </a>
  </nav>
</template>
<script setup lang="ts">
import { computed, watch } from 'vue';
import NavButton from './nav-button.vue';
import GithubIcon from '~/assets/svg-comp/github.svg';
import ScaleUpIcon from '~/assets/svg-comp/scale-up.svg';
import ScaleDownIcon from '~/assets/svg-comp/scale-down.svg';
import SlicingIcon from '~/assets/svg-comp/slicing.svg';
import FileOpenIcon from '~/assets/svg-comp/file-open.svg';
import { EditorState } from './editor-state';
import { useSketchFilePicker } from './composables/file-picker';
import { useDropFile } from './composables/drop-file';
import { outlineWidth } from './outline/outline-business';

const emit = defineEmits<{
  (e: 'pick', value: File): void;
}>();

const { pick } = useSketchFilePicker((file) => emit('pick', file));
const scaleRef = EditorState.shared.usePageScale();

const scaleStr = computed(() => {
  const scale = scaleRef.value || 1;
  return `${Math.round(scale * 100)}%`;
});

function onExportSelection() {
  EditorState.shared.view?.exportSelection();
}

function onScaleUp() {
  EditorState.shared.view?.services.viewport.scaleUp();
}

function onScaleDown() {
  EditorState.shared.view?.services.viewport.scaleDown();
}

const title = computed(() => EditorState.shared.editorTitle);

const paddingStyle = computed(() => {
  return {
    width: `${outlineWidth.value}px`,
  };
});

watch(useDropFile(), (file) => {
  if (file) {
    emit('pick', file);
  }
});
</script>

<style scoped>
.nav {
  background: black;
  height: 36px;
  color: white;
  display: flex;
  z-index: 1000;
  position: relative;
  align-items: center;
}
.doc-title {
  font-size: 16px;
  flex: 1;
  text-align: center;
  /* position: absolute;
  height: 100%;
  left: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center; */
}
.p-scale {
  font-size: 12px;
  user-select: none;
}
</style>
