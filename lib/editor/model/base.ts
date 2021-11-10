import { SkyModel, SkySymbolMaster, SkySymbolInstance, SketchFormat } from '.';
import { Rect } from '../base/rect';
import { Point } from '../base/point';
import sk from '../util/canvaskit';
import { sketchBlendToSk, sketchJoinStyleToSk, sketchStrokeCapToSk } from '../util/sketch-to-skia';
import type {
  Canvas as SkCanvas,
  Path as SkPath,
  Color as SkColor,
  Image as SkImage,
  Matrix3x3 as SkMatrix3x3,
  Paint as SkPaint,
  Paragraph as SkParagraph,
  ParagraphStyle as SkParagraphStyle,
} from 'canvaskit-wasm';
import invariant from 'ts-invariant';

export const enum ClassValue {
  // GeneralObject = 'GeneralObject',
  SymbolMaster = 'SymbolMaster',
  SymbolInstance = 'SymbolInstance',

  ShapeGroup = 'ShapeGroup',
  ShapeLike = 'ShapeLike',
  ShapePath = 'ShapePath',
  Rectangle = 'Rectangle',
  Triangle = 'Triangle',
  Star = 'Star',
  Group = 'Group',
  Artboard = 'Artboard',
  Page = 'Page',
  Oval = 'Oval',
  Bitmap = 'Bitmap',
  Text = 'Text',

  CurvePoint = 'CurvePoint',
  Style = 'Style',

  // 先不要整太多类型，否则后面重构改不动
  BaseObject = 'BaseObject',
  BaseLayer = 'BaseLayer',
  BaseGroup = 'BaseGroup',
}

export { SkColor, SkCanvas, SkPath, SkImage, SkMatrix3x3, SkPaint, SkParagraph, SkParagraphStyle };

// 通用对象
// 对象应该能够不传递任何参数即可构造，并带有默认的信息，方便进行新建。
// 构造函数上，还可以带有一个 options 参数，指导构造函数初始化，这个由子类决定。
// 另外，还应该又一个 fromJson 方法，从 原始数据开始构造 model，方面读取文件。

export type StringAttributeAttributes = SkyStringAttribute['attributes'] & {
  strikethroughStyle?: number;
  underlineStyle?: number;
  MSAttributedStringTextTransformAttribute?: SketchFormat.TextTransform;
};

/**
 * use ^ to apply a mask to Unset
 *
 * 未设置的时候默认值是 Unset
 * 如果设置了 right，那么值为 Unset ^ Right，抹掉最低位。
 */
// prettier-ignore
export const ResizingConstraints = {
  Unset:  0b111111,
  Right:  0b000001,
  Width:  0b000010,
  Left:   0b000100,
  Bottom: 0b001000,
  Height: 0b010000,
  Top:    0b100000,
}

let uid = 1000;

export abstract class SkyBaseObject<T extends SketchFormat.AnyObject> {
  abstract _class;
  protected ctx!: SkyModel;

  objectId = '' + uid++;

  constructor() {
    this.ctx = SkyModel.currentContext;

    if (process.env.NODE_ENV === 'development') {
      const fn = this.fromJson;
      this.fromJson = function (data: any) {
        (this as any).__data = data;
        return fn.call(this, data);
      };
    }
  }
  // 不要再用 init

  abstract fromJson(data: T): ThisType<this>;

  // 暂且不要求实现，在做存储的时候再来实现
  // abstract toJson(): T;
}

/**
 * Layer 基类，拥有 frame、scale、rotation 等等
 */
export abstract class SkyBaseLayer<T extends SketchFormat.AnyLayer = SketchFormat.AnyLayer> extends SkyBaseObject<T> {
  parent?: SkyBaseLayer;

  frame = new Rect();
  isFlippedHorizontal = false;
  isFlippedVertical = false;
  rotation = 0;

  style?: SkyStyle;

  private _sharedStyleID?: string;

  hasClippingMask = false;
  shouldBreakMaskChain = false;

  isVisible = true;

