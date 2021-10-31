import { SkyBoxView } from './box-view';
import sk, { newStrokePaint } from '../../util/canvaskit';
// import { Rect } from '../../base';
import { SkyBaseLayerView, SkyBaseView, SkyView } from '..';
import { Ruler } from './ruler';
import { Rect, Point } from '../../base';
import { CornerView } from './corner';
import { SelectionView } from './selection-view';
import { RulerThickness } from '../const';

export class OverlayView extends SkyBaseView {
  private topRuler: Ruler;
  private leftRuler: Ruler;
  private corner: CornerView;
  private selectionView?: SelectionView;

  private frame = new Rect();

  constructor() {
    super();

    this.topRuler = this.addChild(new Ruler(true));
    this.leftRuler = this.addChild(new Ruler(false));
    this.corner = this.addChild(new CornerView());
  }

  addChild<T extends SkyBaseView>(view: T) {
    view.parent = this;
    return view;
  }

  layoutSelf() {
    this.frame = this.ctx.frame.clone();

    const pageViewportWidth = this.frame.width - RulerThickness;
    const pageViewportHeight = this.frame.height - RulerThickness;

    this.leftRuler.frame = new Rect(0, RulerThickness, RulerThickness, pageViewportHeight);
    this.topRuler.frame = new Rect(RulerThickness, 0, pageViewportWidth, RulerThickness);
  }

  addSelection(layer: SkyBaseLayerView) {
    if (this.selectionView) {
      const idx = this.children.indexOf(this.selectionView);
      if (idx !== -1) {
        this.children.splice(idx, 1);
      }
    }
    this.selectionView = this.addChild(new SelectionView(layer));
  }

  unselect() {
    this.selectionView = undefined;
  }

  containsPoint() {
    return true;
  }

  parentToLocal(pt: Point) {
    return pt;
  }

  render() {
    this.renderChildren();
    // this.renderSelf();
  }

  renderChildren() {
    const { skCanvas, pageFrame } = this.ctx;
    skCanvas.save();
    [this.topRuler, this.leftRuler, this.corner].forEach((view) => view.render());

    skCanvas.clipRect(pageFrame.toSk(), sk.CanvasKit.ClipOp.Intersect, true);
    this.selectionView?.render();
  }

  renderSelf() {
    this.ctx.skCanvas.drawRect(this.frame.inflate(-100).toSk(), newStrokePaint(2, sk.CanvasKit.RED));
  }
}
