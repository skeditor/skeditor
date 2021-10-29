import { SkyPage } from '../model';
import { SkyBaseGroupView } from './';
import { Rect } from '../base';
import { ZoomController } from '../controller/zoom-controller';
import { ZoomState } from '../controller/zoom-state';
import sk, { newStrokePaint, SkPicture } from '../util/canvaskit';
import { TileManager } from '../tile/tile-manager';
import debug from 'debug';

const DebugDrawBounds = false;

/**
 * Page 现在填满整个 canvas 区域，不用再考虑是否存在 Ruler 而调整 frame。
 * 相应的 zoom controller/state 也不需要设置 offset，监听整个 canvas 区域就行了。
 */
export class SkyPageView extends SkyBaseGroupView<SkyPage> {
  name = 'page';
  log = debug('view:page');
  _picture?: SkPicture;

  private enableTile = true;

  private tileManager: TileManager;

  zoomState: ZoomState;
  controller!: ZoomController;

  constructor(model: SkyPage) {
    super(model);

    this.zoomState = new ZoomState();
    this.initController();

    if (location.search.includes('tile=0')) {
      this.enableTile = false;
    }

    this.tileManager = new TileManager(this);
  }

  private initController() {
    // todo, add to dispose
    this.controller = new ZoomController(this.ctx.canvasEl, this.zoomState);

    // this.controller.setOffset(this.pageBounds.leftTop);

    this.zoomState.changed$.subscribe(() => {
      const { position, scale } = this.zoomState;
      // console.log('>>>> update page position', position.x, position.y);
      this.transform.position.set(position.x, position.y);
      this.transform.scale.set(scale, scale);
      this.transform.updateLocalTransform();

      this.ctx.markDirty();
    });
  }

  zoomToFit() {
    const containerBounds = this.ctx.frame;
    const contentBounds = this.bounds;

    const { scale, translate } = containerBounds.layoutRectInCenter(contentBounds, 20);

    this.zoomState.setPosition(translate);
    this.zoomState.setScale(scale);
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

  render() {
    if (this.enableTile) {
      this.renderTiles();
    } else {
      super.render();
    }
  }

  contentTilesRequested = false;

  /**
   * page 下实际内容，到渲染出像素坐标系时，发生的实际缩放值
   */
  get contentScale() {
    const { dpi } = this.ctx;
    const pageScale = this.zoomState.scale;
    return dpi * pageScale;
  }

  renderTiles() {
    const { skCanvas, dpi } = this.ctx;

    const translate = this.transform.position;

    let viewport = this.ctx.frame;

    // page 的 viewport ， 像素单位的
    // 转换到输出内容的坐标系。
    // 大小只与 dpi 和 视口(canvas)大小有关。
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

    this.tileManager.drawViewport(this.contentScale, viewport);
    skCanvas.restore();
  }

  /**
   * 从 (x,y) 处开始绘制 content
   * x,y 在是以输出的像素为单位的坐标，原点还是 content 的原点
   * quickReject 可以避免绘制多余内容
   */
  drawContent(scale: number, x: number, y: number) {
    const { skCanvas } = this.ctx;
    const contentScale = scale;
    skCanvas.save();

    skCanvas.translate(-x, -y);
    skCanvas.scale(contentScale, contentScale);
    this._render();
    skCanvas.restore();
  }

  get bounds() {
    const children = this.children;
    if (children.length === 0) return Rect.Empty;

    return Rect.mergeRects(this.children.map((child) => child.bounds));
  }

  /**
   * 检查 bounds 是否准确
   */
  debugDrawBounds() {
    const { skCanvas } = this.ctx;
    const { bounds } = this;

    skCanvas.drawRect(bounds.toSk(), newStrokePaint(2, sk.CanvasKit.RED));
  }
}
