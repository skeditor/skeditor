// @ts-nocheck
import { TileManager } from './tile-manager';
import { Rect } from '../base/rect';
import { CanvaskitPromised } from '../util/canvaskit';
import { Tile, Priority } from './tile';

// Todo 需要构造 page view 才能测试

let tileManager: TileManager;
let pageView: any;

function testGetScales() {
  const pyramid = tileManager.pyramid;
  const curScales = [] as number[];
  let cur = pyramid.lowest;
  while (cur) {
    curScales.push(cur.scale);
    cur = cur.high;
  }
  return curScales;
}

describe('TileManager', () => {
  beforeAll(() => CanvaskitPromised);
  beforeEach(() => {
    tileManager = new TileManager(pageView);
  });
  test('when call draw it establishes checkerboard pyramid', () => {
    tileManager.drawViewport(1, new Rect(0, 0, 256, 256));

    expect(tileManager.pyramid.idealCheckerboard?.scale).toBe(1);
    expect(tileManager.pyramid.lowest?.scale).toBe(1);

    // 绘制 0.8,
    tileManager.drawViewport(0.8, new Rect(0, 0, 256, 256));
    expect(tileManager.pyramid.lowest?.scale).toBe(0.5);
    expect(tileManager.pyramid.idealCheckerboard?.scale).toBe(0.8);

    // 绘制 3
    tileManager.drawViewport(3, new Rect(0, 0, 256, 256));
    expect(tileManager.pyramid.idealCheckerboard?.scale).toBe(3);

    // 检查下所有的 stair
    expect(testGetScales()).toEqual([1 / 2, 1, 2, 3]);

    tileManager.drawViewport(8, new Rect(0, 0, 256, 256));
    expect(testGetScales()).toEqual([1 / 2, 1, 2, 8]);

    tileManager.drawViewport(1 / 8, new Rect(0, 0, 256, 256));
    expect(testGetScales()).toEqual([1 / 8, 1 / 2, 1, 2, 8]);

    // 目前来看这个层级结构正常。
  });

  test('require fill tile', () => {
    const mockRequireFn = jest.fn(tileManager.requireTile);
    tileManager.requireTile = mockRequireFn;

    tileManager.drawViewport(1, Tile.getRect(0, 0));

    expect(mockRequireFn).toBeCalledTimes(1);
    expect(mockRequireFn).toBeCalledWith(1, 0, 0, Priority.Low);

    mockRequireFn.mockClear();
    tileManager.drawViewport(1.5, Tile.getRect(0, 0));
    expect(mockRequireFn).toBeCalledTimes(2);
    expect(mockRequireFn).nthCalledWith(1, 1.5, 0, 0, Priority.Low);
    expect(mockRequireFn).nthCalledWith(2, 1, 0, 0, Priority.High);

    // jest.fn(tileManager.requireTile)

    // large viewport
    mockRequireFn.mockClear();
    tileManager.drawViewport(1.5, new Rect(-1, -1, 256, 256));
    // scale 1 和 scale 1.5 都需要调用 4 次
    expect(mockRequireFn).toBeCalledTimes(8);
  });

  // test('require fill tile with low tile', () => {

  // })
});
