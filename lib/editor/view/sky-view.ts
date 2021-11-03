import { SkyBaseLayer, SkyModel } from '../model';
import { SkyBaseLayerView, SkySymbolInstanceView, SkyPageView, OverlayView, SkyArtboardView } from '.';
import { Disposable, Rect } from '../base';
import sk, {
  CanvaskitPromised,
  getFontMgr,
  SkGrDirectContext,
  SkCanvas,
  SkSurface,
  SkFontMgr,
} from '../util/canvaskit';

import invariant from 'ts-invariant';
import { PointerController } from '../controller/pointer-controller';
import { Observable } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { RulerThickness } from './const';

const DebugPrintTree = false;
const DebugRenderCost = false;

export class SkyView extends Disposable {
  static currentContext: SkyView;

  canvasEl!: HTMLCanvasElement;
  grContext!: SkGrDirectContext;
  pageView?: SkyPageView;
  overlayView: OverlayView;

  skSurface!: SkSurface;
  skCanvas!: SkCanvas;
  fontMgr!: SkFontMgr;

  private dirty = true;

  dpi = 1;
  // 浏览器坐标系， 包括 ruler 部分

  frame = new Rect();
  surfaceFrame = new Rect();

  _canvasStack = [] as SkCanvas[];

  // 当前绘制的 symbol instance context
  // 在 render 的时候使用，后续可以改成放在 renderCtx 中。
  symbolContext?: SkySymbolInstanceView;
  _symbolContextStack: SkySymbolInstanceView[] = [];

  viewMap = new Map<string, SkyBaseLayerView>();

  /**
   * 由于需要确保 canvaskit 初始化完成，不能直接调用构造函数
   */
  static async create(model: SkyModel, foreignEl: HTMLElement) {
    await CanvaskitPromised;

    const fontMgr = await getFontMgr();

    const skyView = new SkyView(model, foreignEl);
    skyView.fontMgr = fontMgr;
    return skyView;
  }

  private constructor(private model: SkyModel, private foreignEl: HTMLElement) {
    super();
    SkyView.currentContext = this;

    this.overlayView = new OverlayView();

    this.createCanvasEl();

    this.attachParentNode(foreignEl);

    this._disposables.push(
      model.changed$.subscribe(() => {
        this.markDirty();
      }),
      new PointerController(this)
    );
  }

  /**
   * canvas 应该在 resize 事件触发的时候调整大小
   * width 和 style.width 都要手动控制以保持一致, 才能不变形。
   */
  private createCanvasEl() {
    this.canvasEl = document.createElement('canvas');
    this.canvasEl.style.display = 'block';
    this.grContext = sk.CanvasKit.MakeGrContext(sk.CanvasKit.GetWebGLContext(this.canvasEl));
  }

  private attachParentNode(el: HTMLElement) {
    invariant(!this.canvasEl.parentElement, 'Should not attach again!');
    el.appendChild(this.canvasEl);
    this.doResize();

    this._disposables.push(
      new Observable((sub) => {
        const ro = new ResizeObserver((entries) => {
          sub.next();
        });
        ro.observe(el);
        return () => ro.disconnect();
      })
        .pipe(debounceTime(200))
        .subscribe(() => {
          this.doResize();
        })
    );

    const handler = () => {
      if (this._disposed) return;
      this.render();
      // interesting. 相对于 requestAnimationFrame, setTimeout cpu 消耗更少
      setTimeout(handler, 16);
    };
    setTimeout(handler, 16);
  }

  // canvasEl 保持和 parentNode 一样大
  doResize() {
    const bounds = this.foreignEl.getBoundingClientRect();
    if (this.frame.width === bounds.width && this.frame.height === bounds.height) {
      return;
    }

    this.frame.width = bounds.width;
    this.frame.height = bounds.height;
    this.dpi = window.devicePixelRatio;

    this.canvasEl.style.width = `${bounds.width}px`;
    this.canvasEl.style.height = `${bounds.height}px`;

    const canvasWidth = this.frame.width * this.dpi;
    const canvasHeight = this.frame.height * this.dpi;

    this.canvasEl.width = canvasWidth;
    this.canvasEl.height = canvasHeight;

    this.markDirty();
  }

  /**
   * 每次绘制的时候重新创建
   * 如果在 doResize 的时候重新创建的话。等待 raf 间隙 canvas 是空白的。
   */
  createSkSurfaceAndCanvas() {
    this.skSurface?.delete();
    const surface = sk.CanvasKit.MakeOnScreenGLSurface(
      this.grContext,
      this.canvasEl.width,
      this.canvasEl.height,
      sk.CanvasKit.ColorSpace.SRGB
    );

    invariant(surface, 'Cant create sk surface');
    this.skSurface = surface;
    this.skCanvas = this.skSurface.getCanvas();
    invariant(this.skCanvas, 'Cant create sk canvas');
  }

