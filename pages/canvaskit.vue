<template>
  <canvas ref="canvasRef" width="800" height="800" />
</template>
<script setup lang="ts">
import { onMounted, getCurrentInstance, ref } from 'vue';
import { Rect } from '~/lib/editor/base';
import sk, { CanvaskitPromised, getFontMgr, newStrokePaint } from '~/lib/editor/util/canvaskit';

const ins = getCurrentInstance();
const canvasRef = ref<HTMLCanvasElement>();

onMounted(() => {
  CanvaskitPromised.then(() => {
    if (!canvasRef.value) return;
    draw(canvasRef.value);
  });
});

async function draw(el: HTMLCanvasElement) {
  const fontMgr = await getFontMgr();
  console.log('>>> font', fontMgr);
  const ctx = sk.CanvasKit.GetWebGLContext(el);
  const grCtx = sk.CanvasKit.MakeGrContext(ctx);
  const surface = sk.CanvasKit.MakeOnScreenGLSurface(grCtx, el.width, el.height, sk.CanvasKit.ColorSpace.SRGB)!;
  const canvas = surface.getCanvas()!;

  canvas.drawRect(new Rect(100, 100, 100, 100).toSk(), newStrokePaint(2, sk.CanvasKit.RED));

  surface.flush();
}
</script>
