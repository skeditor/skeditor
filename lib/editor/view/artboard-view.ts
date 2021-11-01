import { ClassValue, SkyArtboard, SkySymbolMaster } from '../model';
import { SkyBaseLayerView } from './';
import sk, { newColorPaint, SkColor } from '../util/canvaskit';
import { CacheGetter } from '../util/misc';

/**
 * ArtBoard 和 SymbolMaster 差不多，都需要背景和标题。
 * ArtBoard 需要 clip。
 * 另外 ArtBoard 有个 border ，应该放在 overlay 中实现，或者干脆不要也是可以的。
 */
export class SkyArtboardView extends SkyBaseLayerView<SkyArtboard | SkySymbolMaster> {
  backgroundColor: SkColor;

  // ArtBoard 需要 clip ，而 symbol master 不需要。
  isSymbolMaster = false;

  constructor(model: SkyArtboard | SkySymbolMaster) {
    super(model);

    this.isSymbolMaster = this.model._class === ClassValue.SymbolMaster;
    this.backgroundColor = this.model.hasBackgroundColor ? this.model.backgroundColor.skColor : sk.CanvasKit.WHITE;

    this.ctx.registerArtBoard(this);
  }

  _render() {
    const { skCanvas } = this.ctx;
    skCanvas.drawRect(this.frame.onlySize.toSk(), newColorPaint(this.backgroundColor));

    if (!this.children.length) return;
    const shouldClip = !this.isSymbolMaster;

    if (shouldClip) {
      skCanvas.save();
      skCanvas.clipRect(this.frame.onlySize.toSk(), sk.CanvasKit.ClipOp.Intersect, true);
    }
    this.renderChildren();
    if (shouldClip) {
      skCanvas.restore();
    }
  }

  @CacheGetter<SkyBaseLayerView>((ins) => ins.layerUpdateId)
  get renderFrame() {
    if (this.isSymbolMaster) {
      return this.calcChildrenRenderFrame(this.children);
    } else {
      return this.model.frame.onlySize;
    }
  }
}
