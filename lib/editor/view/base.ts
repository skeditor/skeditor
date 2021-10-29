import { Rect } from '../base/rect';
import { SkyView } from './sky-view';
import { SkyShadow } from '../model';
import { Point } from '../base/point';
import sk, { newColorPaint, SkColor } from '../util/canvaskit';

let viewId = 0;

export interface RenderCtx {
  cullRect: Rect;
}

export abstract class SkyBaseView {
  id: number;
  children: SkyBaseView[] = [];

  ctx: SkyView;
  parent?: SkyBaseView;

  constructor() {
    this.ctx = SkyView.currentContext;
    this.id = viewId++;
    if (process.env.NODE_ENV === 'development') {
      const obj = (window as any).viewMap || ((window as any).viewMap = {});
      obj[this.id] = this;
    }
  }

  get visible() {
    return true;
  }

  // get clipPath(): SkPath | undefined {
  //   return undefined;
  // }

  // 作用在 siblings 之间
  get breakClipChain() {
    return false;
  }

  get hasClip() {
    return false;
  }

  // clip 需要在 render 之后
  // 比较蛋疼的一点是，如果 clip 的时候需要 transform ，那么 restore 的时候会把 clip 也 清除掉
  tryClip() {}

  prependChild<T extends SkyBaseView>(child: T): T {
    child.parent = this;
    this.children.unshift(child);
    return child;
  }

  addChild<T extends SkyBaseView>(child: T): T {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  /**
   * @param point 在 parent 的坐标系中
   */
  abstract containsPoint(point: Point): boolean;

  abstract parentToLocal(pt: Point): Point;
  // {
  // const localPt = this.transform.localTransform.applyInverse(pt);

  // }

  // pt 在 parent 坐标系中
  findView(pt: Point) {
    const localPt = this.parentToLocal(pt);
    for (let i = this.children.length - 1; i >= 0; i--) {
      const childView = this.children[i];
      if (!childView.visible) continue;
      // const newPt = childView.transform.localTransform.applyInverse(pt);
      if (childView.containsPoint(localPt)) {
        return childView.findView(localPt) || childView;
      }
    }
    return undefined;
  }

  private _layoutDirty = true;

  markLayoutDirty() {
    this._layoutDirty = true;
  }

  layout() {
    if (!this._layoutDirty) return;

    this.layoutSelf();
    this.layoutChildren();

    this._layoutDirty = false;
  }

  layoutSelf() {}

  layoutChildren() {
    for (let i = 0; i < this.children.length; i++) {
      const childView = this.children[i];

      // 不可见还是要 layout 的，因为可能有 mask
      childView.layout();
    }
  }

  protected renderChildren() {
    // const { skCanvas } = this.ctx;

    let clipCount = 0;

    let isClipping = false;

    const { skCanvas } = this.ctx;

    for (let i = 0; i < this.children.length; i++) {
      const childView = this.children[i];

      // const childClipPath = childView.clipPath;

      // 即使不可见也应该能够 clip
      // if (childClipPath) {
      //   skCanvas.clipPath(childClipPath, sk.CanvasKit.ClipOp.Intersect, false);
      // }

      if ((childView.hasClip || childView.breakClipChain) && isClipping) {
        skCanvas.restore();
        isClipping = false;
      }

      if (childView.visible) {
        childView.render();
      }

      if (childView.hasClip) {
        skCanvas.save();
        childView.tryClip();
        isClipping = true;
      }
    }

    if (isClipping) {
      skCanvas.restore();
    }
    // while (clipCount--) {
    // skCanvas.restore();
    // }
    // skCanvas.restoreToCount()
  }

  debugString() {
    return `<${this.constructor.name}>(${this.id})`;
  }
  // abstract render(ctx: RenderCtx);
  abstract render();
}

// box 使用最简单的 frame 定位方式
// 如果需要 rotate ，可以在外层加上一个 RotateView
export class SkyBoxView extends SkyBaseView {
  clip = true;
  backgroundColor?: SkColor;
  shadow?: SkyShadow;

  constructor(public frame: Rect) {
    super();
  }

  render() {
    // render({ cullRect }: RenderCtx) {
    this.renderBackground();
    this.renderSelf();
    this.renderChildren();
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
    skCanvas.save();
    if (this.clip) skCanvas.clipRect(this.frame.toSk(), sk.CanvasKit.ClipOp.Intersect, true);
    // skCanvas.concat(this.transform.localTransform.toArray(false));
    skCanvas.translate(this.frame.x, this.frame.y);
    // this.children.forEach((child) => child.visible && child.render());
    super.renderChildren();
    skCanvas.restore();
  }

  containsPoint(pt: Point) {
    // const localPt = this.transform.localTransform.applyInverse(pt);
    return this.frame.containsPoint(pt);
  }
}
