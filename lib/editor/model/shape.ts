import { ClassValue, SkyBaseLayer } from './base';
import { SkyModel } from './sky-model';
import { SketchFormat } from '.';

export class SkyShapeGroup {
  readonly _class = ClassValue.ShapeGroup;

  constructor(private ctx: SkyModel, private data: SketchFormat.ShapeGroup) {
    //
  }

  buildLayers() {
    this.data.layers.forEach((layer) => {});
  }

  toJson() {
    return this.data;
  }
}

// General Object
export class SkyGroup {
  readonly _class = ClassValue.ShapeGroup;

  constructor(private ctx: SkyModel, private data: SketchFormat.Group) {
    //
  }

  toJson() {
    return this.data;
  }
}

export class SkyRectangle {
  readonly _class = ClassValue.Rectangle;

  constructor(private ctx: SkyModel, private data: SketchFormat.Rectangle) {
    //
  }
  toJson() {
    return this.data;
  }
}
