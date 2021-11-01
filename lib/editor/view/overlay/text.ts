// @ts-nocheck
import { Rect } from '../../base';

export class SkySimpleTextView extends SkyBoxView {
  // static getPara
  para?: SkParagraph;

  constructor(private options: { text: string; color: SkColor; size: number }) {
    super(new Rect());

    // this.layout();
  }

  layout() {
    const options = this.options;

    const paraStyle = new sk.CanvasKit.ParagraphStyle({
      textStyle: {
        color: options.color || sk.CanvasKit.BLACK,
        fontFamilies: defaultFonts,
        fontSize: this.options.size,
      },
    });
    const builder = sk.CanvasKit.ParagraphBuilder.Make(paraStyle, this.ctx.fontMgr);
    builder.addText(options.text);
    const para = builder.build();
    para.layout(1e8);
    this.frame.width = para.getMaxIntrinsicWidth();
    this.frame.height = para.getHeight();
    this.para = para;
  }

  // Todo, 这里实现有点特殊了
  renderSelf() {
    return;
    if (this.para) {
      const { skCanvas } = this.ctx;

      const bottomLeft = [this.frame.x, this.frame.y + this.frame.height] as [number, number];
      this.ctx.drawInGlobalCoordinate(bottomLeft, (anchor) => {
        skCanvas.drawParagraph(this.para!, anchor[0], anchor[1] - this.frame.height);
      });
    }
  }
}
