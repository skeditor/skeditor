import { ClassValue, SkyBaseLayer, SkyBaseGroup, SkyColor, SkyAttributeString, SkyStyle } from '.';
import SketchFormat from '@sketch-hq/sketch-file-format-ts';

export class SkySymbolMaster extends SkyBaseGroup<SketchFormat.SymbolMaster> {
  readonly _class = ClassValue.SymbolMaster;
  backgroundColor = new SkyColor();
  hasBackgroundColor = false;

  _fromJson(data: SketchFormat.SymbolMaster) {
    super._fromJson(data);
    this.backgroundColor.fromJson(data.backgroundColor);
    this.hasBackgroundColor = data.hasBackgroundColor;
    this.ctx.registerSymbol(data.symbolID, this);
  }
}

// Todo
// 获取 refModel、_layers 都太过于依赖恰当的时机。
// 这让流程变得过于难以理解
// 确保一个 field 只在一个简单确定的时机能够被 get 到。
// 使用 proxy 似乎不是个好点子，写好测试后考虑重构下。

// helper 能够更方便的使用 override values
class OverrideValues {
  overrideLayerStyles = new Map<string, string>();
  overrideTextStyles = new Map<string, string>();

  overrideText = new Map<string, string>();

  subOverrides = new Map<string, SketchFormat.OverrideValue[]>();

  subTint = new Map<string, SkyColor>();

  overrideSymbols = new Map<string, string>();

  static refs = new WeakMap<Array<SketchFormat.OverrideValue>, OverrideValues>();

  static getInstance(overrideValues: SketchFormat.OverrideValue[]) {
    let ret = this.refs.get(overrideValues);
    if (!ret) {
      ret = new OverrideValues(overrideValues);
      this.refs.set(overrideValues, ret);
    }

    return ret;
  }

  constructor(private overrideValues: SketchFormat.OverrideValue[]) {
    this.buildOverrides();
  }

  // construct into a easy to use structure
  private buildOverrides() {
    const overrideValues: SketchFormat.OverrideValue[] = this.overrideValues;

    overrideValues.forEach((info) => {
      const subIdx = info.overrideName.indexOf('/');
      if (subIdx !== -1) {
        const targetInstanceId = info.overrideName.slice(0, subIdx);
        const subName = info.overrideName.slice(subIdx + 1);

        const subOverrides = this.subOverrides.get(targetInstanceId) || [];
        subOverrides.push({
          ...info,
          overrideName: subName,
        });
        this.subOverrides.set(targetInstanceId, subOverrides);
        return;
      }

      const [id, type] = info.overrideName.split('_');

      switch (type) {
        // 图层样式被替换
        case 'layerStyle':
          this.overrideLayerStyles.set(id, info.value as string);
          break;
        // 文字样式被替换
        case 'textStyle':
          this.overrideTextStyles.set(id, info.value as string);
          break;
        // 文本被替换
        case 'stringValue':
          this.overrideText.set(id, info.value as string);
          break;
        // 内部引用的的 symbol 被替换
        case 'symbolID':
          this.overrideSymbols.set(id, info.value as string);
          break;
        // 内部引用 symbol 被 tint
        case 'fillColor':
          // 这个 info.value 确实是 color，看来 sketch 的类型定义有点问题
          this.subTint.set(id, new SkyColor().fromJson(info.value as any as SketchFormat.Color));
          break;
      }
    });
  }
}

/**
 * instance 也可能在多个地方被引用
 * 所以，instance 本身不要放任何可能被 override 的信息，都放在 proxy 上。
 */
export class SkySymbolInstance extends SkyBaseLayer<SketchFormat.SymbolInstance> {
  readonly _class = ClassValue.SymbolInstance;

  private _symbolID = '';
  private overrideValues: SketchFormat.OverrideValue[] = [];

  isProxy = false;

  // 可以是 undefined，这种情况下不现实
  // override 可以吧 symbolId 设置成空字符串，实现隐藏的效果。
  get refModel() {
    return this.ctx.getSymbol(this._symbolID);
  }

  _layers?: SkyBaseGroup['layers'];

  /**
   * render 的时候延迟 get
   * instance 创建的时候， refModel 还没创建好
   *
   * instance 也可以在 master 中
   * 所以，可能还是要被 proxy，在被 proxy 之后，调用 wrapLayers 可能就有问题了
   *
   * 所以，要考虑到，instance 的 layers 也还是会有多样性的，不能写死！
   *
   * override 相关的操作，都应放在 proxy 中。 之前把 override 放在了 wrapLayers 中虽然简单，但是个错误。
   */
  get layers() {
    if (this.isProxy) return this.refModel?.layers || [];

    if (this._layers === undefined) {
      this._layers = this.wrapLayers();
    }
    return this._layers;
  }

  // get rootInstance() {
  // return this.pare
  // }

  get parentInstance() {
    let p = this.parent;
    while (p && !(p instanceof SkySymbolInstance)) {
      p = p.parent;
    }
    return p;
  }

  private wrapLayers() {
    const ret = [] as SkyBaseGroup['layers'];

    // instance 下的 instance 继承上层传递下来的 overrides
    this.refModel?.layers.forEach((layer) => {
      ret.push(new Proxy(layer, new LayerProxyHandler(layer, this)));
    });
    return ret;
  }

