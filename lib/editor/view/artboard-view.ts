import sk from '../util/canvaskit';
import { SkyArtboard, SkyShadow, SkySymbolMaster } from '../model';
import { SkyBaseLayerView, SkyBoxView } from './';
import { SkySimpleTextView, SkyTextView } from './text-view';

export class SkyArtboardView extends SkyBaseLayerView<SkyArtboard | SkySymbolMaster> {
  box: SkyBoxView;
  titleView: SkySimpleTextView;

  constructor(model: SkyArtboard | SkySymbolMaster) {
    super(model);

    this.box = new SkyBoxView(this.frame.onlySize);
    this.box.backgroundColor = this.model.hasBackgroundColor ? this.model.backgroundColor.skColor : sk.CanvasKit.WHITE;
    this.box.shadow = SkyShadow.create(sk.CanvasKit.Color(0, 0, 0, 0.3), 4, 0, 1);

    this.box.children = this.children;
    this.children = [this.box];

    this.titleView = this.addChild(
      new SkySimpleTextView({
        text: this.model.name,
        color: sk.CanvasKit.parseColorString('#929292'),
        size: 12,
      })
    );

    this.titleView.frame.y = -this.titleView.frame.height;
  }

  _render() {
    this.renderChildren();
  }
}
