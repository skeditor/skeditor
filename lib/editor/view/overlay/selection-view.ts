/**
 * Layer 的选中框
 * 给定一个 layer view。 计算出它在 page 中的范围。
 * 每次绘制的时候通过 scale/translate，重新计算 frame，而不是应用 scale。
 * 确保 stroke-width 固定。
 */
import { SkyBaseLayerView } from '..';
import sk, { newStrokePaint } from '../../util/canvaskit';
import { SkyBoxView } from './box-view';

export class SelectionView extends SkyBoxView {
  clip = false;
  constructor(private layerView: SkyBaseLayerView) {
    super();
  }

  renderSelf() {
    const actualFrame = this.layerView.frame.onlySize.applyMatrix(this.layerView.transform.worldTransform);
    const { skCanvas } = this.ctx;
    skCanvas.drawRect(actualFrame.toSk(), newStrokePaint(2, sk.CanvasKit.RED));
  }
}
