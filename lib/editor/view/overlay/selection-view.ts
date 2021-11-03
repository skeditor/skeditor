/**
 * Layer 的选中框
 * 给定一个 layer view。 计算出它在 page 中的范围。
 * 每次绘制的时候通过 scale/translate，重新计算 frame，而不是应用 scale。
 * 确保 stroke-width 固定。
 */
import { SkyBaseLayerView } from '..';
import sk, { CanvaskitPromised, newStrokePaint, SkPaint } from '../../util/canvaskit';
import { SkyBoxView } from './box-view';

let selectPaint: SkPaint;
let hoverPaint: SkPaint;

CanvaskitPromised.then(() => {
  const colorSelect = sk.CanvasKit.Color(21, 129, 205, 1);

  // const colorHover = sk.CanvasKit.Color(21, 129, 205, 0.6);

  selectPaint = newStrokePaint(2, colorSelect);
  hoverPaint = newStrokePaint(2, colorSelect);

  const dashEffect = sk.CanvasKit.PathEffect.MakeDash([5, 5]);
  hoverPaint.setPathEffect(dashEffect);
});

export class SelectionView extends SkyBoxView {
  clip = false;
  constructor(public layerView: SkyBaseLayerView, private isHover = false) {
    super();
  }

  renderSelf() {
    const actualFrame = this.layerView.frame.onlySize.applyMatrix(this.layerView.transform.worldTransform);
    const { skCanvas } = this.ctx;
    skCanvas.drawRect(actualFrame.toSk(), this.isHover ? hoverPaint : selectPaint);
  }
}
