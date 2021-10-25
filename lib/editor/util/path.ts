// 之前用 paperjs 之前的代码可以拿来用，开森

import sk from './canvaskit';
import { Rect } from '../base/rect';
import { SkyCurvePoint, SkyCurveMode } from '../model';
import { Point } from '../base/point';

type CornerCalcInfo = {
  curPoint: Point;
  preTangent: Point;
  nextTangent: Point;
  preHandle: Point;
  nextHandle: Point;
};

/**
 * 另外关于 curvePoint
 * curveMode 默认 1， 应该表示没有 curve，直来直去
 *    只有 curveMode = 1 的时候，cornerRadius 才有效
 * curveMode 2, 表示 control point 是对称的，长度一样
 * curveMode 4, disconnected, control point 位置随意
 * curveMode 3, 也是对称，长度可以不一样
 */
export function createPath(points: SkyCurvePoint[], isClosed: boolean) {
  let hasBegin = false;

  const path = new sk.CanvasKit.Path();
  const len = points.length;
  if (len < 2) return;

  const cacheCornerCalcInfo: { [k: number]: CornerCalcInfo } = {};

  for (let i = 0; i < len - 1; i++) {
    _connectTwo(i, i + 1);
  }
  if (isClosed) {
    _connectTwo(len - 1, 0);
    path.close();
  }

  function _isCornerRadius(idx: number) {
    const curvePoint = points[idx];
    if (!isClosed && (idx === 0 || idx === len - 1)) {
      return false;
    }
    return curvePoint.curveMode === SkyCurveMode.Straight && curvePoint.cornerRadius > 0;
  }

  /**
   * # Notice 1
   * sketch 可以设置并存储的 corner radius 可能非常大，绘制的时候需要加以限制。
   * 1.1 如果一个 corner 另外两端都没有 corner，那么 cornerRadius 实际最大值，以两侧较短一侧为准。
   * 1.2 如果 corner 另外两端也有 corner，那么 cornerRadius 实际最大值，要以较短一侧一半为准。
   *
   *
   * @param idx
   * @returns
   */
  function _getCornerInfo(idx: number): CornerCalcInfo {
    if (cacheCornerCalcInfo[idx]) {
      return cacheCornerCalcInfo[idx];
    }
    const pre = idx === 0 ? points[len - 1] : points[idx - 1];
    const cur = points[idx];
    const next = idx === len - 1 ? points[0] : points[idx + 1];

    let radius = cur.cornerRadius;

    // 拿到三个点
    const prePoint = pre.point; // A
    const curPoint = cur.point; // B
    const nextPoint = next.point; // C

    const lenAB = curPoint.distanceTo(prePoint);
    const lenBC = curPoint.distanceTo(nextPoint);

    // 三点之间的夹角
    const radian = Point.calcAngleABC(prePoint, curPoint, nextPoint);

    // 计算相切的点距离 curPoint 的距离， 在 radian 为 90 deg 的时候和 radius 相等。
    const tangent = Math.tan(radian / 2);
    let dist = radius / tangent;

    // 校准 dist，用户设置的 cornerRadius 可能太大，而实际显示 cornerRadius 受到 AB BC 两边长度限制。
    // 如果 B C 端点设置了 cornerRadius，可用长度减半
    const minDist = Math.min(
      pre.curveMode === SkyCurveMode.Straight && pre.cornerRadius > 0 ? lenAB / 2 : lenAB,
      next.curveMode === SkyCurveMode.Straight && next.cornerRadius > 0 ? lenBC / 2 : lenBC
    );

    if (dist > minDist) {
      dist = minDist;
      radius = dist * tangent;
    }

    // 方向向量
    const vPre = prePoint.minus(curPoint).norm();
    const vNext = nextPoint.minus(curPoint).norm();

    // 相切的点
    const preTangent = vPre.multiply(dist).add(curPoint);
    const nextTangent = vNext.multiply(dist).add(curPoint);

    // 计算 cubic handler 位置
    const kappa = (4 / 3) * Math.tan((Math.PI - radian) / 4);

    const preHandle = vPre.multiply(-radius * kappa).add(preTangent);
    const nextHandle = vNext.multiply(-radius * kappa).add(nextTangent);

    cacheCornerCalcInfo[idx] = {
      curPoint,
      preTangent,
      nextTangent,
      preHandle,
      nextHandle,
    };

    return cacheCornerCalcInfo[idx];
  }

  // #####
  // curveFrom: 表示作为 from 点的时候的控制点
  // curveTo: 表示作为 to 点的时候的控制点
  // #####
  function _connectTwo(fromIdx: number, toIdx: number) {
    let startPt: Point;
    let startHandle: Point | undefined;

    let endPt: Point;
    let endHandle: Point | undefined;

    // 获取起始点信息
    if (_isCornerRadius(fromIdx)) {
      const { nextTangent } = _getCornerInfo(fromIdx);

      startPt = nextTangent;
    } else {
      const fromCurvePoint = points[fromIdx];
      startPt = fromCurvePoint.point;
      startHandle = fromCurvePoint.hasCurveFrom ? fromCurvePoint.curveFrom : undefined;
    }

    if (!hasBegin) {
      hasBegin = true;
      path.moveTo(startPt.x, startPt.y);
    }

    // 获取终点信息
    if (_isCornerRadius(toIdx)) {
      const { preTangent } = _getCornerInfo(toIdx);
      endPt = preTangent;
    } else {
      const toCurvePoint = points[toIdx];
      endPt = toCurvePoint.point;
      endHandle = toCurvePoint.hasCurveTo ? toCurvePoint.curveTo : undefined;
    }

    // 根据有没有 handle 选择 cubic 或者 line 连接
    if (startHandle || endHandle) {
      path.cubicTo(
        startHandle?.x ?? startPt?.x,
        startHandle?.y ?? startPt.y,
        endHandle?.x ?? endPt.x,
        endHandle?.y ?? endPt.y,
        endPt.x,
        endPt.y
      );
    } else {
      path.lineTo(endPt.x, endPt.y);
    }

    // 如果 end 的时候是 corner，绘制圆角
    if (_isCornerRadius(toIdx)) {
      const { nextTangent, preHandle, nextHandle } = _getCornerInfo(toIdx);
      path.cubicTo(preHandle.x, preHandle.y, nextHandle.x, nextHandle.y, nextTangent.x, nextTangent.y);
    }
  }

  return path;
}
