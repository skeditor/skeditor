/**
 * Layer 的选中框
 * 给定一个 layer view。 计算出它在 page 中的范围。
 * 每次绘制的时候通过 scale/translate，重新计算 frame，而不是应用 scale。
 * 确保 stroke-width 固定。
 */
import { SkyBaseLayerView } from '..';
import sk, { CanvaskitPromised, newStrokePaint, SkColor } from '../../util/canvaskit';
import { SkyBoxView } from './box-view';

let color: SkColor;
let color2: SkColor;
CanvaskitPromised.then(() => {
  color = sk.CanvasKit.Color(21, 129, 205, 1);
  color2 = sk.CanvasKit.Color(21, 129, 205, 0.6);
});

export class SelectionView extends SkyBoxView {
  clip = false;
  constructor(public layerView: SkyBaseLayerView, private isHover = false) {
    super();
  }

  renderSelf() {
    const actualFrame = this.layerView.frame.onlySize.applyMatrix(this.layerView.transform.worldTransform);
    const { skCanvas } = this.ctx;
    skCanvas.drawRect(actualFrame.toSk(), newStrokePaint(2, this.isHover ? color : color2));
  }
}