  _fromJson(data: SketchFormat.SymbolInstance) {
    this._symbolID = data.symbolID;

    const masterFill0 = this.refModel?.style?.fills[0];
    const instanceFill0 = this.style?.fills[0];

    if (masterFill0?.isEnabled) {
      this.tintColor = masterFill0.color;
    } else if (instanceFill0?.isEnabled) {
      this.tintColor = instanceFill0.color;
    }

    this.overrideValues = data.overrideValues ?? this.overrideValues;
  }

  get overrideValuesHelper() {
    return OverrideValues.getInstance(this.overrideValues);
  }

  getActualSymbol(originValue: string, instanceId: string) {
    // may be empty string
    return this.overrideValuesHelper.overrideSymbols.get(instanceId) ?? originValue;
  }

  getSubInstanceOverrides(instanceId: string) {
    return this.overrideValuesHelper.subOverrides.get(instanceId);
  }

  getOverrideLayerTintColor(objId: string) {
    // 最外层的 tint 优先级高
    return this.tintColor || this.overrideValuesHelper.subTint.get(objId);
  }

  getChildrenOverrideStyle(originStyle: SkyStyle, childId: string) {
    const styleId = this.overrideValuesHelper.overrideLayerStyles.get(childId);

    let retStyle = originStyle;

    if (styleId) {
      const shareStyle = this.ctx.getStyle(styleId);

      retStyle = shareStyle || retStyle;
    }

    const textStyleId = this.overrideValuesHelper.overrideTextStyles.get(childId);
    const textStyle = textStyleId ? this.ctx.getStyle(textStyleId) : undefined;
    // if (textStyleId) {
    //   const textStyle = this.ctx.getStyle(textStyleId);
    //   if (textStyle) {
    // retStyle = retStyle.overrideTextStyle(textStyle.textStyle, this.tintColor);
    //   }
    // }

    return retStyle.overrideStyle(textStyle?.textStyle, this.tintColor);
  }

  getChildrenOverrideString(attrString: SkyAttributeString, childId: string): SkyAttributeString {
    const overrideText = this.overrideValuesHelper.overrideText.get(childId);
    const overrideTextStyle = this.overrideValuesHelper.overrideTextStyles.get(childId);

    if (overrideText === undefined && overrideTextStyle === undefined) return attrString;

    const wrap = { ...attrString };

    if (overrideText !== undefined) {
      wrap.string = overrideText;
    }

    if (overrideTextStyle !== undefined) {
      const overrideStyle = this.ctx.getStyle(overrideTextStyle);
      if (overrideStyle) {
        const textStyle = overrideStyle.textStyle;
        const color = new SkyColor();
        if (textStyle?.encodedAttributes.MSAttributedStringColorAttribute) {
          color.fromJson(textStyle.encodedAttributes.MSAttributedStringColorAttribute);
        }
        wrap.attributes = [
          {
            location: 0,
            length: wrap.string.length,
            attributes: {
              kerning: textStyle?.encodedAttributes.kerning,
              textStyleVerticalAlignmentKey: textStyle?.encodedAttributes.textStyleVerticalAlignmentKey,
              MSAttributedStringColorAttribute: color,
              MSAttributedStringFontAttribute:
                textStyle?.encodedAttributes.MSAttributedStringFontAttribute ||
                wrap.attributes[0].attributes.MSAttributedStringFontAttribute,
              paragraphStyle: textStyle?.encodedAttributes.paragraphStyle,
            },
          },
        ];
      }
    }

    return wrap;
  }
}

class LayerProxyHandler implements ProxyHandler<SkyBaseLayer> {
  layers?: SkyBaseGroup['layers'];

  constructor(private target: SkyBaseLayer, private instance: SkySymbolInstance) {
    if (target.objectId === '1C639DD8-8465-4FDE-BCC2-E83D7D00DB1B') {
      // debugger;
    }
  }

  get(target: SkyBaseLayer, prop: string, receiver: any) {
    if (prop === 'isProxy') {
      return true;
    }

    // Group children 在 get 的时候 proxy 包裹下。这个有点 hack
    // instance 类型的话，就不在这里处理了
    if (prop === 'layers') {
      if (!this.layers) {
        const refChildren = Reflect.get(target, prop, receiver) || [];
        this.layers = refChildren.map(
          (child) =>
            new Proxy(
              child,
              new LayerProxyHandler(child, this.target instanceof SkySymbolInstance ? receiver : this.instance)
            )
        );
      }
      return this.layers;
    }

    if (prop === 'tintColor') {
      return this.instance.getOverrideLayerTintColor(this.target.objectId) ?? this.target.tintColor;
    }

    if (prop === 'style') {
      const originStyle = Reflect.get(target, prop, receiver);
      const style = this.instance.getChildrenOverrideStyle(originStyle, this.target.objectId);
      return style;
    }

    if (prop === 'attributedString') {
      const value = Reflect.get(target, prop, receiver);

      return this.instance.getChildrenOverrideString(value, this.target.objectId);
    }

    // Todo
    if (prop === '_symbolID') {
      const value = Reflect.get(target, prop, receiver);
      return this.instance.getActualSymbol(value, this.target.objectId);
    }

    if (prop === 'overrideValues') {
      return this.instance.getSubInstanceOverrides(this.target.objectId) || [];
    }

    return Reflect.get(target, prop, receiver);
  }
}
