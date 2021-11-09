import { SkImage, SkyBaseLayer, SkyModel } from '../model';
import { SkyBaseLayerView, SkySymbolInstanceView, SkyPageView, OverlayView, SkyArtboardView } from '.';
import { Disposable, Rect } from '../base';
import sk, {
  CanvaskitPromised,
  getFontMgr,
  SkGrDirectContext,
  SkCanvas,
  SkSurface,
  SkTypefaceFontProvider,
  getFontProvider,
} from '../util/canvaskit';

import invariant from 'ts-invariant';
import { PointerController } from '../controller/pointer-controller';
import { Observable, Subject, merge, BehaviorSubject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { RulerThickness } from './const';
import { Services } from './services';
import { formatBytes } from '../util/misc';

const DebugPrintTree = false;
const DebugRenderCost = false;

class PageState {
  selectedLayerView?: SkyBaseLayerView;
  hoverLayerView?: SkyBaseLayerView;

  selectionChange = new Subject();
  hoverChange = new Subject();

  currentPage = new BehaviorSubject(0);

  changed = merge(this.selectionChange, this.hoverChange);

  reset() {
    this.selectLayer(undefined);
    this.hoverLayer(undefined);
  }

  selectLayer(view: SkyBaseLayerView | undefined) {
    if (this.selectedLayerView === view) return;
    const pre = this.selectedLayerView;
    if (pre) {
      pre.model.isSelected = false;
    }
    this.selectedLayerView = view;
    if (view) {
      view.model.isSelected = true;
    }
    this.selectionChange.next();
  }

  hoverLayer(view: SkyBaseLayerView | undefined) {
    if (this.hoverLayerView === view) return;
    this.hoverLayerView = view;
    this.hoverChange.next();
  }
}

export class SkyView extends Disposable {
  static currentContext: SkyView;
  canvasEl$ = new BehaviorSubject<HTMLCanvasElement | undefined>(undefined);
  grContext!: SkGrDirectContext;
  pageView?: SkyPageView;
  overlayView: OverlayView;

  skSurface?: SkSurface;
  skCanvas!: SkCanvas;
  fontProvider!: SkTypefaceFontProvider;

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

  pageState = new PageState();

  services: Services;

  /**
   * 由于需要确保 canvaskit 初始化完成，不能直接调用构造函数
   */
  static async create(model: SkyModel, foreignEl: HTMLElement) {
    await CanvaskitPromised;

    const skyView = new SkyView(model, foreignEl);
    skyView.fontProvider = getFontProvider();
    if (process.env.NODE_ENV === 'development') {
      (window as any).skyView = skyView;
    }
    return skyView;
  }

  private constructor(private model: SkyModel, private foreignEl: HTMLElement) {
    super();
    SkyView.currentContext = this;

    this.createCanvasEl();

    this.attachParentNode(foreignEl);
    this.startTick();

    this.overlayView = new OverlayView();
    this.services = new Services(this);

    this._disposables.push(
      merge(model.changed$, this.pageState.changed).subscribe(() => {
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
    const canvasEl = document.createElement('canvas');
    canvasEl.style.display = 'block';
    this.grContext = sk.CanvasKit.MakeGrContext(sk.CanvasKit.GetWebGLContext(canvasEl));

    canvasEl.addEventListener('webglcontextlost', () => {
      console.log('webglcontextlost');
      this.forceRestoreWebglContext();
    });
    canvasEl.addEventListener('webglcontextrestored', () => {
      console.log('webglcontextrestored');
    });
    this.canvasEl$.next(canvasEl);
  }

  private attachParentNode(el: HTMLElement) {
    const canvasEl = this.canvasEl$.value;
    invariant(canvasEl && !canvasEl.parentElement, 'Should not attach again!');
    el.appendChild(canvasEl);
    this.doResize();

    this._disposables.push(
      new Observable((sub) => {
        const ro = new ResizeObserver(() => {
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
  }

  startTick() {
    const handler = () => {
      if (this._disposed) return;
      this.render();
      setTimeout(handler, 16);
    };
    setTimeout(handler, 16);
  }

  // canvasEl 保持和 parentNode 一样大
  doResize(force = false) {
    const bounds = this.foreignEl.getBoundingClientRect();
    if (!force && this.frame.width === bounds.width && this.frame.height === bounds.height) {
      return;
    }

    const canvasEl = this.canvasEl$.value!;

    this.frame.width = bounds.width;
    this.frame.height = bounds.height;
    this.dpi = window.devicePixelRatio;

    canvasEl.style.width = `${bounds.width}px`;
    canvasEl.style.height = `${bounds.height}px`;

    const canvasWidth = this.frame.width * this.dpi;
    const canvasHeight = this.frame.height * this.dpi;

    canvasEl.width = canvasWidth;
    canvasEl.height = canvasHeight;

    this.markDirty();
  }

  /**
   * 每次绘制的时候重新创建
   * 如果在 doResize 的时候重新创建的话。等待 raf 间隙 canvas 是空白的。
   */
  createSkSurfaceAndCanvas() {
    this.skSurface?.delete();
    this.skSurface = undefined;
    const canvasEl = this.canvasEl$.value!;
    const surface = sk.CanvasKit.MakeOnScreenGLSurface(
      this.grContext,
      canvasEl.width,
      canvasEl.height,
      sk.CanvasKit.ColorSpace.SRGB
    );
    if (!surface) return;
    this.skSurface = surface;

    this.skCanvas = this.skSurface.getCanvas();
    invariant(this.skCanvas, 'Cant create sk canvas');
  }

  forceRestoreWebglContext() {
    const canvasEl = this.canvasEl$.value!;
    canvasEl.parentNode?.removeChild(canvasEl);
    if (this.grContext) {
      this.grContext.delete();
    }
    this.skSurface?.delete();
    this.skSurface = undefined;
    this.createCanvasEl();
    this.foreignEl.appendChild(this.canvasEl$.value!);
    this.doResize(true);
  }

  get debugResourceUsage() {
    return `${formatBytes(this.grContext.getResourceCacheUsageBytes())}/${formatBytes(
      this.grContext.getResourceCacheLimitBytes()
    )}`;
  }

  makeOffscreenSurface(width: number, height: number) {
    if (!this.skSurface) return undefined;
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
    this.pageState.reset();
    const skyPageView = new SkyPageView(skyPage);

    this.pageView = skyPageView;
    this.pageView.layout();

    skyPageView.zoomToFit();

    // 相当于一个 page change event
    this.pageState.currentPage.next(i);

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
    if (!this.skSurface) return;
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
    this.grContext?.delete();
    this.skSurface?.delete();
    this.pageView = undefined;
    this.pageState.reset();
    const canvasEl = this.canvasEl$.value;
    if (canvasEl && canvasEl.parentNode) {
      canvasEl.parentNode.removeChild(canvasEl);
    }
    this.services.dispose();
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

  selectLayer(layer: SkyBaseLayer | undefined) {
    if (layer) {
      const view = this.getViewByModelId(layer.objectId);
      this.pageState.selectLayer(view);
    } else {
      this.pageState.selectLayer(undefined);
    }
  }

  hoverLayer(layer: SkyBaseLayer | undefined) {
    if (layer) {
      const view = this.getViewByModelId(layer.objectId);
      this.pageState.hoverLayer(view);
    } else {
      this.pageState.hoverLayer(undefined);
    }
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

  exportSelection() {
    const view = this.pageState.selectedLayerView;
    if (!view) {
      alert('Select a layer first.');
      return;
    }

    const img = this.renderView(view, 3);
    if (img) {
      this.getImgFromSkImage(img);
    }
  }

  renderView(view: SkyBaseLayerView, scale: number) {
    const frame = view.renderFrame;

    const surface = this.makeOffscreenSurface(frame.width * scale, frame.height * scale);
    invariant(surface, 'create Surface Error');

    const canvas = surface.getCanvas();
    this.pushCanvas(canvas);
    canvas.scale(scale, scale);
    canvas.translate(-frame.x, -frame.y);

    try {
      view._render();
    } finally {
      this.popCanvas();
    }

    surface.flush();

    return surface.makeImageSnapshot();
  }

  getImgFromSkImage(image: SkImage) {
    invariant(this.skSurface, 'No sk surface ');
    const width = image.width();
    const height = image.height();

    const data = image.readPixels(0, 0, {
      ...this.skSurface.imageInfo(),
      width,
      height,
    });

    invariant(data, 'readPixels failed');

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    invariant(context, '2d canvas context failed');

    const imageData = context.createImageData(width, height);
    imageData.data.set(data);
    context.putImageData(imageData, 0, 0);

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url);
    });
  }
}
