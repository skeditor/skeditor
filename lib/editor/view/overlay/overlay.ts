import sk, { newStrokePaint } from '../../util/canvaskit';
import { SkyArtboardView, SkyBaseLayerView, SkyBaseView } from '..';
import { Ruler } from './ruler';
import { Rect, Point } from '../../base';
import { CornerView } from './corner';
import { SelectionView } from './selection-view';
import { RulerThickness } from '../const';
import { ArtBoardOverlayView } from './artboard-overlay';
import { SkyBoxView } from './box-view';

export class OverlayView extends SkyBaseView {
  private topRuler: Ruler;
  private leftRuler: Ruler;
  private corner: CornerView;
  private selectionView?: SelectionView;
  private artBoardOverlays: ArtBoardOverlayView[] = [];
  private hoverOverlay?: SelectionView;

  private frame = new Rect();

  children: SkyBoxView[] = [];

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

  findView() {
    return undefined;
  }

  layout() {
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

  setHoverView(layer: SkyBaseLayerView | undefined) {
    if (layer !== this.hoverOverlay?.layerView) {
      this.ctx.markDirty();
    }
    if (layer) {
      this.hoverOverlay = new SelectionView(layer);
    } else {
      this.hoverOverlay = undefined;
    }
  }

  addArtBoardOverlay(artBoardView: SkyArtboardView) {
    this.artBoardOverlays.push(new ArtBoardOverlayView(artBoardView));
  }

  unselect() {
    this.selectionView = undefined;
  }

  resetPage() {
    this.setHoverView(undefined);
    this.unselect();
    this.artBoardOverlays.length = 0;
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

    this.artBoardOverlays.forEach((view) => view.render());

    this.selectionView?.render();
    this.hoverOverlay?.render();
  }

  renderSelf() {
    this.ctx.skCanvas.drawRect(this.frame.inflate(-100).toSk(), newStrokePaint(2, sk.CanvasKit.RED));
  }
}
