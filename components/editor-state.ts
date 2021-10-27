import JSZip from 'jszip';
import { SkyModel } from '~/lib/editor/model';
import { SkyView } from '~/lib/editor/view';
import { CanvaskitPromised } from '~/lib/editor/util/canvaskit';

export class EditorState {
  static shared = new EditorState();

  model?: SkyModel;
  view?: SkyView;

  async openSketchArrayBuffer(arrayBuffer: ArrayBuffer, el: HTMLElement) {
    this.disposePrevious();
    const zipFile = await JSZip.loadAsync(arrayBuffer);
    await CanvaskitPromised;
    const model = new SkyModel();
    await model.readZipFile(zipFile);
    const view = await SkyView.create(model, el);

    this.view = view;
    this.model = model;
  }

  private disposePrevious() {
    this.view?.dispose();
    this.view = undefined;
  }
}

if (process.env.NODE_ENV === 'development') {
  (window as any).currentEditor = EditorState.shared;
}
