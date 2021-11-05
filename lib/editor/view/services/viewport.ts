import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SkyBaseLayerView, SkyView } from '..';
import { Matrix } from '../../base';
import { BaseService } from './base';

export class ViewportService extends BaseService {
  viewportScale: Observable<number>;

  constructor(v: SkyView) {
    super(v);

    this.viewportScale = this.view.pageState.currentPage.pipe(
      switchMap(() => {
        return this.zoomState ? this.zoomState.scale$ : of(1);
      })
    );
  }

  scaleUp() {
    this.scaleDir(1);
  }

  scaleDown() {
    this.scaleDir(-1);
  }

  private scaleDir(dir: number) {
    if (!this.zoomState) return;
    const scaleMultiply = 1 + dir * 0.1;
    this.zoomState.onScale(scaleMultiply, this.view.pageFrame.center);
  }

  moveIntoView(layerView: SkyBaseLayerView) {
    if (!this.zoomState) return;

    const Padding = 30;

    const worldFrame = layerView.renderFrame.applyMatrix(layerView.transform.worldTransform);
    const pageFrame = this.view.pageFrame;

    // 不论是否在视口内都进行移动
    // const insideViewport = actualFrame.toPoints().every((pt) => pageFrame.containsPoint(pt));

    const { scale: relativeScale } = pageFrame.layoutRectInCenter(worldFrame, Padding);

    const prePt = this.zoomState.position;
    const preScale = this.zoomState.scale;
    const newScale = preScale * relativeScale;

    // 计算出在 page scale 改变后，当前 layer 新的 worldTransform
    const newMatrix = layerView.transform.worldTransform.clone();
    newMatrix.translate(-prePt.x, -prePt.y);
    newMatrix.prepend(new Matrix().scale(relativeScale, relativeScale));

    const newWorldFrame = layerView.renderFrame.applyMatrix(newMatrix);

    const { translate } = pageFrame.layoutRectInCenter(newWorldFrame, Padding);

    this.zoomState.setScale(newScale);
    this.zoomState.setPosition(translate);
  }
}
