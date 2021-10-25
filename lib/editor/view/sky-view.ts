import debug from 'debug';
import { Disposable } from '../base/disposable';

import { SkyModel, SkyPage, ClassValue, SkySymbolMaster } from '../model';
import sk, { CanvaskitPromised, getFontMgr } from '../util/canvaskit';
import { animationFrameScheduler } from 'rxjs';

import type { CanvasKit as CanvasKitType, FontMgr, Surface as SkSurface, Canvas as SkCanvas } from 'canvaskit-wasm';

import { SkyPageView, SkyPageContainerView } from './page-view';
import { Rect } from '../base/rect';
import invariant from 'ts-invariant';
import { PointerController } from '../controller/pointer-controller';
import { SkyBaseView } from './base';
import { Point } from '../base/point';
import { SkySymbolInstanceView, SkySymbolMasterView } from './symbol-view';
// import { createImageFromTexture } from '~/lib/webgl/show-texture';

const DebugPrintTree = false;
const DebugRenderCost = false;

export class SkyView extends Disposable {
  static currentContext: SkyView;

  canvasEl: HTMLCanvasElement;
  rootView?: SkyPageContainerView;

  skSurface!: SkSurface;
  skCanvas!: SkCanvas;
  fontMgr!: FontMgr;

  private dirty = true;

  dpi = 1;
  // 浏览器坐标系， 包括 ruler 部分

  frame = new Rect();

  _canvasStack = [] as SkCanvas[];

  // 当前绘制的 symbol instance context
  // 在 render 的时候使用，后续可以改成放在 renderCtx 中。
  symbolContext?: SkySymbolInstanceView;
  _symbolContextStack: SkySymbolInstanceView[] = [];

  /**
   * 由于需要确保 canvaskit 初始化完成，不能直接调用构造函数
   */
  static async create(model: SkyModel, foreignEl: HTMLElement) {
    return await CanvaskitPromised.then(() => {
      return getFontMgr();
    }).then((fontMgr) => {
      const skyView = new SkyView(model, foreignEl);
      skyView.fontMgr = fontMgr;
      SkyView.currentContext = skyView;
      return skyView;
    });
  }

  private constructor(private model: SkyModel, private foreignEl: HTMLElement) {
    super();
    this.canvasEl = document.createElement('canvas');

    this.canvasEl.style.width = '100%';
    this.canvasEl.style.height = '100%';
    this.attachParentNode(foreignEl);

    this._disposables.push(
      model.changed$.subscribe(() => {
        this.markDirty();
      }),
      new PointerController(this)
    );
  }

  private attachParentNode(el: HTMLElement) {
    el.appendChild(this.canvasEl);
    this.doResize();

    const view = this;

    // 定时渲染
    this._disposables.push(
      animationFrameScheduler.schedule(function () {
        if (view._disposed) return;
        view.render();
        this.schedule();
      }, 0)
    );
  }

  // canvasEl 保持和 parentNode 一样大
  doResize() {
    const bounds = this.canvasEl.getBoundingClientRect();
    this.frame.width = bounds.width;
    this.frame.height = bounds.height;
    this.dpi = window.devicePixelRatio;
    this.canvasEl.width = bounds.width * this.dpi;
    this.canvasEl.height = bounds.height * this.dpi;
    this.skSurface = sk.CanvasKit.MakeCanvasSurface(this.canvasEl)!;
    this.skCanvas = this.skSurface.getCanvas();
  }

  makeOffscreenSurface(width: number, height: number) {
    // return sk.CanvasKit.MakeSurface(width, height)!;

    return this.skSurface.makeSurface({
      ...this.skSurface.imageInfo(),
      width,
      height,
    });
  }

  renderPage(i: number = 0) {
    const skyPage = this.model.pages[i];

    invariant(!!skyPage, `Page not exist: [${i}]`);

    const skyPageView = new SkyPageContainerView(skyPage);

    this.rootView = skyPageView;
    this.rootView.layout();

    skyPageView.showFullContent();

    if (DebugPrintTree) {
      this.debugPrintTree(this.rootView);
    }
    this.markDirty();
  }

  private debugPrintTree(node: any) {
    console.group(node?.debugString?.());
    node?.children?.forEach((child) => this.debugPrintTree(child));
    console.groupEnd();
  }

  markDirty() {
    this.dirty = true;
  }

  visibleLayers() {
    //
  }

  get zoomState() {
    return this.rootView!.zoomState;
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

    this.skCanvas.clear(sk.CanvasKit.TRANSPARENT);
    if (this.rootView) {
      const start = Date.now();
      this.skCanvas.save();
      this.skCanvas.scale(this.dpi, this.dpi);
      this.rootView.layout();
      this.rootView.render();
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

    this.skCanvas.concat(sk.CanvasKit.Matrix.invert(currentMatrix)!);
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
    const ctx = (this.canvasEl as any).qf.qe;
    if (debugTextures) {
      debugTextures.forEach((t, idx) => {
        // createImageFromTexture(idx, ctx, t, 4096, 4096);
      });
    }
  }
}
