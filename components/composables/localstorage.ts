import { Ref, watchEffect, ref } from 'vue';

export function localStorageRef<T>(key: string, initValue: T): Ref<T> {
  const pre = localStorage.getItem(key);
  const ret = ref(initValue);
  if (pre) {
    ret.value = JSON.parse(pre);
  }
  watchEffect(() => {
    localStorage.setItem(key, JSON.stringify(ret.value));
  });
  return ret as Ref<T>;
}
