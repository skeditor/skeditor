import { SkyBaseGroup, SketchFormat, SkyModel, ClassValue } from '.';
import { Point } from '../base/point';

export class SkyPage extends SkyBaseGroup<SketchFormat.Page> {
  _class = ClassValue.Page;

  // layers = [] as (SkyBaseObject | SkySymbolMaster | SkyGroup | SkyShapeGroup | SkyShapePath | SkyRectangle)[];

  // data!: SketchFormat.Page;
  // constructor(ctx: SkyModel, data: SketchFormat.Page) {
  //   super(ctx, data);
  // }

  // toJson(): SketchFormat.Page {
  //   return this.data;
  // }

  // sketch 的标尺是可以拖拽移动的
  // 而且初始化一个 page 的时候 base 也是个莫名其妙的值
  axisOffset = new Point();

  _fromJson(data: SketchFormat.Page) {
    super._fromJson(data);

    this.axisOffset.x = data.horizontalRulerData.base;
    this.axisOffset.y = data.verticalRulerData.base;

    // sketch page 上的 frame 宽高都是 300 * 300 没有什么用。
    // page 的 frame 没有任何作用
    this.frame.x = 0;
    this.frame.y = 0;
    this.frame.width = 0;
    this.frame.height = 0;
  }
}
