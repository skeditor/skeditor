import { Rect } from '../base/rect';
import sk, { CanvaskitPromised } from './canvaskit';

describe('canvaskit', () => {
  beforeAll(() => {
    return CanvaskitPromised;
  });

  test('Rect return SkRect', () => {
    const rect = new Rect(1, 1, 100, 100);
    const skRect = sk.CanvasKit.XYWHRect(1, 1, 100, 100);
    expect(rect.toSk()).toEqual(skRect);

    expect(skRect).toEqual(new Float32Array([1, 1, 101, 101]));
  });

  test('env', () => {
    expect(process.env.SKETCH_DIRS).toEqual('~/design/design');
  });
});
