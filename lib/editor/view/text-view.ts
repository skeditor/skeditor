import {
  SkColor,
  SketchFormat,
  SkyText,
  SkyTextStyle,
  StringAttributeAttributes,
  SkPath,
  SkPaint,
  SkyStringAttribute,
} from '../model';
import { SkyBaseLayerView, PathPainter } from './';
import sk, { defaultFonts, newStrokePaint, newColorPaint, SkParagraph, SkTextShadow } from '../util/canvaskit';

export class SkyTextView extends SkyBaseLayerView<SkyText> {
  _painter?: TextPainter;

  private get painter() {
    if (!this._painter) {
      this._painter = new TextPainter(this);
    }
    return this._painter;
  }

  get path() {
    return this.painter.path;
  }

  // Todo
  get pathWithTransform() {
    return this.path;
  }

  get shadowPath() {
    return undefined;
  }

  get hasFill() {
    return this.model.validFillCount > 0;
  }

  /**
   * 是否整体转换成 path 再进行绘制。
   * 1 fill/border gradient
   * 2 多个 fill
   * 3 inner shadow
   */
  get needPaintWithPath(): boolean {
    return this.model.hasInnerShadow || this.model.hasComplicatedPaint || this.model.validFillCount > 1;
  }

  invalidatePainter() {
    this._painter?.dispose();
    this._painter = undefined;
  }

  _tryClip() {
    const { skCanvas } = this.ctx;
    if (this.path) {
      skCanvas.clipPath(this.path, sk.CanvasKit.ClipOp.Intersect, false);
    }
  }

  _render() {
    this.painter.paint();
  }
}

type ParaPaintInfo = { baseY: number; paraArr: [SkParagraph, number][] };
class TextPainter {
  private textShadows?: SkTextShadow[];

  private textPaint?: SkPaint;
  private textBorderPaint?: SkPaint;

  constructor(private view: SkyTextView) {
    this.calcTextShadow();

    this.calcTextPaint();
  }

  private calcTextShadow() {
    this.textShadows = this.model.style?.shadows.map((shadow) => {
      return {
        color: shadow.color.skColor,
        blurRadius: shadow.blurRadius,
        offset: [shadow.offsetX, shadow.offsetY],
      } as SkTextShadow;
    });
  }

  // 这里提前计算了，没有写成 getter 为了方便点。
  // 不过这里可能用不上，因为可能 text 被当作 path 渲染。
  private calcTextPaint() {
    const border = this.model.style?.borders?.find((border) => border.isEnabled);
    const fill = this.model.style?.fills?.find((fill) => fill.isEnabled);

    if (border) {
      const paint = newStrokePaint(border.thickness);
      paint.setColor(border.color.skColor);
      this.textBorderPaint = paint;
    }

    if (fill) {
      const paint = newColorPaint(fill.color.skColor);
      this.textPaint = paint;
    }
  }

  get ctx() {
    return this.view.ctx;
  }

  get skCanvas() {
    return this.ctx.skCanvas;
  }

  get model() {
    return this.view.model;
  }

  get frame() {
    return this.view.frame;
  }

  private _cachePaintInfo?: ParaPaintInfo;
  private _cacheBorderPaintInfo?: ParaPaintInfo;

  private _path?: SkPath;

  get cachePaintInfo() {
    if (!this._cachePaintInfo) {
      this._cachePaintInfo = this.buildPaintInfo();
    }
    return this._cachePaintInfo;
  }

  get cacheBorderPaintInfo() {
    if (!this.textBorderPaint) return;
    if (!this._cacheBorderPaintInfo) {
      this._cacheBorderPaintInfo = this.buildPaintInfo(true);
    }
    return this._cacheBorderPaintInfo;
  }

  get path() {
    if (!this._path) {
      this._path = this.calcPath();
    }
    return this._path;
  }

  private _pathPainter?: PathPainter;

  get pathPainter() {
    if (!this._pathPainter) {
      this._pathPainter = new PathPainter(this.view);
    }
    return this._pathPainter;
  }

