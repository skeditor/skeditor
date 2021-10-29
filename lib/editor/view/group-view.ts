import { SkyBaseGroup, SkyGroup } from '../model';

import { CacheGetter } from '../util/misc';
import { SkyBaseLayerView } from './';

// 干掉这个. 有点影响继承。
// 这个类看起来不太需要了，children 相关已经移动到上层 SkyBaseLayerView 中了。
export abstract class SkyBaseGroupView<T extends SkyBaseGroup = SkyBaseGroup> extends SkyBaseLayerView<T> {
  children!: SkyBaseLayerView[];

  @CacheGetter<SkyBaseLayerView>((ins) => ins.layerUpdateId)
  get renderFrame() {
    return this.calcChildrenRenderFrame(this.children);
  }

  _render() {
    this.renderChildren();
  }
}

export class SkyGroupView extends SkyBaseGroupView<SkyGroup> {
  requireLayerDropShadow = true;

  layoutSelf() {
    this.commonLayoutSelf();
  }
}
