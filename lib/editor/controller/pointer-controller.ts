import { Disposable } from '../base/disposable';
import {
  SkyArtboardView,
  SkyBaseLayerView,
  SkyBaseView,
  SkyPageView,
  SkyShapeGroupView,
  SkySymbolInstanceView,
  SkyView,
} from '../view';
import { fromEvent } from 'rxjs';
import { Point } from '../base/point';
import { EditorState } from '~/components/editor-state';
import { ClassValue } from '../model';

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
    const start = Date.now();
    const targetView = this.findView(pt, event.metaKey);
    const cost = Date.now() - start;

    console.log('click find view', cost, offsetX, offsetY, targetView);
    this.select(targetView);
  };

  /**
   * 这里有两种方式，一种是 pixi.js 那样，把查找逻辑放在外面，好处是逻辑可以独立放在外面。
   * 另一种方法，可以像 faster 那样，在 view 上提供方法，进行递归查找，这样的好处是递归简单，children 还可以根据需要选择不同结构。
   * @param pt
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

  select(view: SkyBaseView | undefined) {
    if (view instanceof SkyBaseLayerView) {
      if (view instanceof SkyPageView) {
        EditorState.shared.unselectLayer();
      } else {
        EditorState.shared.selectLayer(view.model);
      }
      // this.selectedView?.unselect();
      // view.select();
      // this.selectedView = view;
    } else {
      EditorState.shared.unselectLayer();
    }
  }
}
