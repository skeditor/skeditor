import { Rect } from '../../base';
import sk from '../../util/canvaskit';
import { RulerThickness } from '../const';
import { SkyBoxView } from './box-view';
import { getLinePaint } from './ruler';

export class CornerView extends SkyBoxView {
  constructor() {
    super(new Rect(0, 0, RulerThickness, RulerThickness));
    this.backgroundColor = sk.CanvasKit.WHITE;
  }
  renderSelf() {
    const paint = getLinePaint();
    const { skCanvas } = this.ctx;
    skCanvas.drawLine(0, RulerThickness, RulerThickness, RulerThickness, paint);
    skCanvas.drawLine(RulerThickness, 0, RulerThickness, RulerThickness, paint);
  }
}