  get fontFamilies() {
    return defaultFonts;
  }

  // Line spacing ok
  // Todo letter spacing
  // Todo default line height 看起来 sketch 的和 skia 的不一样。
  // 默认 leading 有点奇怪，sketch 中的比例不知道如何计算出来的。 另外，
  paint() {
    if (this.view.needPaintWithPath) {
      this.pathPainter.paint();
    } else {
      // 同时有 border 的 fill 的时候要绘制两次
      // chrome 参考
      // https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/platform/graphics/graphics_context.cc;l=617;
      this.paintWith(this.cachePaintInfo);
      this.paintWith(this.cacheBorderPaintInfo);
    }
  }

  private paintWith(paintInfo: ParaPaintInfo | undefined) {
    if (!paintInfo) return;
    const { paraArr, baseY } = paintInfo;
    const { skCanvas } = this;

    paraArr.forEach(([para, y]) => {
      skCanvas.drawParagraph(para, 0, y + baseY);
    });
  }

  // Todo 位置有点偏移，看看什么原因。
  private calcPath() {
    const canvas = this.skCanvas;

    const { paraArr, baseY } = this.cachePaintInfo;
    const retPath = new sk.CanvasKit.Path();
    // console.log('>>>>', this.view.id);

    paraArr.forEach(([para, offset]) => {
      const path = para.getPath(canvas);
      // console.log('>>> raw', path.getBounds());

      const shiftPath = path.transform(sk.CanvasKit.Matrix.translated(0, offset + baseY));
      // console.log('>>> shift', shiftPath.getBounds());
      retPath.addPath(shiftPath);
      // console.log('>>> ret', retPath.getBounds());
    });
    return retPath;
  }

  private buildPaintInfo(isBorder = false): ParaPaintInfo {
    const { fontProvider } = this.ctx;
    const { attributedString, style } = this.model;
    const { frame } = this;
    const { string: text, attributes } = attributedString;

    const fgPaint = isBorder ? this.textBorderPaint : this.textPaint;

    const paraSpacing = style?.textStyle?.encodedAttributes.paragraphStyle?.paragraphSpacing || 0;

    const lines = text.split(/\r\n|\r|\n/);

    const lineSegs = this.breakLines(lines, attributes);

    let curY = 0;
    const paraArr = lines.map((line, idx) => {
      const segs = lineSegs[idx];
      const paraStyle = this.buildParaStyle(style?.textStyle);
      const builder = sk.CanvasKit.ParagraphBuilder.MakeFromFontProvider(paraStyle, fontProvider);

      segs.forEach((seg) => {
        const { length, location, attributes } = seg;

        const textStyle = this.buildTextStyle(attributes as any, isBorder);
        const segStr = transText(line.slice(location, location + length), attributes);
        // console.log(`>>>>|${segStr}|`, segStr.length);
        if (fgPaint) {
          builder.pushFgPaintStyle(textStyle, fgPaint);
        } else {
          builder.pushStyle(textStyle);
        }

        builder.addText(segStr);
        builder.pop();
      });

      const para = builder.build();
      builder.delete();
      if (frame.height / (paraStyle.textStyle?.fontSize || 12) > 2) {
        para.layout(frame.width);
      } else {
        para.layout(10e6);
      }
      const paraHeight = para.getHeight();

      const ret = [para, curY] as [SkParagraph, number];
      curY += paraHeight + paraSpacing;
      return ret;
    });

    const sumHeight = curY - paraSpacing;
    const baseY = verAlign(sumHeight, frame.height, style?.textStyle?.verticalAlignment || 0);

    return {
      baseY,
      paraArr,
    };
  }

