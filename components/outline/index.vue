<template>
  <section style="width: 300px" class="outline">
    <Search />
    <Pages />
    <Layers />
  </section>
</template>

<script setup lang="ts">
import Search from './search.vue';
import Pages from './pages.vue';
import Layers from './layers.vue';
</script>
<style scoped>
.outline {
  background: #e6e6e6;
}
</style>
