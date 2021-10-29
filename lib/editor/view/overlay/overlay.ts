import { SkyBoxView } from './box-view';
import sk, { newStrokePaint } from '../../util/canvaskit';
// import { Rect } from '../../base';
import { SkyView } from '..';
import { Ruler, RulerThickness } from './ruler';
import { Rect } from '../../base';
import { CornerView } from './corner';

export class OverlayView extends SkyBoxView {
  topRuler: Ruler;
  leftRuler: Ruler;
  corner: CornerView;
  constructor(skyView: SkyView) {
    super(skyView.frame);

    this.topRuler = this.addChild(new Ruler(true));
    this.leftRuler = this.addChild(new Ruler(false));
    this.corner = this.addChild(new CornerView());
  }

  layoutSelf() {
    this.frame = this.ctx.frame;

    const pageViewportWidth = this.frame.width - RulerThickness;
    const pageViewportHeight = this.frame.height - RulerThickness;

    this.leftRuler.frame = new Rect(0, RulerThickness, RulerThickness, pageViewportHeight);
    this.topRuler.frame = new Rect(RulerThickness, 0, pageViewportWidth, RulerThickness);
  }

  renderSelf() {
    this.ctx.skCanvas.drawRect(this.frame.inflate(-100).toSk(), newStrokePaint(2, sk.CanvasKit.RED));
  }
}
