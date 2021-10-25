import { Rect } from '../base/rect';

export const enum Priority {
  Low,
  Middle,
  High,
}

export class Tile {
  static width = 256;
  static height = 256;

  static getRect(xIdx: number, yIdx: number) {
    return new Rect(xIdx * Tile.width, yIdx * Tile.height, Tile.width, Tile.height);
  }
}

export class TileBounds {
  left = 0;
  top = 0;
  right = 0;
  bottom = 0;

  fromRect(rect: Rect) {
    const tileWidth: number = Tile.width;
    const tileHeight: number = Tile.height;
    // 闭区间 idx
    this.left = Math.floor(rect.x / tileWidth);
    this.top = Math.floor(rect.y / tileHeight);

    // 开区间 idx
    this.right = Math.ceil(rect.right / tileWidth);
    this.bottom = Math.ceil(rect.bottom / tileHeight);
    return this;
  }

  contains(x: number, y: number) {
    return x >= this.left && x < this.right && y >= this.top && y < this.bottom;
  }
}

/**
 * 返回 2 的指数次的 scale。 向下取临近值。
 *
 * 以 2 的 n 次方划分 scale。返回临近且较小的 scale。
 * 指数    -3  ｜  -2 ｜  -1 ｜ 0 ｜ 1 ｜ 2 ｜ 3
 * scale：-1/8 ｜-1/4 ｜-1/2 ｜ 1 ｜ 2 ｜ 4 ｜8
 *
 *
 * @param scale
 */
export function floorBinaryScale(scale: number) {
  if (isNaN(scale) || scale <= 0) throw 'Bad arg';
  return Math.pow(2, Math.floor(Math.log2(scale)));
}
