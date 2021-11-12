import JSZip from 'jszip';
import { SkyBaseGroup, SkyBaseLayer, SkyModel } from '~/lib/editor/model';
import { SkyBasePathView, SkyView } from '~/lib/editor/view';
import { CanvaskitPromised } from '~/lib/editor/util/canvaskit';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { Ref, onUnmounted, watchEffect, ref, shallowRef, computed } from 'vue';
import { switchMap } from 'rxjs/operators';
import { localStorageRef } from './composables/localstorage';
export class EditorState {
  static shared = new EditorState();

  showSidebar = localStorageRef('WorkbenchShowSidebar', true);

  bindings = [] as Subscription[];

  modelRef = shallowRef<SkyModel>();
  viewRef = shallowRef<SkyView>();

  selectedPageIndex = ref(-1);

  filename = '';

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

  pageScale$ = refToRx(this.viewRef).pipe(
    switchMap((view) => {
      if (view) {
        return view.services.viewport.viewportScale;
      } else {
        return of(1);
      }
    })
  );

  constructor() {}

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

  get currentPageView() {
    return this.view?.pageView;
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

  focusLayer = (layer: SkyBaseLayer) => {
    const layerView = this.view?.getViewByModelId(layer.objectId);
    if (layerView) {
      this.view?.services.viewport.moveIntoView(layerView);
    }
  };

  unselectLayer = () => {
    this.view?.selectLayer(undefined);
  };

  private reset() {
    this.selectedPageIndex.value = -1;
  }

  async openSketchArrayBuffer(filename: string, arrayBuffer: ArrayBuffer, el: HTMLElement) {
    let zipFile: JSZip;

    try {
      zipFile = await JSZip.loadAsync(arrayBuffer);
    } catch (err) {
      alert('Sorry!\nThis is not a zip file. It may be created by an old version sketch app.');
      throw err;
    }
    await CanvaskitPromised;

    // dispose previous view
    // but not set to undefined now

    const model = new SkyModel();
    await model.readZipFile(zipFile);
    if (!model.isSupportedVersion) {
      alert(
        `Sorry!\nThis file version is too old, it is created by ${model.appInfo}.\nThis application cant handle it right now.`
      );
      return;
    }

    this.view?.dispose();
    this.model?.dispose();
    this.reset();

    const view = await SkyView.create(model, el);

    this.viewRef.value = view;
    this.modelRef.value = model;
    this.filename = filename;
    this.initBinding(view);
  }

  dispose() {
    this.view?.dispose();
    this.model?.dispose();
    this.viewRef.value = undefined;
    this.modelRef.value = undefined;
    this.reset();
  }

  initBinding(view: SkyView) {
    this.bindings.forEach((sub) => sub.unsubscribe());
    this.bindings.length = 0;

    this.bindings.push(
      view.pageState.selectionChange.subscribe(() => {
        this.selectedLayerIdRef.value = view.pageState.selectedLayerView?.model.objectId ?? '';
        if (this.selectedLayerModel) {
          this.selectedPageModel?.expandLayers(this.selectedLayerModel);
        }
        this.outlineChangeEvent.value++;
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

  usePageScale() {
    return rxToRef(this.pageScale$);
  }

  get editorTitle() {
    if (!this.view) return '';
    return `${this.filename} / ${this.selectedPageModel?.name || 'No Page Name'}`;
  }
}

function rxToRef<T>(ob: Observable<T>): Ref<T | undefined> {
  const ret: Ref<T | undefined> = ref();
  const sub = ob.subscribe((val) => {
    ret.value = val;
  });
  onUnmounted(() => {
    sub.unsubscribe();
  });
  return ret;
}

function refToRx<T>(ref: Ref<T>) {
  const sb = new BehaviorSubject<T>(ref.value);
  watchEffect(() => {
    sb.next(ref.value);
  });
  return sb;
}

export function useEditor() {
  return EditorState.shared;
}

if (process.env.NODE_ENV === 'development') {
  (window as any).currentEditor = EditorState.shared;
}