  // hard break lines into segments.
  breakLines(lines: string[], segs: SkyStringAttribute[]): SkyStringAttribute[][] {
    segs = segs.slice(0);

    let curSeg = segs.shift();

    let lineBaseIdx = 0;

    return lines.map((line) => {
      const lineSegs = [] as SkyStringAttribute[];

      const lineStart = lineBaseIdx;
      const lineEnd = lineBaseIdx + line.length;

      while (curSeg) {
        const { location, length } = curSeg;

        const segStart = location;
        const segEnd = location + length;

        // overlaps
        if (!(segEnd <= lineStart || segStart >= lineEnd)) {
          const start = Math.max(segStart, lineStart);
          const end = Math.min(segEnd, lineEnd);
          const len = end - start;
          const loc = start - lineBaseIdx;
          lineSegs.push({
            ...curSeg,
            location: loc,
            length: len,
          });
        }

        // seg finished
        if (segEnd <= lineEnd) {
          curSeg = segs.shift();
        }

        // line finished
        if (lineEnd <= segEnd) {
          break;
        }
      }

      lineBaseIdx += line.length + 1;
      return lineSegs;
    });
  }

  // 文字样式相关
  // https://stackoverflow.com/questions/56799068/what-is-the-strutstyle-in-the-flutter-text-widget
  // https://api.flutter.dev/flutter/painting/StrutStyle-class.html
  // workspace/others/flutter-engine-master/lib/web_ui/lib/src/engine/canvaskit/text.dart

  // # 上下均匀的 leading 实现：
  // heightMultiplier: 1, leading: lineHeight/fontSize - 1,
  // sketch 的 leading 是上下均匀分配的，通过这种设置可以实现。
  // 而在 skia 中，设置了 multiplier 的时候，是按照 accent/descent 比例上下添加的。 一般造成上边空间更多。

  buildParaStyle(textStyle?: SkyTextStyle) {
    if (!textStyle) {
      return new sk.CanvasKit.ParagraphStyle({
        textStyle: {},
      });
    }

    const { encodedAttributes } = textStyle;
    const fontSize = encodedAttributes.MSAttributedStringFontAttribute.attributes.size;
    let heightMultiplier: number | undefined;
    let leadingMultiplier: number | undefined;

    // Todo, 这里的 minLineHeight 和 maxLineHeight 区别在哪？
    // sketch 未设置 lineHeight 的时候默认 lineHeight 如何计算？
    if (encodedAttributes.paragraphStyle?.maximumLineHeight) {
      heightMultiplier = encodedAttributes.paragraphStyle.maximumLineHeight / fontSize;
      leadingMultiplier = heightMultiplier - 1;
      heightMultiplier = 1;
    }

    // console.log('>>>> multiplier', heightMultiplier, leadingMultiplier);

    return new sk.CanvasKit.ParagraphStyle({
      textAlign: mapTextHorAlign(encodedAttributes.paragraphStyle?.alignment),
      textStyle: {
        color: encodedAttributes.MSAttributedStringColorAttribute
          ? sketchColorToSk(encodedAttributes.MSAttributedStringColorAttribute)
          : sk.CanvasKit.BLACK,
        fontFamilies: this.fontFamilies,
        fontSize,
      },
      strutStyle: {
        fontSize,
        strutEnabled: true,
        heightMultiplier: heightMultiplier,
        leading: leadingMultiplier,
        fontFamilies: this.fontFamilies,
        halfLeading: true,
        forceStrutHeight: true,
      },

      // heightMultiplier,
      // textHeightBehavior: CanvasKit.TextHeightBehavior.DisableAll,
    });
  }

