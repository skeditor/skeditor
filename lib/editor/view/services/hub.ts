import { SkyView } from '..';
import { FontService } from './font';
import { ViewportService } from './viewport';

export class Services {
  viewport: ViewportService;
  font: FontService;
  constructor(private view: SkyView) {
    this.viewport = new ViewportService(this.view);
    this.font = new FontService(this.view);
  }

  dispose() {
    [this.font, this.viewport].forEach((s) => s.dispose());
  }
}
