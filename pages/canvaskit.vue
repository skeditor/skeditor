<template>
  <canvas ref="canvasRef" width="800" height="800" />
</template>
<script setup lang="ts">
import { onMounted, getCurrentInstance, ref } from 'vue';
import { Rect } from '~/lib/editor/base';
import sk, { CanvaskitPromised, getFontMgr, newColorPaint, newStrokePaint } from '~/lib/editor/util/canvaskit';

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

  const path = new sk.CanvasKit.Path();
  path.addRect(new Rect(100, 100, 100, 100).toSk());
  const path2 = path.copy();

  path.addRect(new Rect(250, 250, 1, 1).toSk());
  path.setFillType(sk.CanvasKit.FillType.InverseEvenOdd);

  const paint = newColorPaint(sk.CanvasKit.RED);
  paint.setMaskFilter(sk.CanvasKit.MaskFilter.MakeBlur(sk.CanvasKit.BlurStyle.Normal, 10, true));

  canvas.save();
  // canvas.translate(-10, 10);
  canvas.drawPath(path, paint);
  canvas.restore();

  canvas.drawPath(path2, newStrokePaint(2, sk.CanvasKit.BLACK));

  surface.flush();
}
</script>
