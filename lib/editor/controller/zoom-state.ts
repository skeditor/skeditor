import { IZoomListener } from './zoom-controller';
import { BehaviorSubject, Observable, merge } from 'rxjs';
import { Point } from '../base/point';
import sk from '../util/canvaskit';

const MIN_SCALE = 1 / 1e3;
const MAX_SCALE = 1e3;

export class ZoomState implements IZoomListener {
  public scale$ = new BehaviorSubject<number>(1);

  private _position$ = new BehaviorSubject<Point>(new Point(0, 0));

  private _minScale = MIN_SCALE;

  changed$: Observable<unknown>;

  constructor() {
    this.changed$ = merge(this._position$, this.scale$);
  }

  get position() {
    return this._position$.value;
  }

  get scale() {
    return this.scale$.value;
  }

  // 应用了 position、scale 后相当于这个 matrix
  get matrix() {
    return sk.CanvasKit.Matrix.multiply(
      sk.CanvasKit.Matrix.translated(this.position.x, this.position.y),
      sk.CanvasKit.Matrix.scaled(this.scale, this.scale)
    );
  }

  get interMatrix() {
    return sk.CanvasKit.Matrix.invert(this.matrix)!;
  }

  onOffset(offset: Point) {
    this._position$.next(this.position.minus(offset));
  }

  // Todo 这个应该是有点问题的，pageView 现在不是铺满了全屏幕的了
  onScale(scaleMultiply: number, center: Point) {
    let newScale = this.scale * scaleMultiply;
    newScale = Math.min(Math.max(newScale, this._minScale), MAX_SCALE);

    if (newScale === this.scale) return;

    const invertedMat = this.interMatrix;

    // 应该保持不变的点
    const anchor = sk.CanvasKit.Matrix.mapPoints(invertedMat, [center.x, center.y]);

    this.scale$.next(newScale);

    // scale 后偏移到的新位置
    const anchorShifted = sk.CanvasKit.Matrix.mapPoints(this.matrix, anchor);

    const deltaX = anchorShifted[0] - center.x;
    const deltaY = anchorShifted[1] - center.y;

    this._position$.next(new Point(this.position.x - deltaX, this.position.y - deltaY));
  }

  setScale(scale: number) {
    this.scale$.next(scale);
  }

  setMinScale(scale: number) {
    this._minScale = scale;
  }

  setPosition(pt: Point) {
    this._position$.next(pt);
  }
}
