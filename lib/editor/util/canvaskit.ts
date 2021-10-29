import type { CanvasKitInit, CanvasKit, FontMgr, InputColor } from 'canvaskit-wasm';
import type {
  Canvas as SkCanvas,
  Path as SkPath,
  Color as SkColor,
  ImageFilter as SkImageFilter,
  SkPicture,
  Shader as SkShader,
  Paint as SkPaint,
  Surface as SkSurface,
  FontMgr as SkFontMgr,
  GrDirectContext as SkGrDirectContext,
  Paragraph as SkParagraph,
  TextShadow as SkTextShadow,
  ParagraphStyle as SkParagraphStyle,
} from 'canvaskit-wasm';

// import * as CanvasKitInitFn from 'canvaskit-wasm';
// import canvaskitWasm from '!!file-loader!canvaskit-wasm/bin/canvaskit.wasm';

const CanvasKitInitFn = require('canvaskit-wasm');

let canvaskitWasm: any = undefined;

// node 环境下不需要 locateFile
if (process.env.NODE_ENV !== 'test') {
  canvaskitWasm = require('!!file-loader!canvaskit-wasm/bin/canvaskit.wasm');
  canvaskitWasm = canvaskitWasm.default || canvaskitWasm;
}

const sk = {} as {
  CanvasKit: CanvasKit;
};

export const CanvaskitPromised = (CanvasKitInitFn as any)({
  locateFile: canvaskitWasm && (() => canvaskitWasm),
}).then((CanvasKitRes) => {
  sk.CanvasKit = CanvasKitRes;
  (window as any).CanvasKit = CanvasKitRes;
  return sk.CanvasKit;
});

let fontMgr: FontMgr | undefined;

export const defaultFonts = ['Roboto', 'HarmonyOS Sans SC', 'Noto Color Emoji'];

// 使用的时候再调用，CanvasKit 可能还没好。
export function getFontMgr() {
  if (fontMgr) {
    return Promise.resolve(fontMgr!);
  }
  return Promise.all(
    ['/Roboto-Regular.ttf', '/HarmonyOSSansSC-Regular.ttf', '/colorfulemoji.woff2'].map((url) =>
      fetch(url).then((res) => res.arrayBuffer())
    )
  ).then((fonts) => {
    fonts.forEach((font) => {
      const hFont = new sk.CanvasKit.Font((sk.CanvasKit.FontMgr.RefDefault() as any).MakeTypefaceFromData(font), 72);
      console.log('>>> Font info:', hFont.getMetrics());
    });

    fontMgr = sk.CanvasKit.FontMgr.FromData(...fonts)!;

    fonts.forEach((_, i) => {
      console.log('>>> Font name: ', fontMgr?.getFamilyName(i));
    });
    return fontMgr!;
  });
}

export function newColorPaint(color: InputColor) {
  const paint = new sk.CanvasKit.Paint();
  paint.setColor(color);
  return paint;
}

export function newStrokePaint(width?: number, color?: InputColor) {
  const paint = new sk.CanvasKit.Paint();
  paint.setStyle(sk.CanvasKit.PaintStyle.Stroke);
  if (width !== undefined) {
    paint.setStrokeWidth(width);
  }
  if (color !== undefined) {
    paint.setColor(color);
  }
  return paint;
}

export default sk;

export {
  SkCanvas,
  SkPath,
  SkColor,
  SkImageFilter,
  SkPicture,
  SkPaint,
  SkShader,
  SkGrDirectContext,
  SkFontMgr,
  SkSurface,
  SkParagraph,
  SkTextShadow,
  SkParagraphStyle,
};
