const { default: invariant } = require('ts-invariant');

// 可以参考这个优化下
// https://github.com/JetBrains/svg-sprite-loader/tree/master/examples/custom-runtime-generator

module.exports = function patchFn(jsStr) {
  const target = 'export default symbol';

  invariant(jsStr.indexOf(target) !== -1, 'loader input error');
  return `
  <template>
    <svg class="icon-comp" :viewBox="symbol.viewBox" :width="width" :height="height">
    <use :xlink:href="'#' + symbol.id" />
    </svg>
  </template>
  <script>
    ${jsStr.replace(
      target,
      `
      const [x, y, width, height] = symbol.viewBox.split(' ');
      export default {
      data() {
        return {
          symbol,
          width,
          height,
        }
      },
    }`
    )}
  </script>
  `;
};
