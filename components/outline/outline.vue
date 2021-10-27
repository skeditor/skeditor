<template>
  <section :style="`width: ${width}px;`" class="outline">
    <Search />
    <Pages />
    <Layers />
    <Sash :side="'right'" @dragStart="onDragStart" @offset="onOffset" />
  </section>
</template>
<script lang="ts"></script>
<script setup lang="ts">
import Search from './search.vue';
import Pages from './pages.vue';
import Layers from './layers.vue';
import Sash from '~/components/ui/sash.vue';
import { setupOutline } from './outline-business';

const { width, onDragStart, onOffset } = setupOutline();
</script>
<style scoped>
.outline {
  position: relative;
  background: #e6e6e6;
}
</style>