  buildTextStyle(attr: StringAttributeAttributes, isBorder = false) {
    // let heightMultiplier: number | undefined;
    const fontSize = attr.MSAttributedStringFontAttribute.attributes.size;

    // if (attr.paragraphStyle?.maximumLineHeight) {
    //   heightMultiplier = attr.paragraphStyle.maximumLineHeight / fontSize;
    // }

    const decoration = isBorder
      ? sk.CanvasKit.NoDecoration
      : attr.strikethroughStyle
      ? sk.CanvasKit.LineThroughDecoration
      : attr.underlineStyle
      ? sk.CanvasKit.UnderlineDecoration
      : sk.CanvasKit.NoDecoration;

    // 每个 TextStyle 都是独立的， 它并不会从 paragraph 中继承属性。
    return new sk.CanvasKit.TextStyle({
      fontSize,
      fontFamilies: this.fontFamilies,
      letterSpacing: attr.kerning,
      decoration,
      color: isBorder
        ? sk.CanvasKit.TRANSPARENT
        : this.textPaint?.getColor() ||
          (attr.MSAttributedStringColorAttribute && attr.MSAttributedStringColorAttribute.skColor),
      // heightMultiplier,
      fontStyle: {
        weight: getHintFontWeight(attr.MSAttributedStringFontAttribute.attributes.name),
      },
      shadows: isBorder ? undefined : this.textShadows,
    });
  }

  dispose() {
    this._cachePaintInfo?.paraArr.forEach(([para]) => {
      para.delete();
    });
    this._cacheBorderPaintInfo?.paraArr.forEach(([para]) => {
      para.delete();
    });
    this._path?.delete();
    this._pathPainter?.dispose();
    this.textPaint?.delete();
    this.textBorderPaint?.delete();
  }
}

// https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight
// https://fonts.google.com/specimen/Roboto#standard-styles
function getHintFontWeight(fontName = '') {
  fontName = fontName.toLowerCase();
  const CanvasKit = sk.CanvasKit;
  const map = {
    thin: CanvasKit.FontWeight.Thin,
    light: CanvasKit.FontWeight.Light,
    lighter: CanvasKit.FontWeight.ExtraLight,
    regular: CanvasKit.FontWeight.Normal,
    normal: CanvasKit.FontWeight.Normal,
    bold: CanvasKit.FontWeight.Bold,
    black: CanvasKit.FontWeight.Black,
    ultra: CanvasKit.FontWeight.ExtraBold,
    extra: CanvasKit.FontWeight.ExtraBold,
  };
  for (const key in map) {
    if (fontName.includes(key)) {
      return map[key];
    }
  }

  return CanvasKit.FontWeight.Normal;
}

function mapTextHorAlign(align?: SketchFormat.TextHorizontalAlignment) {
  if (!align) return sk.CanvasKit.TextAlign.Left;
  const CanvasKit = sk.CanvasKit;
  return {
    [SketchFormat.TextHorizontalAlignment.Left]: CanvasKit.TextAlign.Left,
    [SketchFormat.TextHorizontalAlignment.Centered]: CanvasKit.TextAlign.Center,
    [SketchFormat.TextHorizontalAlignment.Right]: CanvasKit.TextAlign.Right,
    [SketchFormat.TextHorizontalAlignment.Justified]: CanvasKit.TextAlign.Justify,
    [SketchFormat.TextHorizontalAlignment.Natural]: CanvasKit.TextAlign.Left, // Todo ?????
  }[align];
}

// 根据垂直布局的设置，计算出 y 值。
function verAlign(contentHeight: number, boxHeight: number, align: SketchFormat.TextVerticalAlignment) {
  switch (align) {
    case SketchFormat.TextVerticalAlignment.Top:
      return 0;
    case SketchFormat.TextVerticalAlignment.Middle:
      return (boxHeight - contentHeight) / 2;
    case SketchFormat.TextVerticalAlignment.Bottom:
      return boxHeight - contentHeight;
  }
}

function transText(text: string, attr: StringAttributeAttributes) {
  switch (attr.MSAttributedStringTextTransformAttribute) {
    case SketchFormat.TextTransform.Lowercase:
      return text.toLowerCase();
    case SketchFormat.TextTransform.Uppercase:
      return text.toUpperCase();
    default:
      return text;
  }
}

function sketchColorToSk(color: SketchFormat.Color) {
  return sk.CanvasKit.Color((color.red * 256) | 0, (color.green * 256) | 0, (color.blue * 256) | 0, color.alpha);
}
