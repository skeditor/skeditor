import JSZip from 'jszip';
import { SkyModel } from '~/lib/editor/model';
import { SkyView } from '~/lib/editor/view';
import { CanvaskitPromised } from '~/lib/editor/util/canvaskit';
import { computed, shallowRef, ref } from 'vue';
export class EditorState {
  static shared = new EditorState();

  modelRef = shallowRef<SkyModel>();
  viewRef = shallowRef<SkyView>();

  selectedPageIndex = ref(0);

  pagesRef = computed(() => {
    const model = this.modelRef.value;
    return model?.pages.map((page) => page.name) || [];
  });

  get pages() {
    return this.pagesRef.value;
  }

  get model() {
    return this.modelRef.value;
  }

  get view() {
    return this.viewRef.value;
  }

  get selectedPageModel() {
    return this.model?.pages[this.selectedPageIndex.value];
  }

  selectPage = (idx: number) => {
    this.selectedPageIndex.value = idx;
    this.view?.renderPage(idx);
  };

  async openSketchArrayBuffer(arrayBuffer: ArrayBuffer, el: HTMLElement) {
    // dispose previous view
    // but not set to undefined now
    this.viewRef.value?.dispose();

    const zipFile = await JSZip.loadAsync(arrayBuffer);
    await CanvaskitPromised;
    const model = new SkyModel();
    await model.readZipFile(zipFile);
    const view = await SkyView.create(model, el);

    this.viewRef.value = view;
    this.modelRef.value = model;
  }
}

export function useEditor() {
  return EditorState.shared;
}

if (process.env.NODE_ENV === 'development') {
  (window as any).currentEditor = EditorState.shared;
}
