import { SkyBaseView } from '../';
import sk, { newColorPaint, SkColor } from '../../util/canvaskit';
import { SkyShadow } from '../../model';
import { Rect, Point } from '../../base';

// box 使用最简单的 frame 定位方式
// 如果需要 rotate ，可以在外层加上一个 RotateView
export class SkyBoxView extends SkyBaseView {
  clip = true;
  backgroundColor?: SkColor;
  shadow?: SkyShadow;

  constructor(public frame: Rect = new Rect()) {
    super();
  }

  render() {
    // render({ cullRect }: RenderCtx) {
    const { skCanvas } = this.ctx;
    skCanvas.save();
    if (this.clip) {
      skCanvas.clipRect(this.frame.toSk(), sk.CanvasKit.ClipOp.Intersect, true);
    }
    this.renderBackground();
    this.renderSelf();
    // 注意 renderChildren 中有 translate ，是在外面 restore 的。
    this.renderChildren();
    skCanvas.restore();
  }

  parentToLocal(pt: Point) {
    return pt.clone().move(this.frame.x, this.frame.y);
  }

  renderSelf() {
    //
  }

  renderBackground() {
    const { skCanvas } = this.ctx;

    if (this.shadow) {
      const { color, blurRadius, offsetX, offsetY } = this.shadow;
      const paint = new sk.CanvasKit.Paint();
      paint.setColor(color.skColor);
      paint.setMaskFilter(sk.CanvasKit.MaskFilter.MakeBlur(sk.CanvasKit.BlurStyle.Normal, blurRadius / 2, true));
      skCanvas.drawRect(this.frame.offset(offsetX, offsetY).toSk(), paint);
    }

    if (this.backgroundColor) {
      skCanvas.drawRect(this.frame.toSk(), newColorPaint(this.backgroundColor));
    }
  }

  protected renderChildren() {
    if (!this.children.length) return;
    const { skCanvas } = this.ctx;
    skCanvas.translate(this.frame.x, this.frame.y);
    this.children.forEach((child) => child.visible && child.render());
  }

  containsPoint(pt: Point) {
    // const localPt = this.transform.localTransform.applyInverse(pt);
    return this.frame.containsPoint(pt);
  }
}
