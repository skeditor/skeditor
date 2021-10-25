import { SkySymbolInstance, SkySymbolMaster } from '../model';
import { SkyBaseLayerView } from './';
import { SkyArtboardView } from './artboard-view';
import { CacheGetter } from '../util/misc';

export class SkySymbolInstanceView extends SkyBaseLayerView<SkySymbolInstance> {
  requireLayerDropShadow = true;
  children!: SkyBaseLayerView[];

  constructor(public model: SkySymbolInstance) {
    super(model);

    this.buildChildren(this.model.layers);
  }

  get intrinsicFrame() {
    return this.model.refModel!.frame;
  }

  @CacheGetter<SkySymbolInstanceView>((ins) => ins.layerUpdateId)
  get renderFrame() {
    return this.calcChildrenRenderFrame(this.children);
  }

  get visible() {
    return this.model.isVisible && !!this.model.refModel;
  }

  // get frame() {
  //   return this.sca this.model.frame;
  // }

  // get needLaout

  // 如果相比 refModel 并没有拉伸，那么可以省去 resize 的步骤

  // 但是 instance 在 instance 内的时候，也是要 layoutSelf 之后才知道，是否变形了

  layoutSelf() {
    this.commonLayoutSelf();
  }

  // get masterFrame() {
  //   return this.model.refModel?.frame;
  // }

  // get instanceFrame() {
  //   return this.frame;
  // }

  // get needLayout() {
  //   return (
  //     this.masterFrame!.width !== this.instanceFrame.width || this.masterFrame!.height == this.instanceFrame.height
  //   );
  // }

  _render() {
    if (!this.model.refModel) return;

    // 这里就简单处理，因为目前看起来，就只需要从 instance 开始 layout
    // children 们自己去取 parent 身上的信息，然后判断该如何具体 layout
    // 这样也可以减轻抽象设计上的负担， 而 child 身上多做点判断
    // if (this.isFrameScaled) {
    //   this.layout();
    // }

    this.ctx.enterSymbolInstance(this);
    this.renderChildren();
    this.ctx.leaveSymbolInstance();
  }
}

// 跟 ArtBoard 用同一个算了
export class SkySymbolMasterView extends SkyArtboardView {
  constructor(model: SkySymbolMaster) {
    super(model);

    this.box.clip = false;
  }

  // 这个地方是确实挺蛋疼的，layer 下面就不应该用 box view
  @CacheGetter<SkySymbolInstanceView>((ins) => ins.layerUpdateId)
  get renderFrame() {
    return this.calcChildrenRenderFrame(this.box.children as SkyBaseLayerView[]);
  }
}

// export class SkySymbolMasterView extends SkyBaseLayerView<SkySymbolMaster> {

// constructor(model: SkyArtboard) {
//   super(model);

//   this.box = new SkyBoxView(this.frame.onlySize);
//   this.box.backgroundColor = this.model.hasBackgroundColor ? this.model.backgroundColor.skColor : sk.CanvasKit.WHITE;
//   this.box.shadow = SkyShadow.create(sk.CanvasKit.Color(0, 0, 0, 0.3), 4, 0, 1);

//   this.box.children = this.children;
//   this.children = [this.box];

//   this.titleView = this.addChild(
//     new SkySimpleTextView({
//       text: this.model.name,
//       color: sk.CanvasKit.parseColorString('#929292'),
//       size: 12,
//     })
//   );

//   this.titleView.frame.y = -this.titleView.frame.height;
// }

// _render() {
//   this.renderChildren();
// }
// }
