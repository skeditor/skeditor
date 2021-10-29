import { Disposable } from '../base/disposable';
import { SkyBaseLayerView, SkyBaseView, SkyView } from '../view';
import { fromEvent } from 'rxjs';
import { Point } from '../base/point';
import { SkyBaseLayer } from '../model';

export class PointerController extends Disposable {
  selectedView: SkyBaseLayerView | undefined;

  constructor(private view: SkyView) {
    super();

    this._disposables.push(fromEvent(view.canvasEl, 'click').subscribe(this.onClick));
  }

  onClick = (_event: Event) => {
    const event = _event as MouseEvent;
    const { offsetX, offsetY } = event;
    // const view
    const pt = new Point(offsetX, offsetY);
    const targetView = this.findView(pt);

    this.select(targetView);
  };

  /**
   * 这里有两种方式，一种是 pixi.js 那样，把查找逻辑放在外面，好处是逻辑可以独立放在外面。
   * 另一种方法，可以像 faster 那样，在 view 上提供方法，进行递归查找，这样的好处是递归简单，children 还可以根据需要选择不同结构。
   * @param pt
   */
  findView(pt: Point): SkyBaseView | undefined {
    const pageView = this.view.pageView;
    if (!pageView) return;
    const targetView = pageView.findView(pt);

    return targetView;
  }

  select(view: SkyBaseView | undefined) {
    if (view instanceof SkyBaseLayerView) {
      this.selectedView?.unselect();
      view.select();
      this.selectedView = view;
    }
  }
}
