import sk from './canvaskit';
import invariant from 'ts-invariant';

export const randomColor = (idx: number) => {
  const _ = [sk.CanvasKit.BLACK, sk.CanvasKit.BLUE, sk.CanvasKit.CYAN, sk.CanvasKit.GREEN, sk.CanvasKit.YELLOW];
  return _[idx % _.length];
};

export function CacheGetter<T>(getKeyFn: (instance: T) => number) {
  return function cacheGetterDecorator(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const getter = descriptor.get;

    invariant(getter, 'Must apply to a getter');

    const keyKey = '_cache_key_' + propertyName;
    const valKey = '_cache_val_' + propertyName;

    descriptor.get = function (this: T) {
      const curKey = getKeyFn(this);
      if (this[keyKey] !== curKey) {
        const curVal = getter.call(this);
        this[keyKey] = curKey;
        this[valKey] = curVal;
      }
      return this[valKey];
    };
  };
}

export class Raf {
  private rafId = 0;

  execute(fn: Parameters<typeof requestAnimationFrame>[0]) {
    this.rafId = requestAnimationFrame((val) => {
      this.rafId = 0;
      fn(val);
    });
  }

  cancel() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  nextFrame() {
    return new Promise((resolve) => {
      this.execute(resolve);
    });
  }
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
