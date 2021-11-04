import { SkyView } from '..';
import { Disposable } from '../../base';

export class BaseService extends Disposable {
  constructor(protected view: SkyView) {
    super();
  }

  get zoomState() {
    return this.view.pageView?.zoomState;
  }
}
