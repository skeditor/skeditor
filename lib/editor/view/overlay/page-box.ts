// 可以做一个 scroll view，逻辑抽象的可以更好点
// 但考虑到 ruler 的情况似乎更麻烦，不如直接写成一个特定业务相关的 view
export class SkyPageContainerView extends SkyBoxView {
  pageBox: SkyBoxView;

  // left top corner
  corner: SkyBoxView;
  page: SkyPageView;
  topRuler: Ruler;
  leftRuler: Ruler;
  zoomState: ZoomState;
  controller!: ZoomController;

  constructor(model: SkyPage) {
    super(new Rect());

    this.frame.width = this.ctx.frame.width;
    this.frame.height = this.ctx.frame.height;

    this.zoomState = new ZoomState(model.frame.leftTop);

    this.topRuler = this.addChild(new Ruler(new Rect(RulerThickness, 0, this.pageBounds.width, RulerThickness), true));
    this.leftRuler = this.addChild(
      new Ruler(new Rect(0, RulerThickness, RulerThickness, this.pageBounds.height), false)
    );
    this.corner = this.addChild(new CornerView(new Rect(0, 0, RulerThickness, RulerThickness)));
    this.corner.backgroundColor = sk.CanvasKit.WHITE;

    this.pageBox = this.addChild(new SkyBoxView(this.pageBounds));
    this.pageBox.backgroundColor = sk.CanvasKit.parseColorString('#F9F9F9');
    this.page = this.pageBox.addChild(new SkyPageView(model));

    this.initController();
  }

  layoutSelf() {
    this.frame.width = this.ctx.frame.width;
    this.frame.height = this.ctx.frame.height;

    this.pageBox.frame = this.pageBounds;

    this.topRuler.frame.width = this.frame.width;
    this.leftRuler.frame.height = this.frame.height;
  }

  /**
   * 调整 translate and scale 以展示所有内容
   */
  showFullContent() {
    const containerBounds = this.pageBounds.onlySize;
    const contentBounds = this.page.bounds;

    const { scale, translate } = containerBounds.layoutRectInCenter(contentBounds, 20);

    this.zoomState.setPosition(translate);
    this.zoomState.setScale(scale);
  }

  get pageBounds() {
    return new Rect(
      RulerThickness,
      RulerThickness,
      this.ctx.frame.width - RulerThickness,
      this.ctx.frame.height - RulerThickness
    );
  }

  private initController() {
    // todo, add to dispose
    this.controller = new ZoomController(this.ctx.canvasEl, this.zoomState);

    this.controller.setOffset(this.pageBounds.leftTop);

    this.zoomState.changed$.subscribe(() => {
      const { position, scale } = this.zoomState;
      // console.log('>>>> update page position', position.x, position.y);
      this.page.transform.position.set(position.x, position.y);
      this.page.transform.scale.set(scale, scale);
      this.page.transform.updateLocalTransform();

      this.ctx.markDirty();
    });
  }
}

class CornerView extends SkyBoxView {
  constructor(frame: Rect) {
    super(frame);
  }
  renderSelf() {
    const paint = getLinePaint();
    const { skCanvas } = this.ctx;
    skCanvas.drawLine(0, RulerThickness, RulerThickness, RulerThickness, paint);
    skCanvas.drawLine(RulerThickness, 0, RulerThickness, RulerThickness, paint);
  }
}
