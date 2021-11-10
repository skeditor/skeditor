import { Rect } from '../base/rect';
import { TileBounds, Tile, Priority } from './tile';
import { SkImage } from '../model';
import { SkyPageView } from '../view/page-view';
import { CheckerboardPyramid } from './checkerboard-pyramid';
import { Raf } from '../util/misc';
import { LruCache } from '../util/lru';

/**
 * Tile manager 才是应该暴露给 page view 的
 * 现在，先把所有逻辑都放在这个文件中
 * 所有其他类，按说也应该引用 TileManager 的。
 */
export class TileManager {
  // Page 首次绘制时不需要通过 raf 分片
  // 完成第一次绘制后设置成 false
  blockingMode = true;

  private pyramid = new CheckerboardPyramid(this);

  private caches = new LruCache<SkImage>(1024, (img) => img.delete());

  private requiredTiles: [number, number, number, Priority][] = [];

  debugHeavyTiles = new Set<string>();

  private raf = new Raf();

  constructor(private pageView: SkyPageView) {}

  get ctx() {
    return this.pageView.ctx;
  }

  get canvas() {
    return this.ctx.skCanvas;
  }

  get contentBounds() {
    return this.pageView.bounds;
  }

  getContentTileBounds(scale: number) {
    const pixelRect = this.contentBounds.scale(scale).roundPixel();
    return new TileBounds().fromRect(pixelRect);
  }

  genKey(scale: number, xIdx: number, yIdx: number) {
    return `${scale}:${xIdx}:${yIdx}`;
  }

  hasTile(scale: number, xIdx: number, yIdx: number) {
    return !!this.caches.get(this.genKey(scale, xIdx, yIdx));
  }

  getTile(scale: number, xIdx: number, yIdx: number): SkImage | undefined {
    return this.caches.get(this.genKey(scale, xIdx, yIdx));
  }

  saveTile(scale: number, xIdx: number, yIdx: number, img: SkImage) {
    return this.caches.set(this.genKey(scale, xIdx, yIdx), img);
  }

  /**
   *
   * @param scale 已经算上 dpi ，实际的绘制 scale
   * @param viewport viewport 已经是像素单位了, 只跟视口大小和 dpi 有关。
   */
  drawViewport(scale: number, viewport: Rect) {
    // 重新绘制的时候要重新计算哪些 tile 需要使用
    this.requiredTiles.length = 0;
    this.raf.cancel();

    this.pyramid.drawViewport(scale, viewport);

    if (this.requiredTiles.length > 0) {
      if (this.blockingMode) {
        this.scheduleWork();
      } else {
        this.raf.execute(() => this.scheduleWork());
      }
    }
    if (this.blockingMode) {
      this.blockingMode = false;

      // 因为还在 render 中 frame 执行，这里面设置 markDirty 无效。
      Promise.resolve().then(() => {
        this.ctx.markDirty();
      });
    }
  }

  requireTile(scale: number, x: number, y: number, priority: Priority) {
    this.requiredTiles.push([scale, x, y, priority]);
  }

  clearScaleTile(scale: number) {
    const scaleSt = scale + ':';
    const map = this.caches.map;
    const keys = Object.keys(map);

    for (const key of keys) {
      if (key.indexOf(scaleSt) === 0) {
        this.caches.delete(key);
      }
    }
  }

  clearAll() {
    this.caches.clear();
  }

  private async scheduleWork() {
    let jobStart = Date.now();

    let dirty = 0;
    this.requiredTiles.sort((a, b) => b[3] - a[3]);
    for (const args of this.requiredTiles) {
      const [scale, x, y] = args;
      const start = Date.now();

      // actual job
      this.fillTile(scale, x, y);
      dirty++;

      const cost = Date.now() - start;
      // console.log('>>> Fill tile', scale, x, y, cost);
      if (cost > 16) {
        this.debugHeavyTiles.add(this.genKey(scale, x, y));
      }

      const accumulatedCost = Date.now() - jobStart;
      if (accumulatedCost > 8) {
        // console.log('>>> Gen tile count and costs', dirty, accumulatedCost);

        this.ctx.markDirty();
        dirty = 0;

        if (!this.blockingMode) {
          await this.raf.nextFrame();
        }
        jobStart = Date.now();
      }
    }
    if (dirty) {
      this.ctx.markDirty();
    }
  }

  fillTile(scale: number, xIdx: number, yIdx: number) {
    if (this.hasTile(scale, xIdx, yIdx)) return;

    const ctx = this.ctx;

    const surface = ctx.makeOffscreenSurface(Tile.width, Tile.height);
    if (!surface) return;

    const canvas = surface.getCanvas();

    ctx.pushCanvas(canvas);

    this.pageView.drawContent(scale, Tile.width * xIdx, Tile.height * yIdx);

    ctx.popCanvas();

    surface.flush();

    const image = surface.makeImageSnapshot();

    this.saveTile(scale, xIdx, yIdx, image);

    surface.delete();
  }

  debugTexture(scale: number, x: number, y: number) {
    const image = this.getTile(scale, x, y);
    if (!image) return;
    this.ctx.getImgFromSkImage(image);
  }

  dispose() {
    this.caches.clear();
  }
}
