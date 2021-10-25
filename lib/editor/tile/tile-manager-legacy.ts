import { SkImage } from '../model';
import { SkyView } from '../view';
import sk, { newStrokePaint } from '../util/canvaskit';
import { Rect } from '../base/rect';
import { TileBounds } from './tile';

export class TileManager {
  tileWidth = 256;
  tileHeight = 256;

  constructor(private ctx: SkyView, public scale: number) {
    // console.log('>>> new tile manager at:', scale);
  }

  static fromPre(pre: TileManager, newScale: number) {
    if (pre.scale === newScale) {
      return pre;
    }
    const ret = new TileManager(pre.ctx, newScale);
    ret.pre = pre.valuableInstance;

    // 链条不要搞太长
    // if (ret.pre.pre) {
    //   ret.pre.clear();
    //   ret.pre = undefined;
    // }

    return ret;
  }

  get valuableInstance() {
    if (!this.pre) return this;
    if (this.images.size > 0) return this;

    return this.pre;
  }

  images = new Map<string, SkImage>();

  pre?: TileManager;

  saveTile(x: number, y: number, image: SkImage) {
    const key = `${x}:${y}`;
    this.images.set(key, image);
  }

  getTile(x: number, y: number) {
    const key = `${x}:${y}`;
    return this.images.get(key);
  }

  hasTile(x: number, y: number) {
    const key = `${x}:${y}`;
    return this.images.has(key);
  }

  drawTile(xIdx: number, yIdx: number) {
    const key = `${xIdx}:${yIdx}`;
    const image = this.images.get(key);
    const canvas = this.ctx.skCanvas;

    if (image) {
      canvas.drawImageRect(
        image,
        sk.CanvasKit.XYWHRect(0, 0, this.tileWidth, this.tileHeight),
        sk.CanvasKit.XYWHRect(xIdx * this.tileWidth, yIdx * this.tileHeight, this.tileWidth, this.tileHeight),
        null
      );
    } else if (this.pre && this.pre.images.size > 0) {
      const preTileManager = this.pre;
      // 先限制下这个合成的 tile 的范围

      const tileRect = new Rect(xIdx * this.tileWidth, yIdx * this.tileHeight, this.tileWidth, this.tileHeight);

      const relScale = this.scale / preTileManager.scale;

      // scale 变大的话，一个 tile 内显示的内容减少。 那么需要用原来的 tile 拉伸后来填充。
      // scale 变小的话，一个 tile 内显示的内容变多，那么这个 tile 内可能包含多个之前的 tile。

      // 当前 tile 在原来的坐标系中的范围
      // scale 相对变大的话范围减小
      // scale 相对变小的话范围变大
      const currentTileRectInPre = tileRect.scale(1 / relScale).roundPixel();

      const { left, top, right, bottom } = new TileBounds().fromRect(currentTileRectInPre);

      const fns = [] as [number, number][];
      for (let x = left; x < right; x++) {
        for (let y = top; y < bottom; y++) {
          if (preTileManager.hasTile(x, y)) {
            fns.push([x, y]);
          }
        }
      }

      if (fns.length) {
        canvas.save();
        canvas.clipRect(tileRect.toSk(), sk.CanvasKit.ClipOp.Intersect, false);
        // canvas.translate(tileRect.x, tileRect.y);
        // 转换当前 tile 原点在原来坐标系中的位置

        // canvas.translate(-tileRect.x, -tileRect.y);
        canvas.scale(relScale, relScale);

        fns.forEach(([x, y]) => preTileManager.drawTile(x, y));

        // debug border

        // fns.forEach(([x, y]) => {
        //   canvas.drawRect(
        //     sk.CanvasKit.XYWHRect(x * this.tileWidth, y * this.tileHeight, this.tileWidth, this.tileHeight),
        //     newStrokePaint(4, color(xIdx))
        //   );
        // });

        // console.log(`>>> draw tile ${xIdx},${yIdx}@${this.scale}, using ${fns.join('|')}@${preTileManager.scale}`);
        canvas.restore();
      }
    }
  }

  clear() {
    this.images.forEach((img) => img.delete());
    this.images.clear();
  }
}
