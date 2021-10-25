import { floorBinaryScale } from '~/lib/sky-editor/tile/tile';
import { CacheGetter } from './misc';

describe('util', () => {
  test('floorBinaryScale', () => {
    expect(() => floorBinaryScale(0)).toThrowError();
    expect(() => floorBinaryScale(-0.1)).toThrowError();

    [
      [1.2, 1],
      [2, 2],
      [100, 64],
      [150, 128],
      [0.9, 0.5],
      [0.4, 0.25],
      [0.15, 0.125],
      [0.10797034291010195, 1 / 16],
      [0.5, 0.5],
    ].forEach((t) => {
      expect(floorBinaryScale(t[0])).toBe(t[1]);
    });
  });

  test('CacheGetter', () => {
    class T1 {
      cacheId = 0;

      _count = 0;

      realCalc() {
        this._count++;
      }

      @CacheGetter<T1>((t1) => t1.cacheId)
      get count() {
        this.realCalc();
        return this._count;
      }
    }

    const t1 = new T1();
    const fn = jest.fn(t1.realCalc);
    t1.realCalc = fn;

    expect(t1.count).toBe(1);
    expect(fn).toBeCalledTimes(1);
    expect(t1.count).toBe(1);
    expect(t1.count).toBe(1);
    expect(fn).toBeCalledTimes(1);

    t1.cacheId = 1;
    expect(t1.count).toBe(2);
    expect(fn).toBeCalledTimes(2);
  });
});
