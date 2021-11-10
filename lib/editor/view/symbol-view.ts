import { SkySymbolInstance, SkySymbolMaster } from '../model';
import { SkyBaseLayerView, SkyArtboardView } from './';
import { CacheGetter } from '../util/misc';

export class SkySymbolInstanceView extends SkyBaseLayerView<SkySymbolInstance> {
  requireLayerDropShadow = true;
  children!: SkyBaseLayerView[];

  constructor(public model: SkySymbolInstance) {
    super(model);

    this.buildChildren(this.model.layers);
  }

  get intrinsicFrame() {
    if (!this.model.refModel) {
      return this.model.frame;
    }
    return this.model.refModel.frame;
  }

  @CacheGetter<SkySymbolInstanceView>((ins) => ins.layerUpdateId)
  get renderFrame() {
    return this.calcChildrenRenderFrame(this.children);
  }

  get visible() {
    return this.model.isVisible && !!this.model.refModel;
  }

  layoutSelf() {
    this.commonLayoutSelf();
  }

  _render() {
    if (!this.model.refModel) return;
    this.renderChildren();
  }
}

// 跟 ArtBoard 用同一个算了
export class SkySymbolMasterView extends SkyArtboardView {
  constructor(model: SkySymbolMaster) {
    super(model);
  }
}