  resizingConstraint = ResizingConstraints.Unset;

  booleanOperation = sk.CanvasKit.PathOp.XOR;

  isLocked = false;

  /* begin outline 相关状态 */

  // 是否在 layers 列表中展开
  isSelected = false;
  isOutlineExpanded = false;

  // 两个由 parents 决定的临时状态
  subSelected = false;
  subInVisible = false;
  depth = 0;
  /* end outline 相关状态 */

  private _name = '';

  // 可以设置值，也可以仅仅给 proxy 拦截提供类型定义。
  tintColor?: SkyColor;

  constructor() {
    super();
  }

  fromJson(data: T) {
    const { frame, isFlippedHorizontal, isFlippedVertical, rotation, sharedStyleID } = data;
    this.booleanOperation = mapBooleanOp(data.booleanOperation);

    this.frame = new Rect(frame.x, frame.y, frame.width, frame.height);
    this.isFlippedHorizontal = isFlippedHorizontal;
    this.isFlippedVertical = isFlippedVertical;
    this.rotation = rotation;

    this._sharedStyleID = sharedStyleID;

    this.objectId = data.do_objectID;

    if (data.style) {
      this.style = new SkyStyle().fromJson(data.style);
    }

    this.isVisible = data.isVisible;

    this.hasClippingMask = data.hasClippingMask ?? this.hasClippingMask;

    this.shouldBreakMaskChain = data.shouldBreakMaskChain ?? this.shouldBreakMaskChain;

    this.resizingConstraint = data.resizingConstraint ?? this.resizingConstraint;
    this.isLocked = data.isLocked ?? this.isLocked;

    this._name = data.name;
    this._fromJson(data);
    return this;
  }

  get sharedStyle(): SkyStyle | undefined {
    if (this._sharedStyleID) {
      return this.ctx.getStyle(this._sharedStyleID);
    }
    return undefined;
  }

  get snapLeft() {
    return ~this.resizingConstraint & ResizingConstraints.Left;
  }

  get snapRight() {
    return ~this.resizingConstraint & ResizingConstraints.Right;
  }

  get snapBottom() {
    return ~this.resizingConstraint & ResizingConstraints.Bottom;
  }

  get snapTop() {
    return ~this.resizingConstraint & ResizingConstraints.Top;
  }

  get fixedWidth() {
    return ~this.resizingConstraint & ResizingConstraints.Width;
  }

  get fixedHeight() {
    return ~this.resizingConstraint & ResizingConstraints.Height;
  }

  abstract _fromJson(data: T);

  // toJson(): T {
  //   return {
  //   } as any;
  // }

  get name() {
    return this._name;
  }

  /**
   * 在 parent 以及 parent's parent 身上调用
   * 不在当前 layer 上调用
   */
  recUp(fn: (layer: SkyBaseLayer) => void) {
    if (this.parent) {
      fn(this.parent);
      this.parent.recUp(fn);
    }
  }

  inflateFrame(rawFrame: Rect) {
    const style = this.style;
    if (!style) return rawFrame;
    let buffer = 0;
    const renderRects = [] as Rect[];

    style.borders.forEach((border) => {
      const { isEnabled, thickness, position } = border;
      if (isEnabled) {
        const borderBuffer =
          position === SkyBorderPosition.Outside
            ? thickness
            : position === SkyBorderPosition.Center
            ? thickness / 2
            : 0;
        buffer = borderBuffer > buffer ? borderBuffer : buffer;
      }
    });

    if (style.blur) {
      const { isEnabled, type, radius } = style.blur;
      if (isEnabled && type === SkyBlurType.Gaussian && radius > buffer) {
        buffer = radius;
      }
    }

    renderRects.push(buffer ? rawFrame.inflate(buffer) : rawFrame);

    style.shadows.forEach((shadow) => {
      const { offsetX, offsetY, spread, blurRadius, isEnabled } = shadow;
      if (isEnabled) {
        renderRects.push(rawFrame.offset(offsetX, offsetY).inflate(spread + blurRadius));
      }
    });

    return renderRects.length === 1 ? renderRects[0] : Rect.mergeRects(renderRects);
  }
}

