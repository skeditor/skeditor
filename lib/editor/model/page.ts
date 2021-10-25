import { SkyBaseGroup, SketchFormat, SkyModel, ClassValue } from '.';
// import { Point } from '../base/point';

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

  // axisOffset = new Point();

  _fromJson(data: SketchFormat.Page) {
    super._fromJson(data);

    // sketch 的标尺是可以拖拽移动的
    this.frame.x = -data.horizontalRulerData.base;
    this.frame.y = -data.verticalRulerData.base;

    // sketch page 上的 frame 宽高都是 300 * 300 没有什么用。
    this.frame.width = 0;
    this.frame.height = 0;
  }
}