  makeOffscreenSurface(width: number, height: number) {
    return this.skSurface.makeSurface({
      ...this.skSurface.imageInfo(),
      width,
      height,
    });
  }

  renderPage(i = 0) {
    const skyPage = this.model.pages[i];

    invariant(skyPage !== undefined, `Page not exist: [${i}]`);
    this.overlayView.resetPage();
    const skyPageView = new SkyPageView(skyPage);

    this.pageView = skyPageView;
    this.pageView.layout();

    skyPageView.zoomToFit();

    if (DebugPrintTree) {
      this.debugPrintTree(this.pageView);
    }
    this.markDirty();
  }

  private debugPrintTree(node: any = this.pageView) {
    console.group(node?.debugString?.());
    node?.children?.forEach((child) => this.debugPrintTree(child));
    console.groupEnd();
  }

  markDirty() {
    this.dirty = true;
  }

  // 设置为当前使用的 canvas
  pushCanvas(canvas: SkCanvas) {
    this._canvasStack.push(this.skCanvas);
    this.skCanvas = canvas;
  }

  // 选择之前使用的 canvas
  popCanvas() {
    const canvas = this._canvasStack.pop();
    invariant(!!canvas, 'Cant pop canvas');
    this.skCanvas = canvas;
  }

  // beginPicture(fn: ) {
  //   const recorder = new sk.CanvasKit.PictureRecorder()

  // }

  // endPicture() {

  // }

  enterSymbolInstance(symbolIns: SkySymbolInstanceView) {
    this._symbolContextStack.push(symbolIns);
    this.symbolContext = symbolIns;
  }

  leaveSymbolInstance() {
    this._symbolContextStack.pop();
    this.symbolContext = this._symbolContextStack[this._symbolContextStack.length - 1];
  }

  // 重新绘制
  render() {
    if (!this.dirty) return;

    this.createSkSurfaceAndCanvas();
    this.skCanvas.clear(sk.CanvasKit.TRANSPARENT);
    if (this.pageView) {
      const start = Date.now();
      this.skCanvas.save();
      this.skCanvas.scale(this.dpi, this.dpi);
      this.pageView.layout();
      this.overlayView.layout();
      this.pageView.render();
      this.overlayView.render();
      this.skCanvas.restore();
      this.skSurface.flush();
      if (DebugRenderCost) {
        console.log('>>> render costs:', Date.now() - start);
      }
    }
    this.dirty = false;
  }

  /**
   * 临时转换到全局坐标系下，并执行绘制
   *
   * anchor 表示在绘制时所在的坐标系里的位置
   * fn 绘制所用的回调函数，传回 anchor 在全局中的坐标
   */
  drawInGlobalCoordinate(anchor: [number, number], fn: (anchor: [number, number]) => void) {
    this.skCanvas.save();
    const currentMatrix = this.skCanvas.getTotalMatrix();

    const devicePt = sk.CanvasKit.Matrix.mapPoints(currentMatrix, anchor) as [number, number];
    devicePt[0] = devicePt[0] / this.dpi;
    devicePt[1] = devicePt[1] / this.dpi;
    const invertedCoord = sk.CanvasKit.Matrix.invert(currentMatrix);
    invariant(invertedCoord, 'invert matrix failed');
    this.skCanvas.concat(invertedCoord);
    this.skCanvas.scale(this.dpi, this.dpi);
    fn(devicePt);
    this.skCanvas.restore();
  }

  dispose() {
    super.dispose();
    // this.skSurface?.delete();
    if (this.canvasEl.parentNode) {
      this.canvasEl.parentNode.removeChild(this.canvasEl);
    }
  }

  debugTexture() {
    const debugTextures = (window as any).dt;
    // const ctx = (this.canvasEl as any).qf.qe;
    if (debugTextures) {
      debugTextures.forEach((t, idx) => {
        // createImageFromTexture(idx, ctx, t, 4096, 4096);
      });
    }
  }

  registerLayer(objectId: string, layerView: SkyBaseLayerView) {
    this.viewMap.set(objectId, layerView);
  }

  getViewByModelId(id: string) {
    return this.viewMap.get(id);
  }

  selectLayer(layer: SkyBaseLayer) {
    const view = this.getViewByModelId(layer.objectId);
    if (view) {
      this.overlayView.addSelection(view);
      this.markDirty();
    }
  }

  unselectLayer() {
    this.overlayView.unselect();
    this.markDirty();
  }

  hoverLayer(layerView: SkyBaseLayerView | undefined) {
    this.overlayView.setHoverView(layerView);
  }

  showRuler = true;

  /**
   * 取决于有没有 ruler 而不同
   */
  get pageFrame() {
    const rulerThickness = this.showRuler ? RulerThickness : 0;
    return new Rect(
      rulerThickness,
      rulerThickness,
      this.frame.width - rulerThickness,
      this.frame.height - rulerThickness
    );
  }

  registerArtBoard(artBoardView: SkyArtboardView) {
    this.overlayView.addArtBoardOverlay(artBoardView);
  }
}
