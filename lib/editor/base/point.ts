import invariant from 'ts-invariant';
import { Rect } from './rect';

export class Point {
  constructor(public x: number = 0, public y: number = 0) {}
  static clientPointFromMouseEvent(e: MouseEvent, pt?: Point) {
    if (pt !== undefined) {
      pt.x = e.clientX;
      pt.y = e.clientY;
      return pt;
    } else {
      return new Point(e.clientY, e.clientY);
    }
  }

  static fromPointString(str: string) {
    const result = /{(.*), (.*)}/.exec(str);
    if (!result) throw Error('Bad point: ' + str);
    return new Point(parseFloat(result[1]), parseFloat(result[2]));
  }

  /**
   * Calculates the angle ABC (in radians)
   * A first point
   * C second point
   * B center point
   */
  static calcAngleABC(A: Point, B: Point, C: Point) {
    const AB = A.distanceTo(B);
    const BC = B.distanceTo(C);
    const AC = C.distanceTo(A);
    return Math.acos((BC * BC + AB * AB - AC * AC) / (2 * BC * AB));
  }

  applyFrame(rect: Rect) {
    this.x = this.x * rect.width + rect.x;
    this.y = this.y * rect.height + rect.y;
    return this;
  }

  translate(pt: Point) {
    this.x += pt.x;
    this.y += pt.y;
    return this;
  }

  move(x: number, y: number) {
    this.x += x;
    this.y += y;
    return this;
  }

  scale(x: number, y: number) {
    this.x *= x;
    this.y *= y;
    return this;
  }

  scaleNew(x: number, y: number) {
    return this.clone().scale(x, y);
  }

  clone() {
    return new Point(this.x, this.y);
  }

  toString() {
    return `(${this.x | 0}, ${this.y | 0})`;
  }

  toAttrString() {
    return `translate(${this.x} ${this.y})`;
  }

  toArray() {
    return [this.x, this.y];
  }

  distanceTo(other: Point) {
    return Math.hypot(this.x - other.x, this.y - other.y);
  }

  length() {
    return Math.hypot(this.x, this.y);
  }

  inflateRect(padding: number) {
    return new Rect(this.x - padding, this.y - padding, padding * 2, padding * 2);
  }

  add(pt: Point) {
    return new Point(this.x + pt.x, this.y + pt.y);
  }

  minus(pt: Point) {
    return new Point(this.x - pt.x, this.y - pt.y);
  }

  multiply(d: number) {
    return new Point(this.x * d, this.y * d);
  }

  norm() {
    const d = Math.hypot(this.x, this.y);
    invariant(d !== 0, 'cant norm a vector whos len is zero');
    return new Point(this.x / d, this.y / d);
  }

  rotate(radian) {
    const x2 = Math.cos(radian) * this.x - Math.sin(radian) * this.y;
    const y2 = Math.sin(radian) * this.x + Math.cos(radian) * this.y;

    return new Point(x2, y2);
  }

  static diff(from: Point, to: Point, ret?: Point) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (ret !== undefined) {
      ret.x = dx;
      ret.y = dy;
      return ret;
    } else {
      return new Point(dx, dy);
    }
  }
}
