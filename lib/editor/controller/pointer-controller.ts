import { Disposable } from '../base/disposable';
import {
  SkyArtboardView,
  SkyBaseLayerView,
  SkyPageView,
  SkyShapeGroupView,
  SkySymbolInstanceView,
  SkyView,
} from '../view';
import { fromEvent } from 'rxjs';
import { Point } from '../base/point';
import { ClassValue } from '../model';
import invariant from 'ts-invariant';
import { throttleTime } from 'rxjs/operators';

export class PointerController extends Disposable {
  selectedView: SkyBaseLayerView | undefined;

  constructor(private view: SkyView) {
    super();

    this._disposables.push(
      fromEvent(view.canvasEl, 'contextmenu').subscribe((event) => {
        const mEvent = event as MouseEvent;
        // ctrl 按左键，触发 context menu
        if (mEvent.button === 0) {
          event.preventDefault();
          this.onClick(event);
        }
      })
    );

    this._disposables.push(
      fromEvent(view.canvasEl, 'mousemove')
        .pipe(throttleTime(100))
        .subscribe((event) => {
          this.onHover(event as MouseEvent);
        })
    );

    // this._disposables.push(
    //   fromEvent(view.canvasEl, 'mousedown').subscribe((event) => {
    //     console.log('>>> mouse down');
    //     event.preventDefault();
    //   })
    // );

    this._disposables.push(fromEvent(view.canvasEl, 'click').subscribe(this.onClick));
  }

  private isDeepKey(event: MouseEvent) {
    return event.metaKey || event.ctrlKey;
  }

  onClick = (_event: Event) => {
    const event = _event as MouseEvent;

    const targetView = this.findViewFromEvent(event);
    this.view.selectLayer(targetView?.model);
  };

  onHover(event: MouseEvent) {
    const targetView = this.findViewFromEvent(event);
    this.view.hoverLayer(targetView?.model);
  }

  findViewFromEvent(event: MouseEvent) {
    const { offsetX, offsetY } = event;
    const pt = new Point(offsetX, offsetY);

    // const start = Date.now();
    const targetView = this.findView(pt, this.isDeepKey(event));
    // const cost = Date.now() - start;
    // console.log('Find view', cost, offsetX, offsetY, targetView);

    invariant(!(targetView instanceof SkyPageView), 'Cant select page view. It should be undefined');
    return targetView;
  }

  /**
   * @param pt 相对 canvas 的坐标
   * @param deepest deep select
   */
  findView(pt: Point, deepest: boolean): SkyBaseLayerView | undefined {
    const pageView = this.view.pageView;
    if (!pageView) return;

    if (!pageView.containsPoint(pt)) return;

    return deepest ? this.findViewDeep(pageView, pt) : this.findViewFirst(pageView, pt);
  }

  private findViewFirst(pageView: SkyPageView, pt: Point) {
    for (let i = pageView.children.length - 1; i >= 0; i--) {
      const layer = pageView.children[i];
      const type = layer.model._class;

      if (
        layer.interactive &&
        ((type === ClassValue.Artboard && layer.containsPoint(pt)) || type === ClassValue.SymbolMaster)
      ) {
        for (let t = layer.children.length - 1; t >= 0; t--) {
          const subLayer = layer.children[t];
          if (subLayer.interactive && subLayer.containsPoint(pt)) {
            return subLayer;
          }
        }
      } else {
        if (layer.interactive && layer.containsPoint(pt)) {
          return layer;
        }
      }
    }
    return undefined;
  }

  private findViewDeep(pageView: SkyPageView, pt: Point) {
    let curLayer: SkyBaseLayerView = pageView;

    while (curLayer.children.length > 0) {
      let foundChild = false;
      for (let i = curLayer.children.length - 1; i >= 0; i--) {
        const child = curLayer.children[i];
        if (child.interactive && child.containsPoint(pt)) {
          foundChild = true;

          // symbol instance、 shape group 是不行的
          const canExploreChildren = !(child instanceof SkySymbolInstanceView || child instanceof SkyShapeGroupView);

          if (canExploreChildren) {
            curLayer = child;
            break;
          } else {
            return child;
          }
        }
      }
      if (!foundChild || curLayer.children.length === 0) {
        if (curLayer instanceof SkyArtboardView || curLayer instanceof SkyPageView) {
          return undefined;
        } else {
          return curLayer;
        }
      }
    }

    return undefined;
  }
}
