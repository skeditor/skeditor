import { Rect } from '../base/rect';
import { floorBinaryScale } from './tile';
import { TileManager } from './tile-manager';
import { Checkerboard } from './checkerboard';

export class CheckerboardPyramid {
  idealCheckerboard?: Checkerboard;
  lowest?: Checkerboard;

  constructor(private tileManager: TileManager) {}

  drawViewport(scale: number, viewport: Rect) {
    if (this.idealCheckerboard?.scale !== scale) {
      this.deletePreviousIdealCheckerboard();

      this.createIdealCheckerboard(scale);
    }

    this.idealCheckerboard!.drawViewport(viewport);
  }

  // 插入到 link 中去。
  // 如果没有对应 upper 和 lower 则创建
  // 没有对应的 lower 才创建，upper 就可以先不创建
  createIdealCheckerboard(idealScale: number) {
    // const  idealCheckerboard  = this.idealCheckerboard!
    const lowerScale = floorBinaryScale(idealScale);

    const lowerCheckerboard = this.ensureCheckerboardExist(lowerScale);

    if (idealScale === lowerScale) {
      this.idealCheckerboard = lowerCheckerboard;
    } else {
      this.idealCheckerboard = this.ensureCheckerboardExist(idealScale);
    }
  }

  private ensureCheckerboardExist(scale: number) {
    if (this.lowest) {
      // 成为新的 lowest
      if (this.lowest.scale > scale) {
        const ret = new Checkerboard(this.tileManager, scale);
        ret.high = this.lowest;
        this.lowest.low = ret;
        this.lowest = ret;
        return ret;
      }

      let cur: Checkerboard | undefined = this.lowest;
      while (cur.high && cur.scale < scale) {
        cur = cur.high;
      }

      // 1 查找到相同的，2 找到尽头，成为最大的。插入到 cur 上方 scale 3 scale 比较小 插入到 cur 下方

      if (cur.scale === scale) {
        return cur;
      } else {
        const ret = new Checkerboard(this.tileManager, scale);
        if (scale > cur.scale) {
          // 插入到上方
          ret.low = cur;
          ret.high = cur.high;
          cur.high = ret;
        } else {
          // 插入到下方
          ret.high = cur;
          ret.low = cur.low;
          cur.low = ret;
        }
        return ret;
      }
    } else {
      this.lowest = new Checkerboard(this.tileManager, scale);
      return this.lowest;
    }
  }

  // 这里应该有更多 trim 逻辑
  // 现在只是把之前的 ideal scale checkerboard 释放掉
  deletePreviousIdealCheckerboard() {
    // 如果 ideal 刚好是 pow 2 的，就不用销毁了
    if (this.idealCheckerboard && !this.idealCheckerboard.isStair) {
      const low = this.idealCheckerboard.low;
      const high = this.idealCheckerboard.high;
      if (low) {
        low.high = high;
      }
      if (high) {
        high.low = low;
      }
      this.idealCheckerboard.clear();
      this.idealCheckerboard = undefined;
    }
  }
}
