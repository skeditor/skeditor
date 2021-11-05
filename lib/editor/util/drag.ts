import { fromEvent, Observable, Subscriber } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

type Events =
  | {
      type: 'dragStart';
    }
  | {
      type: 'dragging';
      dx: number; // 相对拖拽开始位置
      dy: number;
    }
  | {
      type: 'dragEnd';
    };

export function fromDragEvent(el: HTMLElement, cursor?: string) {
  return new Observable<Events>((subscriber) => {
    const mouseDown = fromEvent(el, 'mousedown').subscribe((e) => {
      startDraggable(e as MouseEvent, subscriber, cursor);
    });

    return () => {
      mouseDown.unsubscribe();
    };
  });
}

function startDraggable(event: MouseEvent, subscriber: Subscriber<Events>, cursor?: string) {
  event.preventDefault();
  const downPt = { x: event.clientX, y: event.clientY };
  let isMove = false;
  let dragMaskEl: HTMLElement | undefined;

  fromEvent(document, 'mousemove')
    .pipe(takeUntil(fromEvent(document, 'mouseup').pipe(take(1))))
    .subscribe({
      next(e) {
        handelMoveEvent(e as MouseEvent);
      },
      complete() {
        mouseup();
      },
    });

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
        subscriber.next({ type: 'dragStart' });
      } else {
        return;
      }
    }
    e.stopPropagation();
    subscriber.next({
      type: 'dragging',
      dx,
      dy,
    });
  }

  function mouseup() {
    if (!isMove) return;
    isMove = false;
    event.stopPropagation();
    event.preventDefault();
    if (dragMaskEl && dragMaskEl.parentNode) {
      dragMaskEl.parentNode.removeChild(dragMaskEl);
    }
    subscriber.next({ type: 'dragEnd' });
  }
}
