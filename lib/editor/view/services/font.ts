import { debounceTime } from 'rxjs/operators';
import { SkyTextView, SkyView } from '..';

import { fontLoaded } from '../../util/canvaskit';
import { BaseService } from './base';

export class FontService extends BaseService {
  constructor(v: SkyView) {
    super(v);

    this._disposables.push(
      fontLoaded.pipe(debounceTime(100)).subscribe((fontname) => {
        const pageView = this.view.pageView;
        if (!pageView) return;
        pageView.traverse((view) => {
          if (view instanceof SkyTextView) {
            view.invalidatePainter();
          }
        });
        pageView.invalidateTiles(true);
        this.view.markDirty();
      })
    );
  }
}
