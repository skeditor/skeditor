import sk, { defaultFonts } from '../../util/canvaskit';

// import { SkyLayerView, SkCanvas } from './base';
import { SkyBoxView } from './box-view';
import { Point } from '../../base/point';
import { SkParagraphStyle, SkPaint } from '../../model';
import { Rect } from '../../base/rect';

const DebugHideRuler = false;

export const RulerThickness = 25;

const RulerTextMarginLeft = 3;
const RulerTextMarginTop = 3;

let _linePaint: SkPaint;
export function getLinePaint() {
  if (_linePaint) return _linePaint;
  _linePaint = new sk.CanvasKit.Paint();
  _linePaint.setColor(sk.CanvasKit.Color(169, 169, 169));
  _linePaint.setStyle(sk.CanvasKit.PaintStyle.Stroke);
  _linePaint.setStrokeWidth(1);
  return _linePaint;
}

export class Ruler extends SkyBoxView {
  static RulerThickness = RulerThickness;

  _bgPaint?: SkPaint;
  _paraStyle: SkParagraphStyle;

  parentToLocal(pt: Point) {
    return pt;
  }

  constructor(frame: Rect, private isTop: boolean) {
    super(frame);

    this._paraStyle = new sk.CanvasKit.ParagraphStyle({
      textStyle: {
        color: sk.CanvasKit.BLACK,
        fontFamilies: defaultFonts,
        fontSize: 10,
      },
    });
  }

  createPara(text: string) {
    const builder = sk.CanvasKit.ParagraphBuilder.Make(this._paraStyle, this.ctx.fontMgr);
    builder.addText(text);
    const para = builder.build();
    para.layout(1e8);
    builder.delete();
    return para;
  }

  get bgPaint() {
    if (!this._bgPaint) {
      this._bgPaint = new sk.CanvasKit.Paint();
      this._bgPaint.setColor(sk.CanvasKit.WHITE);
    }
    return this._bgPaint;
  }

  get linePaint() {
    return getLinePaint();
  }

  /**
   * xBase, yBase
   * 标尺的偏移
   * 1 对应 page 下的 ruler base。
   * 2 在选中了 art board 的时候，转换到局部坐标系。
   */
  get xBase() {
    return this.ctx.zoomState.offset.x;
    // return 0;
  }

  get yBase() {
    return this.ctx.zoomState.offset.y;
    // return 0;
  }

  containsPoint() {
    return false;
  }

  renderSelf() {
    if (DebugHideRuler) return;
    const { width, height } = this.ctx.frame;
    const { skCanvas } = this.ctx;

    skCanvas.save();
    skCanvas.translate(this.frame.x, this.frame.y);

    if (this.isTop) {
      //   skCanvas.drawRect(sk.CanvasKit.XYWHRect(0, 0, width, RulerThickness), this.bgPaint);
      skCanvas.drawLine(0, RulerThickness, width, RulerThickness, this.linePaint);
      this.drawGroovesTop();
    } else {
      //   skCanvas.drawRect(sk.CanvasKit.XYWHRect(0, 0, RulerThickness, height), this.bgPaint);
      skCanvas.drawLine(RulerThickness, 0, RulerThickness, height, this.linePaint);
      this.drawGroovesLeft();
    }
    skCanvas.restore();
  }

  drawGroovesTop() {
    if (!this.ctx.zoomState) return;

    const { skCanvas } = this.ctx;
    const width = this.frame.width;

    const scale = this.ctx.zoomState.scale;

    // 水平偏移量，正数表示向右
    const offsetX = this.ctx.zoomState.position.x - this.xBase * scale;

    const representWidth = calcStep(scale);
    const actualWidth = representWidth * scale;

    // ruler 最左侧标注的值
    const rLeft = -(offsetX / scale);
    // ruler 最右侧标注的值
    const rRight = (width - offsetX) / scale;

    function rToA(r: number) {
      return r * scale + offsetX;
    }

    // represent left
    // first left block r left
    const rFirstBlock = Math.floor(rLeft / representWidth) * representWidth;

    for (let rX = rFirstBlock; rX < rRight; rX += representWidth) {
      // xL is represent x

      // actual x
      const x = rToA(rX);

      skCanvas.drawLine(x, 0, x, RulerThickness, this.linePaint);

      const para = this.createPara(rX + '');

      skCanvas.drawParagraph(para, x + RulerTextMarginLeft, RulerTextMarginTop);
      para.delete();

      const subStep = actualWidth / 10;
      for (let i = 1; i < 10; i++) {
        const subX = x + i * subStep;
        skCanvas.drawLine(subX, RulerThickness - 8, subX, RulerThickness, this.linePaint);
      }
    }
  }

  drawGroovesLeft() {
    const { skCanvas } = this.ctx;
    const height = this.frame.height;

    const scale = this.ctx.zoomState.scale;

    // 水平偏移量，正数表示向下
    const offsetY = this.ctx.zoomState.position.y - this.yBase * scale;

    const representWidth = calcStep(scale);
    const actualWidth = representWidth * scale;

    // ruler 最左侧标注的值
    const rTop = -(offsetY / scale);
    // ruler 最右侧标注的值
    const rBottom = (height - offsetY) / scale;

    function rToA(r: number) {
      return r * scale + offsetY;
    }

    // first top block r top
    const rFirstBlock = Math.floor(rTop / representWidth) * representWidth;

    for (let rY = rFirstBlock; rY < rBottom; rY += representWidth) {
      const y = rToA(rY);

      skCanvas.drawLine(0, y, RulerThickness, y, this.linePaint);

      const para = this.createPara(rY + '');

      skCanvas.save();
      skCanvas.translate(RulerTextMarginTop, y - RulerTextMarginLeft);
      skCanvas.rotate(-90, 0, 0);
      skCanvas.drawParagraph(para, 0, 0);
      para.delete();
      skCanvas.restore();

      const subStep = actualWidth / 10;
      for (let i = 1; i < 10; i++) {
        const subY = y + i * subStep;
        skCanvas.drawLine(RulerThickness - 8, subY, RulerThickness, subY, this.linePaint);
      }
    }
  }
}

function calcStep(scale: number) {
  // 一个大格子代表的宽度 100px
  // 0.5 < scale <= 1
  let representWidth = 100;

  if (scale <= 0.25) {
    // 非常小的时候，固定显示宽度 100
    representWidth = Math.floor(100 / scale / 10) * 10;
  }

  if (scale <= 0.5 && scale > 0.25) {
    representWidth = 200;
  }

  if (scale > 1 && scale <= 2) {
    representWidth = 50;
  }

  if (scale > 2 && scale <= 4) {
    representWidth = 20;
  }

  // 比较大的时候
  // 一个大格子固定代表 10 px，也就是一个小格子代表 1px
  if (scale > 4) {
    representWidth = 10;
  }

  return representWidth;
}
