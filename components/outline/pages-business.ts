import { useLocalStorage } from '../composables/localstorage';

const InitHeight = 150;
const MinHeight = 150;

export function setupPages() {
  const height = useLocalStorage('PagesScrollHeight', InitHeight);

  let _dragStartHeight = 0;

  function onDragStart() {
    _dragStartHeight = height.value;
  }

  function onOffset(offset: number) {
    height.value = Math.max(_dragStartHeight + offset, MinHeight);
  }

  return {
    height,
    onDragStart,
    onOffset,
  };
}
