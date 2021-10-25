import { Rect } from '../base/rect';
import sk, { newStrokePaint } from '../util/canvaskit';
import { SkyPageView } from '../view/page-view';
import { TileManager } from './tile-manager-legacy';
import { TileBounds } from './tile';

const DebugShowCheckBoardGrid = false;

// Todo, 和 TileManager 互换下名字
export class CheckerBoard {
  tileWidth = 256;
  tileHeight = 256;

  private _contentTileBounds = new TileBounds();

  viewportTileBounds = new TileBounds();

  tileManager: TileManager;

  constructor(private pageView: SkyPageView) {
    console.log('>>> new check board');
    this.tileManager = new TileManager(this.pageView.ctx, 1);
  }

  get ctx() {
    return this.pageView.ctx;
  }

  private calcBoard() {
    // const scale = this._scale;
    // 像素级别的区域， scale 包含了 devicePixel Ratio 的缩放。
    // const pixelRect = this.contentBounds.scale(scale).roundPixel();
    // // 闭区间 idx
    // this.left = Math.floor(pixelRect.x / this.tileWidth);
    // this.top = Math.floor(pixelRect.y / this.tileHeight);
    // // 开区间 idx
    // this.right = Math.ceil(pixelRect.right / this.tileWidth);
    // this.bottom = Math.ceil(pixelRect.bottom / this.tileHeight);
    // 总共有
    // boardRight - boardLeft 列
    // boardBottom - boardTop 行
  }

  // drawGrids(canvas: SkCanvas) {
  //   for (let x = this.left; x < this.right; x++) {
  //     for (let y = this.top; y < this.bottom; y++) {
  //       canvas.drawRect(
  //         sk.CanvasKit.XYWHRect(x * this.tileWidth, y * this.tileHeight, this.tileWidth, this.tileHeight),
  //         newStrokePaint(1, sk.CanvasKit.RED)
  //       );
  //     }
  //   }
  // }

  get contentScale() {
    return this.pageView.contentScale;
  }

  get contentBounds() {
    return this.pageView.bounds;
  }

  get contentTileBounds() {
    const scale = this.contentScale;
    // 像素级别的区域， scale 包含了 devicePixel Ratio 的缩放。
    const pixelRect = this.contentBounds.scale(scale).roundPixel();
    this._contentTileBounds.fromRect(pixelRect);
    return this._contentTileBounds;
  }

  drawViewportGrids(viewport: Rect) {
    // viewport scale 是 1 或者 2。 所以不用 roundPixel.
    // viewport = viewport.roundPixel()

    const canvas = this.ctx.skCanvas;

    this.viewportTileBounds.fromRect(viewport);

    const { left, top, right, bottom } = this.viewportTileBounds;

    const contentTileBounds = this.contentTileBounds;

    const pre = this.tileManager;
    this.tileManager = TileManager.fromPre(pre, this.contentScale);
    // console.log(`>>> create tile manger with pre`, this.contentScale, this.tileManager.scale, pre.scale);

    // // 闭区间 idx
    // const left = Math.floor(viewport.x / this.tileWidth);
    // const top = Math.floor(viewport.y / this.tileHeight);

    // // 开区间 idx
    // const right = Math.ceil(viewport.right / this.tileWidth);
    // const bottom = Math.ceil(viewport.bottom / this.tileHeight);

    this.requiredTiles.clear();
    for (let x = left; x < right; x++) {
      for (let y = top; y < bottom; y++) {
        const key = `${x}:${y}`;

        // 在内容区域才需要用 tile 绘制
        if (contentTileBounds.contains(x, y)) {
          // raster
          this.ensureTile(x, y);

          // draw texture

          // this.drawTile(x, y);
          this.tileManager.drawTile(x, y);
        }

        if (DebugShowCheckBoardGrid) {
          const debugColor = this.debugHeavyTiles.has(key) ? sk.CanvasKit.RED : sk.CanvasKit.BLUE;
          // draw grids
          canvas.drawRect(
            sk.CanvasKit.XYWHRect(
              x * this.tileWidth + 2,
              y * this.tileHeight + 2,
              this.tileWidth - 4,
              this.tileHeight - 4
            ),
            newStrokePaint(2, debugColor)
          );
        }
      }
    }
  }

