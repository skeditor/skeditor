import { SkyBaseLayerView } from '.';
import { SkyBitmap } from '../model';
import sk from '../util/canvaskit';

export class SkyBitmapView extends SkyBaseLayerView<SkyBitmap> {
  layoutSelf() {
    this.commonLayoutSelf();
  }

  _render() {
    const skImg = this.model.file?.skImage;
    const frame = this.frame;
    if (!skImg) return;

    const { skCanvas } = this.ctx;
    // const skImg = sk.CanvasKit.MakeImageFromEncoded(image);
    // if (!skImg) {
    //   console.warn('Make sk img failed');
    //   return;
    // }

    const paint = new sk.CanvasKit.Paint();

    skCanvas.drawImageRect(
      skImg,
      sk.CanvasKit.XYWHRect(0, 0, skImg.width(), skImg.height()),
      sk.CanvasKit.XYWHRect(0, 0, frame.width, frame.height),
      paint
    );
  }
}
