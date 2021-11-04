import path from 'path';
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

            const svgCompDir = path.join(__dirname, 'assets/svg-comp');

            config.module?.rules?.forEach((rule) => {
              if (typeof rule === 'object' && rule.test instanceof RegExp)
                if (rule.test.test('.svg')) {
                  rule.exclude = [svgCompDir];
                }
            });

            config.module?.rules?.push({
              test: /\.svg$/,
              include: [svgCompDir],
              use: [
                'vue-loader',
                path.resolve('./scripts/svg-comp-loader.js'),
                'svg-sprite-loader',
                {
                  loader: 'svgo-loader',
                  options: {
                    plugins: [
                      {
                        name: 'convertColors',
                        params: { currentColor: true },
                      },
                    ],
                  },
                },
              ],
            });
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