/**
 * group 基类，带有 children/layers
 */
export abstract class SkyBaseGroup<T extends SketchFormat.AnyGroup = SketchFormat.AnyGroup> extends SkyBaseLayer<T> {
  layers: (
    | SkyGroup
    | SkyShapeGroup
    // | SkyShapePath
    // | SkyRectangle
    // | SkyOval
    | SkyBaseShapeLike
    | SkyBitmap
    | SkyText
    | SkySymbolMaster
    | SkySymbolInstance
    | SkyArtboard
  )[] = [];

  constructor() {
    super();
  }

  _fromJson(data: T) {
    this.buildLayers(data.layers as SketchFormat.AnyLayer[]);
    this.isOutlineExpanded = data.layerListExpandedType === SketchFormat.LayerListExpanded.Expanded;
  }

  private buildLayers(layers: SketchFormat.AnyLayer[]) {
    layers.forEach((layer) => {
      switch (layer._class) {
        case SketchFormat.ClassValue.Group:
          return this.layers.push(new SkyGroup().fromJson(layer));
        case SketchFormat.ClassValue.ShapeGroup:
          return this.layers.push(new SkyShapeGroup().fromJson(layer));
        case SketchFormat.ClassValue.ShapePath:
        case SketchFormat.ClassValue.Rectangle:
        case SketchFormat.ClassValue.Oval:
        case SketchFormat.ClassValue.Star:
        case SketchFormat.ClassValue.Triangle:
        case SketchFormat.ClassValue.Polygon:
          return this.layers.push(new SkyBaseShapeLike().fromJson(layer));
        // case SketchFormat.ClassValue.Rectangle:
        //   return this.layers.push(new SkyRectangle().fromJson(layer));
        // case SketchFormat.ClassValue.Oval:
        //   return this.layers.push(new SkyOval().fromJson(layer));
        case SketchFormat.ClassValue.Bitmap:
          return this.layers.push(new SkyBitmap().fromJson(layer));
        case SketchFormat.ClassValue.Text:
          return this.layers.push(new SkyText().fromJson(layer));
        case SketchFormat.ClassValue.SymbolMaster:
          return this.layers.push(new SkySymbolMaster().fromJson(layer));
        case SketchFormat.ClassValue.SymbolInstance:
          return this.layers.push(new SkySymbolInstance().fromJson(layer));
        case SketchFormat.ClassValue.Artboard:
          return this.layers.push(new SkyArtboard().fromJson(layer));

        case 'shapePath':
        case 'polygon':
        case 'oval':
        case 'star':
        case 'triangle':
        case 'slice':
        case 'MSImmutableHotspotLayer':
          return;
        default:
          return;
      }
    });

    // Todo, use addChild
    this.layers.forEach((layer) => (layer.parent = this));
  }

  getOutlineList(ret: SkyBaseLayer[], depth = 0, subInVisible = false, subSelected = false) {
    const _subInVisible = subInVisible || !this.isVisible;
    const _subSelected = subSelected || this.isSelected;
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      layer.depth = depth;
      layer.subInVisible = _subInVisible;
      layer.subSelected = _subSelected;
      ret.push(layer);
      if (layer instanceof SkyBaseGroup && layer.isOutlineExpanded) {
        layer.getOutlineList(ret, depth + 1, _subInVisible, _subSelected);
      }
    }
  }
}

export class SkyGroup extends SkyBaseGroup<SketchFormat.Group> {
  readonly _class = ClassValue.Group;
}

export class SkyArtboard extends SkyBaseGroup<SketchFormat.Artboard> {
  readonly _class = ClassValue.Artboard;
  backgroundColor = new SkyColor();
  hasBackgroundColor = false;

  _fromJson(data: SketchFormat.Artboard) {
    super._fromJson(data);
    this.backgroundColor.fromJson(data.backgroundColor);
    this.hasBackgroundColor = data.hasBackgroundColor;
  }
}

