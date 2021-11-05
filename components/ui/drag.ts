import { ref, Ref, watchEffect } from 'vue';
import { fromDragEvent } from '~/lib/editor/util/drag';

const createEmits = () => ({
  dragStart: ref(0),
  dragEnd: ref(0),
  offset: ref({ x: 0, y: 0 }),
});

export function useDrag(elRef: Ref<HTMLElement | undefined>, cursor?: string) {
  const emits = createEmits();

  let dispose: (() => void) | undefined;

  watchEffect(() => {
    const el = elRef.value;
    dispose?.();
    dispose = undefined;
    if (!el) return;

    const dragOb = fromDragEvent(el, cursor).subscribe((e) => {
      switch (e.type) {
        case 'dragStart':
          emits.dragStart.value++;
          return;
        case 'dragging':
          emits.offset.value = { x: e.dx, y: e.dy };
          return;
        case 'dragEnd':
          emits.dragEnd.value++;
          return;
      }
    });

    dispose = () => {
      dragOb.unsubscribe();
    };
  });

  return emits;
}
