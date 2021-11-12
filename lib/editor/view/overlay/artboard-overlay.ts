import { SkyArtboardView } from '..';
import { Rect } from '../../base';
import sk, { SkParagraphStyle, SkPaint, CanvaskitPromised, defaultFonts, SkColor } from '../../util/canvaskit';
import { SkyBoxView } from './box-view';

let ArtBoardShadowPaint: SkPaint;
let ArtBoardTitleStyle: SkParagraphStyle;
let SymbolTitleStyle: SkParagraphStyle;

const TitleFontSize = 12;

CanvaskitPromised.then(() => {
  const paint = new sk.CanvasKit.Paint();
  paint.setColor(sk.CanvasKit.Color(0, 0, 0, 0.3));
  paint.setMaskFilter(sk.CanvasKit.MaskFilter.MakeBlur(sk.CanvasKit.BlurStyle.Normal, 2, true));
  ArtBoardShadowPaint = paint;

  const TitleStyle = (color: SkColor) =>
    new sk.CanvasKit.ParagraphStyle({
      ellipsis: '...',
      maxLines: 1,
      textStyle: {
        color,
        fontFamilies: defaultFonts,
        fontSize: TitleFontSize,
      },
    });

  ArtBoardTitleStyle = TitleStyle(sk.CanvasKit.parseColorString('#929292'));
  SymbolTitleStyle = TitleStyle(sk.CanvasKit.parseColorString('#C960E7'));
});

export class ArtBoardOverlayView extends SkyBoxView {
  clip = false;

  titleFrame = new Rect();

  constructor(public artBoardView: SkyArtboardView) {
    super();
  }

  renderSelf() {
    if (!this.artBoardView.visible) return;
    const actualFrame = this.artBoardView.frame.onlySize.applyMatrix(this.artBoardView.transform.worldTransform);

    if (!this.ctx.pageFrame.intersect(actualFrame)) return;

    // ArtBoard Frame
    const { skCanvas } = this.ctx;
    const skRect = actualFrame.toSk();
    skCanvas.save();
    skCanvas.clipRect(skRect, sk.CanvasKit.ClipOp.Difference, true);
    skCanvas.drawRect(skRect, ArtBoardShadowPaint);
    skCanvas.restore();

    // ArtBoard Title
    // 这个地方可以优化下，看看什么时候需要重新生成 paragraph。
    // 只需要判断可用宽度就好了
    // 可以抽离出一个 overlay text view 来做这个事情

    const text = this.artBoardView.model.name;
    if (text && actualFrame.width > TitleFontSize * 1.5) {
      const builder = sk.CanvasKit.ParagraphBuilder.MakeFromFontProvider(
        this.artBoardView.isSymbolMaster ? SymbolTitleStyle : ArtBoardTitleStyle,
        this.ctx.fontProvider
      );
      builder.addText(text);
      const para = builder.build();
      para.layout(actualFrame.width);
      const lineHeight = para.getHeight();

      const titleFrame = new Rect(
        actualFrame.x,
        actualFrame.y - lineHeight - 2,
        para.getMinIntrinsicWidth(),
        lineHeight
      );
      skCanvas.drawParagraph(para, titleFrame.x, titleFrame.y);
      this.titleFrame = titleFrame;
      para.delete();
      builder.delete();
    }
  }
}