export class SkyShapeGroup extends SkyBaseGroup<SketchFormat.ShapeGroup> {
  readonly _class = ClassValue.ShapeGroup;
  booleanOperation = sk.CanvasKit.PathOp.XOR;
  _fromJson(data: SketchFormat.ShapeGroup) {
    super._fromJson(data);
    this.booleanOperation = mapBooleanOp(data.booleanOperation);
  }
}

// export const SkyBooleanOperation = SketchFormat.BooleanOperation;

export function mapBooleanOp(op: SketchFormat.BooleanOperation) {
  const PathOp = sk.CanvasKit.PathOp;
  return (
    {
      [SketchFormat.BooleanOperation.Union]: PathOp.Union,
      [SketchFormat.BooleanOperation.Intersection]: PathOp.Intersect,
      [SketchFormat.BooleanOperation.Difference]: PathOp.XOR,
      [SketchFormat.BooleanOperation.Subtract]: PathOp.Difference,
      [SketchFormat.BooleanOperation.None]: PathOp.XOR,
    }[op] ?? PathOp.XOR
  );
}

type SketchShapeLikes =
  | SketchFormat.ShapePath
  | SketchFormat.Rectangle
  | SketchFormat.Oval
  | SketchFormat.Triangle
  | SketchFormat.Polygon
  | SketchFormat.Star;

/**
 * 和 shape path 有相似性的类型，都将使用 bezier path 绘制
 * 比如都有 points、isClosed 这样的惨谁，
 *
 *
 * 之前是 abstract，但是太反锁了，要实现很多子类，又没有太多价值
 */
export class SkyBaseShapeLike<T extends SketchShapeLikes = SketchShapeLikes> extends SkyBaseLayer<T> {
  readonly _class = ClassValue.ShapeLike;

  isClosed = false;
  points: SkyCurvePoint[] = [];

  _fromJson(data: T) {
    this.isClosed = data.isClosed ?? this.isClosed;
    this.points = data.points?.map((point) => new SkyCurvePoint(this.frame).fromJson(point)) || [];
  }
}

// export class SkyShapePath extends SkyBaseShapeLike<SketchFormat.ShapePath> {
//   readonly _class = ClassValue.ShapePath;
// }

// export class SkyRectangle extends SkyBaseShapeLike<SketchFormat.Rectangle> {
//   readonly _class = ClassValue.Rectangle;
// }

// export class SkyTriangle extends SkyBaseShapeLike<SketchFormat.Triangle> {
//   readonly _class = ClassValue.Triangle;
// }

// export class SkyStar extends SkyBaseShapeLike<SketchFormat.Star> {
//   readonly _class = ClassValue.Star;
// }

// export class SkyOval extends SkyBaseShapeLike<SketchFormat.Oval> {
//   readonly _class = ClassValue.Oval;
// }

export class SkyBitmap extends SkyBaseLayer<SketchFormat.Bitmap> {
  readonly _class = ClassValue.Bitmap;
  file?: SkyFile;

  async _fromJson(data: SketchFormat.Bitmap) {
    if (data.image) {
      this.file = new SkyFile().fromJson(data.image);
    }
  }
}

export class SkyFile extends SkyBaseObject<SketchFormat.FileRef | SketchFormat.DataRef> {
  readonly _class = 'file';
  // buffer?: ArrayBuffer;

  skImage?: SkImage;

  fromJson(data: SketchFormat.FileRef | SketchFormat.DataRef) {
    if (data._class === SketchFormat.ClassValue.MSJSONFileReference) {
      this.ctx.readImgFile(data._ref).then((skImage) => {
        if (this.skImage !== skImage) {
          this.skImage = skImage;
          this.ctx.imageLoaded$.next();
        }
      });
    } else if (data._class === SketchFormat.ClassValue.MSJSONOriginalDataReference) {
      console.log('!!!!!! Todo');
    } else {
      invariant(false, 'never');
    }

    return this;
  }
}

