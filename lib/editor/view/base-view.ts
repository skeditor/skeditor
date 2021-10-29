import { SkyView } from './sky-view';
import { Point } from '../base/point';

let viewId = 0;

// export interface RenderCtx {
//   cullRect: Rect;
// }

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
    // 这里叫 mask 比 clip 好点
    let isMasking = false;

    const { skCanvas } = this.ctx;

    for (let i = 0; i < this.children.length; i++) {
      const childView = this.children[i];

      if ((childView.hasClip || childView.breakClipChain) && isMasking) {
        skCanvas.restore();
        isMasking = false;
      }

      if (childView.visible) {
        childView.render();
      }

      if (childView.hasClip) {
        skCanvas.save();
        childView.tryClip();
        isMasking = true;
      }
    }

    if (isMasking) {
      skCanvas.restore();
    }
  }

  debugString() {
    return `<${this.constructor.name}>(${this.id})`;
  }
  // abstract render(ctx: RenderCtx);
  abstract render();
}
