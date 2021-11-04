import { SkyPage } from '../model';
import { SkyBaseGroupView } from './';
import { Point, Rect } from '../base';
import { ZoomController } from '../controller/zoom-controller';
import { ZoomState } from '../controller/zoom-state';
import sk, { newStrokePaint, SkPicture, SkColor } from '../util/canvaskit';
import { TileManager } from '../tile/tile-manager';
import debug from 'debug';

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

  bgColor: SkColor;

  constructor(model: SkyPage) {
    super(model);
    this.bgColor = sk.CanvasKit.parseColorString('#F9F9F9');

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

    this.zoomState.changed$.subscribe(() => {
      this._transformDirty = true;
      this.ctx.markDirty();
    });
  }

  get minScale() {
    // 最大的一边占用 1/4 viewport
    const bounds = this.bounds;
    const frame = this.ctx.frame;
    const conWidth = frame.width / 4;
    const conHeight = frame.height / 4;
    const scaleX = conWidth / bounds.width;
    const scaleY = conHeight / bounds.height;
    const minScale = Math.min(scaleX, scaleY);
    return Math.min(minScale, 1);
  }

  updateTransform() {
    const { position, scale } = this.zoomState;
    this.transform.position.set(position.x, position.y);
    this.transform.scale.set(scale, scale);
    this.transform.updateLocalTransform();
  }

  zoomToFit() {
    const containerBounds = this.ctx.frame;
    const contentBounds = this.bounds;

    const { scale, translate } = containerBounds.layoutRectInCenter(contentBounds, 20);

    this.zoomState.setPosition(translate);
    this.zoomState.setScale(scale);
    this.zoomState.setMinScale(this.minScale);
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

  render() {
    this.renderBg();
    if (this.enableTile) {
      this.renderTiles();
    } else {
      super.render();
    }
  }

  renderBg() {
    const { skCanvas } = this.ctx;
    skCanvas.clear(this.bgColor);
  }

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

  containsPoint(pt: Point) {
    return this.ctx.pageFrame.containsPoint(pt);
  }
}
