import { SkyView } from './sky-view';
import { Point } from '../base/point';

let viewId = 0;

// export interface RenderCtx {
//   cullRect: Rect;
// }

/**
 * Todo
 * 1 ctx 考虑拆除去
 * 2 继续精简下，看看 layout 是不是需要放在这里
 * 3 方法都改成 abstract
 */
export abstract class SkyBaseView {
  id: number;
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

  /**
   * pt 是相对 canvas 的坐标系
   */
  abstract findView(pt: Point): SkyBaseView | undefined;

  /**
   * @param point 在 parent 的坐标系中
   */
  // abstract containsPoint(point: Point): boolean;

  // abstract parentToLocal(pt: Point): Point;

  // pt 在 parent 坐标系中
  // findView(pt: Point) {
  //   const localPt = this.parentToLocal(pt);
  //   for (let i = this.children.length - 1; i >= 0; i--) {
  //     const childView = this.children[i];
  //     if (!childView.visible) continue;
  //     // const newPt = childView.transform.localTransform.applyInverse(pt);
  //     if (childView.containsPoint(localPt)) {
  //       return childView.findView(localPt) || childView;
  //     }
  //   }
  //   return undefined;
  // }

  debugString() {
    return `<${this.constructor.name}>(${this.id})`;
  }
  abstract render(): void;
  abstract layout(): void;
}
