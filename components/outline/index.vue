<template>
  <section :style="`width: ${width}px;`" class="outline">
    <Search />
    <Pages />
    <Layers />
    <Sash :side="'right'" @dragStart="onDragStart" @offset="onOffset" />
  </section>
</template>
<script lang="ts">
const InitWidth = 300;
const MinWidth = 250;
</script>
<script setup lang="ts">
import { ref } from 'vue';
import Search from './search.vue';
import Pages from './pages.vue';
import Layers from './layers.vue';
import Sash from '~/components/ui/sash.vue';

const width = ref(InitWidth);
let _dragStartWidth = 0;

function onDragStart() {
  _dragStartWidth = width.value;
}

function onOffset(offset: number) {
  width.value = Math.max(_dragStartWidth + offset, MinWidth);
}
</script>
<style scoped>
.outline {
  position: relative;
  background: #e6e6e6;
}
</style>
