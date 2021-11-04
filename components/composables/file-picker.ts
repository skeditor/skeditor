import { onUnmounted } from 'vue';

type FilePickCallback = (vale: File) => void;

let _el: HTMLInputElement;
let uid = 0;
let activeCompUid = 0;
const handlerMap = new Map<number, FilePickCallback>();

function onChange() {
  const files = _el?.files;
  if (files && files.length > 0) {
    handlerMap.get(activeCompUid)?.(files[0]);
  }
}

function getEl() {
  if (!_el) {
    _el = document.createElement('input');
    _el.style.display = 'none';
    _el.type = 'file';
    _el.accept = '.sketch';
    _el.addEventListener('change', onChange);
    document.body.appendChild(_el);
  }
  return _el;
}

export function useSketchFilePicker(onPickHandler: FilePickCallback) {
  const compUid = uid++;

  handlerMap.set(compUid, onPickHandler);

  onUnmounted(() => {
    handlerMap.delete(compUid);
  });

  return {
    pick() {
      activeCompUid = compUid;
      getEl().click();
    },
  };
}
