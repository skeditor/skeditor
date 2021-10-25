import { Rect } from '../base/rect';
import { floorBinaryScale } from './tile';
import { TileManager } from './tile-manager';
import { Checkerboard } from './checkerboard';

// 或者不用双向链表，用两个数组，一个表示 scale 大于 1， 一个表示 scale 小于 1
// 这样还能更加方便的知道长度

// 但是 scale 不一定从 1 或者 -1/2 开始。

// 先来考虑下我们 checkerboard 的 接口吧

// 当前这个模块都是用 pixel 为单位，主要是为了将这块逻辑抽象出来，方便测试。
// 在其他逻辑都走通之后再接入到 page 中去。

export class CheckerboardPyramid {
  // 算上 dpi 的 scale，
  // 当前绘制使用的 scale
  // 每次绘制的时候可能改变。 也可能不变，比如 pan 的时候。
  // scale: number;

  // 当前需要绘制的视口，以像素为单位
  // viewport: rect;

  // 内容的区域大小，在我这里看可以当作是不变的。

  // content bounds 这里来看主要是为了优化空白区域的绘制，没有什么别的作用，是不是根本就需要放在这个类中呢？
  // 可以先去掉
  // contentBounds: rect;

  idealCheckerboard?: Checkerboard;

  // smallest scale
  lowest?: Checkerboard;
  // highest scale
  // highest?: Checkerboard;

  constructor(private tileManager: TileManager) {}

  drawViewport(scale: number, viewport: Rect) {
    // 每次绘制都需要这两个参数
    // 通过这两个参数可以知道需要哪些 tile
    // 计算出 floorScale
    // 但是也应该有可能用 ceilScale 来绘制啊、
    // 这就很麻烦了，最终那我可能绘制出的内容，一半高分辨率，一半低分辨率

    // 可不可以这样，从 ideal scale 朝着高分辨率和低分辨率两个方向去查找。

    // 或者是不是每个 lower 分辨 checkerboard 上都应有上一层的信息，也就是， 上一层在这一层能够有多少覆盖范围的信息。
    // 这样不好，在最低分辨率上经过不断 floor 应该啥都没有剩下了。
    // 好难呀 🤯

    // 从低分辨率开始，一直向高分辨率绘制得了。 耗费就耗费点。而且高分辨率的，只要超过了 ideal scale 就不用再向上绘制。

    // 或者，还是 nearest scale 开始。先用当前 scale， 再用 upper scale。 再不行再用 lower scale。
    // 这个思路应该是正确的
    // 调用 upper 或者 lower 的时候最好都要返回下是否绘制成功了。
    //

    if (this.idealCheckerboard?.scale !== scale) {
      // this.currentCheckerboard
      // 直接调用绘制就好了

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
    // const lowest = this.low
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
      // const beforeSize = this.tileManager.cacheTiles.size;
      this.idealCheckerboard.clear();
      // const afterSize = this.tileManager.cacheTiles.size;
      // console.log('>>> clear scale', this.idealCheckerboard.scale, beforeSize, afterSize);
      this.idealCheckerboard = undefined;
    }
  }
}
