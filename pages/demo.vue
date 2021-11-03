<template>
  <div>
    Demo
    <LockLock />
    r2 {{ r2 }}
    <button @click="r1++ && logXXXX(2)"></button>
  </div>
</template>
<script setup lang="ts">
import LockLock from '~/assets/svg-comp/lock-lock.svg';
import { ref, computed } from 'vue';
const r1 = ref(10);
const r2 = computed(() => {
  return computed(() => {
    console.log(1);
    return ref(r1.value * 2);
  });
});
const logXXXX = (x) => console.log(x);
</script>
