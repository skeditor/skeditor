import { ZoomController } from '../controller/zoom-controller';
import debug from 'debug';
import { ZoomState } from '../controller/zoom-state';
import { Ruler, RulerThickness, getLinePaint } from './ruler';
import { SkyPage } from '../model';
import { Rect } from '../base';
import { SkyBaseGroupView, SkyBoxView } from './';
import sk, { newStrokePaint, SkPicture } from '../util/canvaskit';
import { TileManager } from '../tile/tile-manager';

const DebugDrawBounds = false;

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

export class SkyPageView extends SkyBaseGroupView<SkyPage> {
  name = 'page';
  log = debug('view:page');
  _picture?: SkPicture;

  // container: SkyBoxView;

  private enableTile = true;

  private tileManager: TileManager;

  constructor(model: SkyPage) {
    super(model);

    if (location.search.includes('tile=0')) {
      this.enableTile = false;
    }

    // this.topRuler = new Ruler(0);
    // this.leftRuler = new Ruler(3);

    // this.container = new SkyBoxView(this.bounds);
    // this.addChild(this.container);

    this.tileManager = new TileManager(this);
  }

  containsPoint() {
    return true;
  }

  private _makePicture() {
    const recorder = new sk.CanvasKit.PictureRecorder();
    const canvas = recorder.beginRecording(sk.CanvasKit.XYWHRect(-1e8, -1e8, 2e8, 2e8));
    this.ctx.pushCanvas(canvas);
    super._render();
    const picture = recorder.finishRecordingAsPicture();

    this.ctx.popCanvas();
    // recorder.delete();
    // canvas.delete();

    console.log('Made page picture', picture);

    this._picture = picture;
  }

  canQuickReject = false;

  _render() {
    // if (!this._picture) {
    //   this._makePicture();
    // }

    // this._picture.
    // this.ctx.skCanvas.drawPicture(this._picture!);

    super._render();
    if (DebugDrawBounds) {
      this.debugDrawBounds();
    }
  }

  // _checkerBoard?: CheckerBoard;

  // get checkerBoard() {
  //   if (!this._checkerBoard) {
  //     this._checkerBoard = new CheckerBoard(this);
  //   }
  //   return this._checkerBoard;
  // }

  render() {
    if (this.enableTile) {
      this.renderTiles();
    } else {
      super.render();
    }
  }

  // debugCostTile() {
  //   const start = Date.now();
  //   this.checkerBoard.fillTiles(12, 6);
  //   const cost = Date.now() - start;
  //   console.log('>>>> this cost a lot', cost);
  // }

  contentTilesRequested = false;

  /**
   * page 下实际内容，到渲染出像素坐标系时，发生的实际缩放值
   */
  get contentScale() {
    const { dpi } = this.ctx;
    const pageScale = this.ctx.zoomState.scale;
    return dpi * pageScale;
  }

  renderTiles() {
    // dpi scale, 先假设没有 pinch
    const { skCanvas, dpi } = this.ctx;
    // const pageScale = this.ctx.zoomState.scale;

    // const scale = this.contentScale;

    // 绘制下 checkerboard
    const translate = this.transform.position;

    let viewport = (this.parent as any as SkyBoxView).frame;

    // page 的 viewport ， 像素单位的
    // 转换到输出内容的坐标系。
    // 大小只与 dpi 和 视扣大小有关。
    viewport = new Rect(
      -translate.x * dpi,
      -translate.y * dpi,
      viewport.width * dpi,
      viewport.height * dpi
    ).roundPixel();

    skCanvas.save();
    skCanvas.translate(translate.x, translate.y);

    // return to pixel scale
    skCanvas.scale(1 / dpi, 1 / dpi); // dpi

    // skCanvas.translate(this.transform.poi)
    // const board = this.checkerBoard;
    // board.drawGrids(skCanvas);

    // board.drawViewportGrids(viewport);

    this.tileManager.drawViewport(this.contentScale, viewport);

    // skCanvas.drawRect(sk.CanvasKit.XYWHRect(0, 0, 300, 300), newStrokePaint(1, sk.CanvasKit.RED));
    skCanvas.restore();

    // board.fillTiles(this.ctx, this);

    if (!this.contentTilesRequested) {
      // this.checkerBoard.ensureAllContent();
      // this.contentTilesRequested = true;
    }
  }

  /**
   * 从 (x,y) 处开始绘制 content
   * x,y 在是以输出的像素为单位的坐标，原点还是 content 的原点
   */
  drawContent(scale: number, x: number, y: number) {
    const { skCanvas } = this.ctx;
    // const contentScale = this.contentScale;
    const contentScale = scale;
    skCanvas.save();
    // console.log('>>> draw content tile', x, y);

    // 绘制一个标记
    // skCanvas.drawLine(0, 0, 100, 100, newStrokePaint(2, sk.CanvasKit.RED));

    // const translate = this.transform.position;
    // 转换到原点，从原点绘制
    skCanvas.translate(-x, -y);
    skCanvas.scale(contentScale, contentScale);
    this._render();
    skCanvas.restore();
    // console.log('>>> render clip end');
  }

  get bounds() {
    const children = this.children;
    if (children.length === 0) return Rect.Empty;

    return Rect.mergeRects(this.children.map((child) => child.bounds));
  }

  // 看看 bounds 准确不
  debugDrawBounds() {
    const { skCanvas } = this.ctx;
    const { bounds } = this;

    skCanvas.drawRect(bounds.toSk(), newStrokePaint(2, sk.CanvasKit.RED));
  }

  // 去除掉 ruler 区域
  // get bounds() {
  //   return new Rect(
  //     RulerThickness,
  //     RulerThickness,
  //     this.ctx.frame.width - RulerThickness,
  //     this.ctx.frame.height - RulerThickness
  //   );
  // }

  // _render() {
  // this.log('render');

  // const { skCanvas } = this.ctx;

  // const { position, scale } = this.zoomState;

  // skCanvas.save();
  // skCanvas.clipRect(this.bounds.toSk(), sk.CanvasKit.ClipOp.Intersect, true);
  // skCanvas.translate(position.x + this.bounds.x, position.y + this.bounds.y);
  // skCanvas.scale(scale, scale);

  // this.children.forEach((child) => {
  //   child.render();
  // });

  // skCanvas.restore();

  // this.leftRuler.render();
  // this.topRuler.render();
  // }
}
