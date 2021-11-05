import { ref } from 'vue';
import { useLocalStorage } from '../composables/localstorage';

const InitWidth = 300;
const MinWidth = 250;
const MaxWidth = 500;

export const outlineWidth = useLocalStorage('OutlineWidth', InitWidth);

export function setupOutline() {
  const width = outlineWidth;
  let _dragStartWidth = 0;

  function onDragStart() {
    _dragStartWidth = width.value;
  }

  function onOffset(offset: number) {
    width.value = Math.min(Math.max(_dragStartWidth + offset, MinWidth), MaxWidth);
  }

  return {
    width,
    onDragStart,
    onOffset,
  };
}