export declare type SkyStringAttribute = {
  location: number;
  length: number;
  attributes: {
    kerning?: number;
    textStyleVerticalAlignmentKey?: SketchFormat.TextVerticalAlignment;
    MSAttributedStringFontAttribute: SketchFormat.FontDescriptor;
    MSAttributedStringColorAttribute?: SkyColor;
    paragraphStyle?: SketchFormat.ParagraphStyle;
  };
};

export type SkyAttributeString = {
  string: string;
  attributes: SkyStringAttribute[];
};

export class SkyText extends SkyBaseLayer<SketchFormat.Text> {
  readonly _class = ClassValue.Text;

  private _attributedString!: SkyAttributeString;

  _fromJson(data: SketchFormat.Text) {
    this._attributedString = {
      // string 在老版本可能为空, 在 model 中应该保证数据类型准确。
      string: data.attributedString.string || '',
      attributes:
        data.attributedString.attributes?.map((attr) => {
          const color = new SkyColor();
          if (attr.attributes.MSAttributedStringColorAttribute) {
            color.fromJson(attr.attributes.MSAttributedStringColorAttribute);
          }
          return {
            ...attr,
            attributes: {
              ...attr.attributes,
              MSAttributedStringColorAttribute: color,
            },
          };
        }) || [],
    };
  }

  get attributedString() {
    this._attributedString.attributes.forEach((attr) => {
      if (attr.attributes.MSAttributedStringColorAttribute) {
        attr.attributes.MSAttributedStringColorAttribute.tintColor = this.tintColor;
      }
    });
    return this._attributedString;
  }

  get validBorderCount() {
    return this.style?.borders?.reduce((a, b) => (a += b.isEnabled ? 1 : 0), 0) || 0;
  }

  get validFillCount() {
    return this.style?.fills?.reduce((a, b) => (a += b.isEnabled ? 1 : 0), 0) || 0;
  }

  /**
   * Not plain color
   * gradient pattern etc.
   * need set shader in paint.
   */
  get hasComplicatedPaint() {
    return (
      this.style?.fills?.some((fill) => fill.isEnabled && fill.fillType !== SkyFillType.Color) ||
      this.style?.borders?.some((border) => border.isEnabled && border.fillType !== SkyFillType.Color)
    );
  }

  get hasInnerShadow() {
    return this.style?.innerShadows.some((shadow) => shadow.isEnabled);
  }
}

export const SkyCurveMode = SketchFormat.CurveMode;

const SkyMarkerType = SketchFormat.MarkerType;
type SkyMarkerType = SketchFormat.MarkerType;

const SkyWindingRule = SketchFormat.WindingRule;
type SkyWindingRule = SketchFormat.WindingRule;

export class SkyStyle extends SkyBaseObject<SketchFormat.Style> {
  readonly _class = ClassValue.CurvePoint;
  // tintInstance?: SkySymbolInstance;
  private _borders: SkyBorder[] = [];
  borderOptions: SkyBorderOptions = new SkyBorderOptions();
  blur?: SkyBlur;
  private _fills: SkyFill[] = [];

  startMarkerType = SkyMarkerType.OpenArrow;
  endMarkerType = SkyMarkerType.OpenArrow;
  miterLimit = 0;
  windingRule = SkyWindingRule.NonZero;

  textStyle?: SkyTextStyle;
  private _shadows: SkyShadow[] = [];
  private _innerShadows: SkyShadow[] = [];
  contextSettings?: SkyGraphicsContextSettings;
  colorControls = new SkyColorControls();

  tintColor?: SkyColor;

