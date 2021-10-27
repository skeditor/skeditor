import { Ref, watchEffect } from 'vue';
import PerfectScrollbar from 'perfect-scrollbar';

export function userPerfectScrollbar(elRef: Ref<HTMLElement | undefined>) {
  let ps: PerfectScrollbar | undefined;
  watchEffect(() => {
    const el = elRef.value;
    ps?.destroy();
    ps = undefined;
    if (el) {
      ps = new PerfectScrollbar(el);
    }
  });
}
