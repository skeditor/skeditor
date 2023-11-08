import { defineNuxtPlugin } from '#imports';

export default defineNuxtPlugin((nuxtApp) => {
  (nuxtApp.vueApp.config as any).devtools = true;
});
