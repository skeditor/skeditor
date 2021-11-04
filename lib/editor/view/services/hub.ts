import { SkyView } from '..';
import { ViewportService } from './viewport';

export class Services {
  viewport: ViewportService;
  constructor(private view: SkyView) {
    this.viewport = new ViewportService(this.view);
  }
}
