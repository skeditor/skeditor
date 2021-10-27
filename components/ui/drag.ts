import { ref, Ref, watchEffect, defineEmits, getCurrentInstance } from 'vue';

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

    const handler = (event: MouseEvent) => {
      startDraggable(event, emits, cursor);
    };

    el.addEventListener('mousedown', handler);

    dispose = () => {
      el.removeEventListener('mousedown', handler);
    };
  });

  return emits;
}

function startDraggable(event: MouseEvent, emits: ReturnType<typeof createEmits>, cursor?: string) {
  event.preventDefault();
  const downPt = { x: event.clientX, y: event.clientY };
  let isMove = false;
  let dragMaskEl: HTMLElement | undefined;

  document.addEventListener('mousemove', handelMoveEvent);
  document.addEventListener('mouseup', mouseup);

  function handelMoveEvent(e: MouseEvent) {
    const dx = e.clientX - downPt.x;
    const dy = e.clientY - downPt.y;
    // 拖动 3px 后开始触发移动
    if (!isMove) {
      const diff = Math.hypot(dx, dy);
      if (diff > 3) {
        isMove = true;
        dragMaskEl = document.createElement('div');
        dragMaskEl.className = 'global-drag-mask';
        if (cursor) {
          dragMaskEl.style.cursor = cursor;
        }
        document.body.appendChild(dragMaskEl);
        emits.dragStart.value++;
      } else {
        return;
      }
    }
    e.stopPropagation();

    emits.offset.value = { x: dx, y: dy };
  }

  function mouseup(event: MouseEvent) {
    isMove = false;
    event.stopPropagation();
    event.preventDefault();
    if (dragMaskEl && dragMaskEl.parentNode) {
      dragMaskEl.parentNode.removeChild(dragMaskEl);
    }
    document.removeEventListener('mousemove', handelMoveEvent);
    document.removeEventListener('mouseup', mouseup);
    emits.dragEnd.value++;
  }
}
