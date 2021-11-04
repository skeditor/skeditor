import JSZip from 'jszip';
import { SkyBaseGroup, SkyBaseLayer, SkyModel } from '~/lib/editor/model';
import { SkyBasePathView, SkyView } from '~/lib/editor/view';
import { CanvaskitPromised } from '~/lib/editor/util/canvaskit';
import { computed, shallowRef, ref } from 'vue';
import { Subscription } from 'rxjs';
export class EditorState {
  static shared = new EditorState();

  bindings = [] as Subscription[];

  modelRef = shallowRef<SkyModel>();
  viewRef = shallowRef<SkyView>();

  selectedPageIndex = ref(-1);

  pagesRef = computed(() => {
    const model = this.modelRef.value;
    return model?.pages.map((page) => page.name) || [];
  });

  private outlineChangeEvent = ref(0);

  outlineListRef = computed(() => {
    if (this.outlineChangeEvent.value < 0) return [];
    const model = this.modelRef.value;
    const page = model?.pages[this.selectedPageIndex.value];
    if (page) {
      return page.getLayerList();
    }
    return [];
  });

  selectedLayerIdRef = ref('');
  hoveredLayerIdRef = ref('');

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

  get selectedLayerView() {
    return this.view?.getViewByModelId(this.selectedLayerIdRef.value);
  }

  get selectedLayerModel() {
    return this.selectedLayerView?.model;
  }

  selectPage = (idx: number) => {
    if (idx === this.selectedPageIndex.value) {
      return;
    }
    this.selectedPageIndex.value = idx;
    this.view?.renderPage(idx);
  };

  selectLayer = (layer: SkyBaseLayer) => {
    this.view?.selectLayer(layer);
  };

  unselectLayer = () => {
    this.view?.selectLayer(undefined);
  };

  private reset() {
    this.selectedPageIndex.value = -1;
  }

  async openSketchArrayBuffer(arrayBuffer: ArrayBuffer, el: HTMLElement) {
    let zipFile: JSZip;

    try {
      zipFile = await JSZip.loadAsync(arrayBuffer);
    } catch (err) {
      alert('Sorry!\nThis is not a zip file. It may be created by an old version sketch app.');
      throw err;
    }
    await CanvaskitPromised;

    this.reset();
    // dispose previous view
    // but not set to undefined now
    this.viewRef.value?.dispose();

    const model = new SkyModel();
    await model.readZipFile(zipFile);
    const view = await SkyView.create(model, el);

    this.viewRef.value = view;
    this.modelRef.value = model;

    this.initBinding(view);
  }

  initBinding(view: SkyView) {
    this.bindings.forEach((sub) => sub.unsubscribe());
    this.bindings.length = 0;

    this.bindings.push(
      view.pageState.selectionChange.subscribe(() => {
        this.selectedLayerIdRef.value = view.pageState.selectedLayerView?.model.objectId ?? '';
        if (this.selectedLayerModel) {
          this.selectedPageModel?.expandLayers(this.selectedLayerModel);
          this.outlineChangeEvent.value++;
        }
      }),
      view.pageState.hoverChange.subscribe(() => {
        this.hoveredLayerIdRef.value = view.pageState.hoverLayerView?.model.objectId ?? '';
      })
    );
  }

  onToggleOutlineGroup = (layer: SkyBaseGroup) => {
    layer.isOutlineExpanded = !layer.isOutlineExpanded;
    this.outlineChangeEvent.value++;
  };

  onToggleLayerVisible = (layer: SkyBaseLayer) => {
    layer.isVisible = !layer.isVisible;
    this.outlineChangeEvent.value++;
  };

  onToggleLayerLock = (layer: SkyBaseLayer) => {
    layer.isLocked = !layer.isLocked;
    this.outlineChangeEvent.value++;
  };

  onPointerEnterLayer = (layer: SkyBaseLayer) => {
    this.view?.hoverLayer(layer);
  };

  onPointerLeaveLayer = () => {
    this.view?.hoverLayer(undefined);
  };

  getPathIcon(layer: SkyBaseLayer) {
    const id = layer.objectId;
    const layerView = this.view?.getViewByModelId(id);
    if (layerView instanceof SkyBasePathView && layerView.path) {
      return layerView.svgBuildInfo;
    }
  }
}

export function useEditor() {
  return EditorState.shared;
}

if (process.env.NODE_ENV === 'development') {
  (window as any).currentEditor = EditorState.shared;
}