  ensureAllContent() {
    const { left, right, top, bottom } = this.contentTileBounds;
    console.log('>>>> ensureAllContent', this.contentTileBounds);
    const tiles = new Set<string>();
    for (let x = left; x < right; x++) {
      for (let y = top; y < bottom; y++) {
        // raster
        // this.ensureTile(x, y);
        tiles.add(`${x}:${y}`);
      }
    }
    requestAnimationFrame(() => this.scheduleWork(tiles));
  }

  // cacheCanvas

  requiredTiles = new Set<string>();

  debugHeavyTiles = new Set<string>();

  scheduling = false;

  ensureTile(xIdx: number, yIdx: number) {
    if (this.debugStopFillTile) return;

    const key = `${xIdx}:${yIdx}`;
    if (!this.tileManager.hasTile(xIdx, yIdx)) {
      this.requiredTiles.add(key);
      if (!this.scheduling) {
        this.scheduling = true;
        requestAnimationFrame(() => this.scheduleWork(this.requiredTiles));
      }
    }
  }

  private async scheduleWork(jobs: Set<string>) {
    let jobStart = Date.now();

    let viewportDirty = false;

    for (let key of jobs) {
      const [x, y] = key.split(':');
      const start = Date.now();
      const _x = parseInt(x);
      const _y = parseInt(y);

      // actual job
      this.fillTiles(_x, _y);

      if (!viewportDirty) {
        viewportDirty = this.viewportTileBounds.contains(_x, _y);
      }

      const cost = Date.now() - start;
      console.log('>>> Fill tile', key, cost);
      if (cost > 16) {
        this.debugHeavyTiles.add(key);
      }

      const accumulatedCost = Date.now() - jobStart;
      if (accumulatedCost > 8) {
        // console.log('>>>> gen tile in ac', genTiles, accumulatedCost);
        if (viewportDirty) {
          this.ctx.markDirty();
        }
        await this.nextFrame();
        jobStart = Date.now();
      }
    }
    if (viewportDirty) {
      this.ctx.markDirty();
    }
    this.scheduling = false;
  }

  nextFrame() {
    return new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });
  }

  // 需要一个 raf 不能一下子绘制太多
  // 需要一个大 texture、将所有 tile 都画上去 4096 * 4096
  // 需要 page 支持只绘制一部分区域
  // offscreen buffer 调整好区域，做好 clip
  // quick reject 是否能够支持呢？
  // 比如我想要绘制 content 一块区域，到 checkerboard 任意位置？
  fillTiles(xIdx: number, yIdx: number) {
    const key = `${xIdx}:${yIdx}`;

    if (this.tileManager.hasTile(xIdx, yIdx)) return;

    const ctx = this.ctx;

    const surface = ctx.makeOffscreenSurface(this.tileWidth, this.tileHeight);

    const canvas = surface.getCanvas();

    ctx.pushCanvas(canvas);

    this.pageView.drawContent(this.contentScale, 256 * xIdx, 256 * yIdx);

    ctx.popCanvas();

    surface.flush();

    const image = surface.makeImageSnapshot();

    this.tileManager.saveTile(xIdx, yIdx, image);

    surface.delete();
  }

  // drawTile(xIdx: number, yIdx: number) {
  //   //
  // }

  debugTexture(x: number, y: number) {
    const image = this.tileManager.getTile(x, y);
    if (!image) return;

    const width = image.width();
    const height = image.height();

    const data = image.readPixels(0, 0, {
      ...this.ctx.skSurface!.imageInfo(),
      width,
      height,
    })!;

    // Create a 2D canvas to store the result
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d')!;

    // Copy the pixels to a 2D canvas
    var imageData = context.createImageData(width, height);
    imageData.data.set(data);
    context?.putImageData(imageData, 0, 0);

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url);
    });
  }

  debugInvalidateAll() {
    this.tileManager.clear();
    this.requiredTiles.clear();
    this.debugHeavyTiles.clear();
  }

  debugStopFillTile = false;

  debug1() {
    this.debugStopFillTile = true;
  }
}
