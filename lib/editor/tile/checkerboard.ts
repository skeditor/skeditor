import { Rect } from '../base/rect';
import { TileBounds, floorBinaryScale, Tile, Priority } from './tile';

import sk, { newStrokePaint } from '../util/canvaskit';
import { TileManager } from './tile-manager';
import { SkColor } from '../model';

const DebugShowCheckBoardGrid = false;
const DebugShowCheckBoardGridLow = false;

/**
 * 一个 checkerboard 只表示一个分辨率下的内容
 * 大部分的checkerboard 都是 pow 2 scale。 只有一个 ideal scale
 */
export class Checkerboard {
  // pre should have lower scale

  // 高分辨率 checkerboard
  high?: Checkerboard;

  // 更低分辨率的 checkerboard
  low?: Checkerboard;

  // scale = 1; // should be power of 2

  isStair = false;

  constructor(private tileManager: TileManager, public scale: number) {
    this.isStair = floorBinaryScale(scale) === scale;
  }

  clear() {
    this.tileManager.clearScaleTile(this.scale);
  }

  drawTile(x: number, y: number) {
    const canvas = this.tileManager.canvas;
    const image = this.tileManager.getTile(this.scale, x, y);
    if (image) {
      canvas.drawImageRect(image, Tile.getRect(0, 0).toSk(), Tile.getRect(x, y).toSk(), null);
    }
  }

  // 返回值表示是否绘制成功
  // 如果绘制失败可以要求更新 tile
  // lower 的时候可以递归。 当然现在也可以先不做
  drawOtherScaleTile(otherScale: number, x: number, y: number): boolean {
    const toLower = otherScale > this.scale; // 借用低分辨率，是否是使用低分辨率绘制高分辨率内容

    // 是否优先申请这个 scale 的 tile
    const highPriority = toLower && otherScale !== floorBinaryScale(otherScale);

    // scale 相对值
    const relScale = this.scale / otherScale;

    // 在 other scale 比例下需要填充的区域
    const otherFillRect = Tile.getRect(x, y);

    const curFillRect = otherFillRect.scale(relScale).roundPixel();

    const { left, top, right, bottom } = new TileBounds().fromRect(curFillRect);

    // const tiles = [] as [number, number][];

    let missTile = false;

    const canvas = this.tileManager.canvas;

    canvas.save();
    canvas.clipRect(otherFillRect.toSk(), sk.CanvasKit.ClipOp.Intersect, false);

    canvas.scale(1 / relScale, 1 / relScale);

    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        if (this.tileManager.hasTile(this.scale, x, y)) {
          this.drawTile(x, y);
        } else {
          const checkerboard = toLower ? this.low : this.high;
          missTile = !checkerboard || !checkerboard.drawOtherScaleTile(this.scale, x, y);

          // if (!toLower && missTile) {
          //   canvas.restore();
          //   return false;
          // }

          if (highPriority) {
            this.tileManager.requireTile(this.scale, x, y, missTile ? Priority.High : Priority.Middle);
          }
        }
      }
    }
    canvas.restore();
    return !missTile;
  }

  // viewport 已经是像素单位了
  //
  drawViewport(viewport: Rect) {
    const { tileManager, scale } = this;

    // 先算出来，在当前 scale 下需要绘制哪些 tile
    const viewTileBounds = new TileBounds().fromRect(viewport);
    //
    const { left, top, right, bottom } = viewTileBounds;
    const contentTileBounds = this.tileManager.getContentTileBounds(this.scale);
    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        if (!contentTileBounds.contains(x, y)) continue;
        // simple just draw it
        if (tileManager.hasTile(scale, x, y)) {
          this.drawTile(x, y);
        } else {
          // 没有当前 tile 加入到 requirements， 但优先级比较低
          tileManager.requireTile(scale, x, y, Priority.Low);

          // 如果 high 绘制成功了
          if (!this.high?.drawOtherScaleTile(scale, x, y)) {
            this.low?.drawOtherScaleTile(scale, x, y);
          }
        }
      }
    }

    // 存下来，方便 debug
    (this as any).debugContentTileBounds = contentTileBounds;
    (this as any).debugViewportTileBounds = viewTileBounds;

    if (DebugShowCheckBoardGrid) {
      // 绘制下 lower 的 grid
      this.debugDrawViewportGrids(viewport);
      if (this.low && DebugShowCheckBoardGridLow) {
        const { canvas } = tileManager;
        canvas.save();
        const relScale = this.scale / this.low.scale;
        canvas.scale(relScale, relScale);
        this.low?.debugDrawViewportGrids(viewport, sk.CanvasKit.GREEN);
        canvas.restore();
      }
    }

    // for loop
    // check hasTile
    // no? to low priority requirements
    // yes? just draw it and next iter
    // check high tiles
    // check low tiles
    // no // require it
    // recursively ask for lower but not require it.
    // yes // draw it
  }

  debugDrawViewportGrids(viewport: Rect, color?: SkColor) {
    const { left, top, right, bottom } = new TileBounds().fromRect(viewport);
    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        const debugColor =
          color ||
          (this.tileManager.debugHeavyTiles.has(this.tileManager.genKey(this.scale, x, y))
            ? sk.CanvasKit.Color(255, 0, 0, 0.5)
            : sk.CanvasKit.Color(0, 0, 255, 0.5));

        this.tileManager.canvas.drawRect(
          sk.CanvasKit.XYWHRect(x * Tile.width + 2, y * Tile.height + 2, Tile.width - 4, Tile.height - 4),
          newStrokePaint(2, debugColor)
        );
      }
    }
  }
}
