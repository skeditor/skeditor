import { Point } from './point';
import SketchFormat from '@sketch-hq/sketch-file-format-ts';
import sk from '../util/canvaskit';
import { Matrix } from '.';

export class Rect {
  constructor(public x: number = 0, public y: number = 0, public width: number = 0, public height: number = 0) {}

  static fromSketchRect(rect: SketchFormat.Rect) {
    return new Rect(rect.x, rect.y, rect.width, rect.height);
  }

  static mergeRects(rects: Rect[]) {
    let left = Number.MAX_SAFE_INTEGER,
      right = Number.MIN_SAFE_INTEGER,
      top = Number.MAX_SAFE_INTEGER,
      bottom = Number.MIN_SAFE_INTEGER;

    if (rects.length === 0) {
      throw new Error('Bad param');
    }

    rects.forEach((rect) => {
      const { x, y, width, height } = rect;

      left = Math.min(left, x);
      right = Math.max(right, x + width);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y + height);
    });
    const ret = new Rect(left, top, right - left, bottom - top);
    return ret;
  }

  static fromDomRect(rect: DOMRect) {
    return new Rect(rect.left, rect.top, rect.width, rect.height);
  }

  size(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  equals(other: Rect) {
    return this.x === other.x && this.y === other.y && this.width === other.width && this.height === other.height;
  }

  clone() {
    return new Rect(this.x, this.y, this.width, this.height);
  }
  get left() {
    return this.x;
  }
  get right() {
    return this.x + this.width;
  }
  get top() {
    return this.y;
  }
  get bottom() {
    return this.y + this.height;
  }
  get center(): Point {
    return new Point(this.x + this.width / 2, this.y + this.height / 2);
  }

  get leftTop() {
    return new Point(this.x, this.y);
  }

  applyFill(ctx: CanvasRenderingContext2D) {
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  containsPoint(pt: Point): boolean {
    return this.x <= pt.x && pt.x < this.right && this.y <= pt.y && pt.y < this.bottom;
  }

  inflate(padding: number) {
    return new Rect(this.x - padding, this.y - padding, this.width + padding * 2, this.height + padding * 2);
  }

  get onlySize() {
    return new Rect(0, 0, this.width, this.height);
  }

  offset(x: number, y: number) {
    return new Rect(this.x + x, this.y + y, this.width, this.height);
  }

  toSk() {
    return sk.CanvasKit.XYWHRect(this.x, this.y, this.width, this.height);
  }

  scale(s: number) {
    return new Rect(this.x * s, this.y * s, this.width * s, this.height * s);
  }

  roundPixel() {
    const left = Math.floor(this.x);
    const top = Math.floor(this.y);
    const right = Math.ceil(this.x + this.width);
    const bottom = Math.ceil(this.y + this.height);
    return new Rect(left, top, right - left, bottom - top);
  }

  static fromSk(arr: Float32Array) {
    return new Rect(arr[0], arr[1], arr[2] - arr[0], arr[3] - arr[1]);
  }

  static Empty = new Rect(0, 0, 0, 0);

  static fromPoints(points: Point[]) {
    if (points.length < 2) throw new Error('require at least two points');
    let left = Number.MAX_SAFE_INTEGER;
    let right = Number.MIN_SAFE_INTEGER;
    let top = Number.MAX_SAFE_INTEGER;
    let bottom = Number.MIN_SAFE_INTEGER;

    points.forEach((pt) => {
      left = Math.min(left, pt.x);
      right = Math.max(right, pt.x);
      top = Math.min(top, pt.y);
      bottom = Math.max(bottom, pt.y);
    });
    return new Rect(left, top, right - left, bottom - top);
  }

  /**
   * 以当前 rect 为容器，将 content 放置在中间。
   * 返回 scale 和 offset。
   *
   * 如果内容比较小，则放大 （也不要放太大了）
   * 如果内容比较大，则缩小
   */
  layoutRectInCenter(content: Rect, padding = 0) {
    const actualContainer = padding ? this.inflate(-padding) : this;

    const scaleW = actualContainer.width / content.width;
    const scaleH = actualContainer.height / content.height;

    const scale = Math.min(scaleH, scaleW);

    const translate = this.center.minus(content.scale(scale).center);

    return {
      translate,
      scale,
    };
  }

  toPoints() {
    return [
      this.leftTop,
      new Point(this.x + this.width, this.y),
      new Point(this.x + this.width, this.height + this.y),
      new Point(this.x, this.y + this.height),
    ];
  }

  applyMatrix(matrix: Matrix) {
    return Rect.fromPoints(this.toPoints().map((pt) => matrix.apply(pt, pt)));
  }
}
