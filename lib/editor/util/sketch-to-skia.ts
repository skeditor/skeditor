import { CanvaskitPromised } from './canvaskit';
import type {
  CanvasKit as CanvasKitType,
  Path as SkPath,
  Canvas,
  Shader,
  BlendMode,
  FontMgr,
  StrokeCap,
  StrokeJoin,
} from 'canvaskit-wasm';
import SketchFormat from '@sketch-hq/sketch-file-format-ts';
// import { Rect } from './rect';
// import { Point } from './point';
// import { ShapeGroupChildrenTypes } from './types';
import invariant from 'ts-invariant';

let CanvasKit: CanvasKitType;
CanvaskitPromised.then((kit) => {
  CanvasKit = kit;
  window['CanvasKit'] = CanvasKit;
});

export function sketchBlendToSk(mode: SketchFormat.BlendMode): BlendMode {
  return {
    [SketchFormat.BlendMode.Normal]: CanvasKit.BlendMode.Src,
    [SketchFormat.BlendMode.Darken]: CanvasKit.BlendMode.Darken,
    [SketchFormat.BlendMode.Multiply]: CanvasKit.BlendMode.Multiply,
    [SketchFormat.BlendMode.ColorBurn]: CanvasKit.BlendMode.ColorBurn,
    [SketchFormat.BlendMode.Lighten]: CanvasKit.BlendMode.Lighten,
    [SketchFormat.BlendMode.Screen]: CanvasKit.BlendMode.Screen,
    [SketchFormat.BlendMode.ColorDodge]: CanvasKit.BlendMode.ColorDodge,
    [SketchFormat.BlendMode.Overlay]: CanvasKit.BlendMode.Overlay,
    [SketchFormat.BlendMode.SoftLight]: CanvasKit.BlendMode.SoftLight,
    [SketchFormat.BlendMode.HardLight]: CanvasKit.BlendMode.HardLight,
    [SketchFormat.BlendMode.Difference]: CanvasKit.BlendMode.Difference,
    [SketchFormat.BlendMode.Exclusion]: CanvasKit.BlendMode.Exclusion,
    [SketchFormat.BlendMode.Hue]: CanvasKit.BlendMode.Hue,
    [SketchFormat.BlendMode.Saturation]: CanvasKit.BlendMode.Saturation,
    [SketchFormat.BlendMode.Color]: CanvasKit.BlendMode.Color,
    [SketchFormat.BlendMode.Luminosity]: CanvasKit.BlendMode.Luminosity,

    // 这两个没有，先凑个数
    [SketchFormat.BlendMode.PlusDarker]: CanvasKit.BlendMode.Darken,
    [SketchFormat.BlendMode.PlusLighter]: CanvasKit.BlendMode.Lighten,
  }[mode];
}

export function sketchStrokeCapToSk(cap: SketchFormat.LineCapStyle): StrokeCap {
  return {
    [SketchFormat.LineCapStyle.Butt]: CanvasKit.StrokeCap.Butt,
    [SketchFormat.LineCapStyle.Projecting]: CanvasKit.StrokeCap.Square,
    [SketchFormat.LineCapStyle.Round]: CanvasKit.StrokeCap.Round,
  }[cap];
}

export function sketchJoinStyleToSk(join: SketchFormat.LineJoinStyle): StrokeJoin {
  return {
    [SketchFormat.LineJoinStyle.Bevel]: CanvasKit.StrokeJoin.Bevel,
    [SketchFormat.LineJoinStyle.Miter]: CanvasKit.StrokeJoin.Miter,
    [SketchFormat.LineJoinStyle.Round]: CanvasKit.StrokeJoin.Round,
  }[join];
}

export function convertRadiusToSigma(radius: number) {
  return radius / 2;
}
