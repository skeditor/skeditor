/**
 * Layer 的选中框
 * 给定一个 layer view。 计算出它在 page 中的范围。
 * 每次绘制的时候通过 scale/translate，重新计算 frame，而不是应用 scale。
 * 确保 stroke-width 固定。
 */
import { SkyBaseLayerView } from '..';

class SelectionView {
  constructor(private layerView: SkyBaseLayerView) {}
}
