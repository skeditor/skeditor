import { Ref, onUnmounted, onMounted } from 'vue';
import PerfectScrollbar from 'perfect-scrollbar';

export function userPerfectScrollbar(elRef: Ref<HTMLElement | undefined>) {
  let ps: PerfectScrollbar | undefined;

  onMounted(() => {
    const el = elRef.value;
    if (el) {
      ps = new PerfectScrollbar(el);
    }
  });
  onUnmounted(() => {
    ps?.destroy();
  });
}
