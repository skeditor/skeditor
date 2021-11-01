import { defineNuxtConfig } from 'nuxt3';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';

export default defineNuxtConfig({
  ssr: false,
  target: 'static',
  modern: true,
  vite: false,
  buildModules: [
    '@nuxtjs/eslint-module',
    {
      handler: function () {
        this.nuxt.hook('webpack:config', (configs) => {
          configs.forEach((config) => {
            (config.resolve || (config.resolve = {})).fallback = {
              path: false,
              fs: false,
            };
          });
        });
      },
    },
  ],
  css: ['~/assets/global.css', 'vue3-perfect-scrollbar/dist/vue3-perfect-scrollbar.css'],
  plugins: ['~/plugins/config.client.ts'],
  build: {
    plugins: [new ForkTsCheckerWebpackPlugin()],
    // extend(config) {
    //   console.log('>>>> got config');
    //   process.exit();
    //   const node = config.node || (config.node = {});
    //   node.fs = 'empty';
    //   config.module.rules.push({
    //     test: /.wasm/i,
    //     type: 'javascript/auto',
    //   });
    // },
  },
});
