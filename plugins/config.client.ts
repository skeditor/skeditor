import { defineNuxtPlugin } from '#app';

export default defineNuxtPlugin((nuxtApp) => {
  (nuxtApp.vueApp.config as any).devtools = true;
});