  fromJson(data: SketchFormat.Style) {
    data.borders?.map((border) => {
      this._borders.push(new SkyBorder().fromJson(border));
    });

    if (data.borderOptions) {
      this.borderOptions.fromJson(data.borderOptions);
    }

    data.fills?.map((fill) => {
      this._fills.push(new SkyFill().fromJson(fill));
    });

    this.startMarkerType = data.startMarkerType;
    this.endMarkerType = data.endMarkerType;
    this.miterLimit = data.miterLimit;
    this.windingRule = data.windingRule;

    if (data.textStyle) {
      this.textStyle = new SkyTextStyle().fromJson(data.textStyle);
    }

    data.shadows?.forEach((shadow) => {
      this._shadows.push(new SkyShadow().fromJson(shadow));
    });

    data.innerShadows?.forEach((shadow) => {
      this._innerShadows.push(new SkyShadow().fromJson(shadow));
    });

    if (data.contextSettings) {
      this.contextSettings = new SkyGraphicsContextSettings().fromJson(data.contextSettings);
    }

    if (data.blur) {
      this.blur = new SkyBlur().fromJson(data.blur);
    }

    return this;
  }

  overrideStyle(textStyle: SkyTextStyle | undefined, tintColor: SkyColor | undefined) {
    return new Proxy(this, {
      get(target: SkyStyle, prop: string, receiver: any) {
        if (prop === 'textStyle') {
          return textStyle;
        }
        if (prop === 'tintColor') {
          return tintColor;
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  // 这造成 fill 变成了一次性的，取出来后就必须立即使用
  get fills() {
    // get 的时候设置 context 信息

    this._fills.forEach((fill) => {
      fill.tintColor = this.tintColor;
    });

    return this._fills;
  }

  get borders() {
    this._borders.forEach((border) => {
      border.tintColor = this.tintColor;
    });

    return this._borders;
  }

  get shadows() {
    this._shadows.forEach((shadow) => {
      shadow.tintColor = this.tintColor;
    });
    return this._shadows;
  }

  get innerShadows() {
    this._innerShadows.forEach((shadow) => {
      shadow.tintColor = this.tintColor;
    });
    return this._innerShadows;
  }
}

export const SkyFillType = SketchFormat.FillType;
export type SkyFillType = SketchFormat.FillType;

export const SkyBorderPosition = SketchFormat.BorderPosition;
export type SkyBorderPosition = SketchFormat.BorderPosition;

export const SkyPatternFillType = SketchFormat.PatternFillType;
export type SkyPatternFillType = SketchFormat.PatternFillType;

export const SkyBlurType = SketchFormat.BlurType;
export type SkyBlurType = SketchFormat.BlurType;

class SkyBlur extends SkyBaseObject<SketchFormat.Blur> {
  readonly _class = 'blur';

  isEnabled = true;
  // zoom blur 可以设置中心
  center = new Point(0.5, 0.5);
  // motion blur 可以设置方向
  motionAngle = 0;
  radius = 0;
  saturation = 1;
  type: SkyBlurType = SkyBlurType.Gaussian;

  fromJson(data: SketchFormat.Blur) {
    this.isEnabled = data.isEnabled;
    this.center = Point.fromPointString(data.center);
    this.motionAngle = data.motionAngle ?? this.motionAngle;
    this.radius = data.radius ?? this.radius;
    this.saturation = data.saturation;
    this.type = data.type;
    return this;
  }
}

abstract class SkyTintColorObject<T extends SketchFormat.AnyObject> extends SkyBaseObject<T> {
  tintColor?: SkyColor;
  _color = new SkyColor();

  get color() {
    this._color.tintColor = this.tintColor;
    return this._color;
  }
}

/**
 * 图片调色
 */
class SkyColorControls {}

/**
 * Todo， 处理 tint 到时候，fill/border 有很多共同的逻辑，可以合并下。
 */
export class SkyFill extends SkyTintColorObject<SketchFormat.Fill> {
  readonly _class = 'fill';

  isEnabled = true;

  fillType = SkyFillType.Color;
  noiseIndex = 0;
  noiseIntensity = 0;
  patternFillType = SkyPatternFillType.Fill;
  patternTileScale = 0;
  contextSettings = new SkyGraphicsContextSettings();
  _gradient?: SkyGradient;
  image?: SkyFile;

  fromJson(data: SketchFormat.Fill) {
    this.isEnabled = data.isEnabled;
    this._color.fromJson(data.color);
    this.fillType = data.fillType;
    this.noiseIndex = data.noiseIndex;
    this.noiseIntensity = data.noiseIntensity;
    this.patternFillType = data.patternFillType;
    this.patternTileScale = data.patternTileScale;
    if (data.contextSettings) {
      this.contextSettings.fromJson(data.contextSettings);
    }

    if (data.gradient) {
      this._gradient = new SkyGradient().fromJson(data.gradient);
    }

    if (data.image) {
      this.image = new SkyFile().fromJson(data.image);
    }

    return this;
  }

  get gradient() {
    if (this._gradient) {
      this._gradient.tintColor = this.tintColor;
    }
    return this._gradient;
  }
}
export class SkyBorder extends SkyTintColorObject<SketchFormat.Border> {
  readonly _class = 'border';

  isEnabled = true;
  fillType: SkyFillType = SkyFillType.Color;
  position: SkyBorderPosition = SkyBorderPosition.Center;
  thickness = 1;
  _gradient?: SkyGradient;

  contextSettings = new SkyGraphicsContextSettings();

  fromJson(data: SketchFormat.Border) {
    this.isEnabled = data.isEnabled;

    this._color = this.color.fromJson(data.color);

    this.fillType = data.fillType;

    this.position = data.position;

    this.thickness = data.thickness;

    if (data.gradient) {
      this._gradient = new SkyGradient().fromJson(data.gradient);
    }

    if (data.contextSettings) {
      this.contextSettings.fromJson(data.contextSettings);
    }

    return this;
  }

  get gradient() {
    if (this._gradient) {
      this._gradient.tintColor = this.tintColor;
    }
    return this._gradient;
  }
}

export class SkyColor extends SkyBaseObject<SketchFormat.Color> {
  _class = 'color';

  tintColor?: SkyColor;

  _skColor = sk.CanvasKit.TRANSPARENT;

  get isEmpty() {
    return this._skColor[3] === 0;
  }

  get skColor() {
    if (!this.tintColor) {
      return this._skColor;
    } else {
      const tintSkColor = this.tintColor._skColor;
      if (tintSkColor[3] === this._skColor[3]) {
        return tintSkColor;
      } else {
        const ret = tintSkColor.slice();
        ret[3] = this._skColor[3];
        return ret;
        // return sk.CanvasKit.Color(tintSkColor[0], tintSkColor[1], tintSkColor[2], this._skColor[3])
      }
    }
  }

  fromJson(color: SketchFormat.Color) {
    this._skColor = sk.CanvasKit.Color(
      (color.red * 256) | 0,
      (color.green * 256) | 0,
      (color.blue * 256) | 0,
      color.alpha
    );
    return this;
  }
}

export class SkyImage {}

export class SkyGraphicsContextSettings extends SkyBaseObject<SketchFormat.GraphicsContextSettings> {
  readonly _class = 'graphicsContextSettings';
  blendMode = sk.CanvasKit.BlendMode.Src;
  opacity = 1;

  fromJson(data: SketchFormat.GraphicsContextSettings) {
    this.blendMode = sketchBlendToSk(data.blendMode);
    this.opacity = data.opacity;
    return this;
  }
}

export type SkyGradientType = SketchFormat.GradientType;
export const SkyGradientType = SketchFormat.GradientType;

export class SkyGradientStop {
  constructor(public color: SkyColor, public position: number) {}
}

export class SkyGradient extends SkyBaseObject<SketchFormat.Gradient> {
  _class = 'gradient';

  gradientType: SkyGradientType = SkyGradientType.Linear;
  elipseLength = 100; // todo
  from = new Point();
  to = new Point();
  _stops: SkyGradientStop[] = [];
  tintColor?: SkyColor;

  fromJson(data: SketchFormat.Gradient) {
    this.gradientType = data.gradientType;
    this.elipseLength = data.elipseLength;
    this.from = Point.fromPointString(data.from);
    this.to = Point.fromPointString(data.to);
    this._stops = data.stops.map((stop) => {
      return new SkyGradientStop(new SkyColor().fromJson(stop.color), stop.position);
    });

    return this;
  }

  get stops() {
    this._stops.forEach((stop) => {
      stop.color.tintColor = this.tintColor;
    });
    return this._stops;
  }
}

export class SkyShadow extends SkyTintColorObject<SketchFormat.Shadow | SketchFormat.InnerShadow> {
  readonly _class = 'shadow';

  isInner = false;
  isEnabled = true;
  blurRadius = 0;
  contextSettings = new SkyGraphicsContextSettings();
  offsetX = 0;
  offsetY = 0;
  spread = 0;

  tintColor?: SkyColor;

  static create(color: SkColor, radius: number, offsetX = 0, offsetY = 0, spread = 0) {
    const ret = new SkyShadow();
    ret._color._skColor = color;
    ret.blurRadius = radius;
    ret.offsetX = offsetX;
    ret.offsetY = offsetY;
    ret.spread = spread;
    return ret;
  }

  get isEmpty() {
    return (this.blurRadius === 0 && this.spread === 0) || this.color.isEmpty;
  }

  fromJson(data: SketchFormat.Shadow | SketchFormat.InnerShadow) {
    this.isInner = data._class === 'innerShadow';
    this.isEnabled = data.isEnabled;
    this.blurRadius = data.blurRadius;
    this._color.fromJson(data.color);
    this.contextSettings.fromJson(data.contextSettings);
    this.offsetX = data.offsetX;
    this.offsetY = data.offsetY;
    this.spread = data.spread;
    return this;
  }
}

export class SkyTextStyle extends SkyBaseObject<SketchFormat.TextStyle> {
  _class = 'textStyle';
  verticalAlignment = SketchFormat.TextVerticalAlignment.Top;
  encodedAttributes: SketchFormat.TextStyle['encodedAttributes'] = {} as any;

  readonly defaultFontAttribute = {
    _class: SketchFormat.ClassValue.FontDescriptor as any,
    attributes: {
      name: 'Roboto',
      size: 12,
    },
  };

  fromJson(data: SketchFormat.TextStyle) {
    this.verticalAlignment = data.verticalAlignment;
    Object.assign(this.encodedAttributes, data.encodedAttributes);
    if (!this.encodedAttributes.MSAttributedStringFontAttribute) {
      this.encodedAttributes.MSAttributedStringFontAttribute = this.defaultFontAttribute;
    }
    return this;
  }
}

export class SkyBorderOptions extends SkyBaseObject<SketchFormat.BorderOptions> {
  readonly _class = 'borderOptions';

  isEnabled = false;
  dashPattern: number[] = [];
  lineCapStyle = sk.CanvasKit.StrokeCap.Butt;
  lineJoinStyle = sk.CanvasKit.StrokeJoin.Round;

  fromJson(data: SketchFormat.BorderOptions) {
    this.isEnabled = data.isEnabled;
    this.dashPattern = data.dashPattern;
    this.lineCapStyle = sketchStrokeCapToSk(data.lineCapStyle);
    this.lineJoinStyle = sketchJoinStyleToSk(data.lineJoinStyle);
    return this;
  }
}

export class SkyCurvePoint extends SkyBaseObject<SketchFormat.CurvePoint> {
  readonly _class = ClassValue.CurvePoint;
  curveFrom = new Point();
  curveTo = new Point();
  point = new Point();

  curveMode = SkyCurveMode.None;
  cornerRadius = 0;

  hasCurveFrom = false;
  hasCurveTo = false;

  constructor(private frame: Rect) {
    super();
  }

  fromJson(data: SketchFormat.CurvePoint) {
    const { width, height } = this.frame;

    this.curveMode = data.curveMode;
    this.cornerRadius = data.cornerRadius;

    this.point = Point.fromPointString(data.point).scale(width, height);

    this.curveFrom = Point.fromPointString(data.curveFrom).scale(width, height);
    this.curveTo = Point.fromPointString(data.curveTo).scale(width, height);

    this.hasCurveFrom = data.hasCurveFrom;
    this.hasCurveTo = data.hasCurveTo;
    return this;
  }
}
