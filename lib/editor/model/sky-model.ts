import { SketchFormat, SkySymbolMaster, SkyPage, SkImage, SkyStyle } from '.';
import JSZip from 'jszip';
import invariant from 'ts-invariant';
import { Subject } from 'rxjs';
import sk from '../util/canvaskit';
import { Disposable } from '../base';

export class SkyModel extends Disposable {
  static currentContext: SkyModel;
  zipFile!: JSZip;
  data!: SketchFormat.Document;

  metaData?: SketchFormat.Meta;
  userData = {};

  pages: SkyPage[] = [];

  private symbolRegistry = new Map<string, SkySymbolMaster>();
  private styleRegistry = new Map<string, SkyStyle>();

  private foreignSymbols: SkySymbolMaster[] = [];

  imageLoaded$ = new Subject();

  private imageCache = new Map<string, SkImage>();

  constructor() {
    super();
    SkyModel.currentContext = this;
  }

  // 初始化入口
  async readZipFile(zipFile: JSZip) {
    this.zipFile = zipFile;

    const docJson = await this.readJsonFile(zipFile, 'document.json');

    this.data = docJson;
    try {
      this.metaData = await this.readJsonFile(zipFile, 'meta.json');
      this.userData = await this.readJsonFile(zipFile, 'user.json');
    } catch (err) {
      console.error('Bad file structure', err);
    }

    if (!this.isSupportedVersion) return;

    this.collectSymbols();
    this.collectStyles();
    await this.initPages();
  }

  // Todo
  get isSupportedVersion() {
    return this.metaData && this.metaData.compatibilityVersion >= 99;
  }

  get appInfo() {
    return `${this.metaData?.app}@${this.metaData?.appVersion}`;
  }

  // 这里初始化 foreignSymbol， 页面内的 symbol 就在页面的初始化过程中收集
  private collectSymbols() {
    this.data.foreignSymbols.forEach((symbol) => {
      this.foreignSymbols.push(new SkySymbolMaster().fromJson(symbol.symbolMaster));
    });
  }

  private collectStyles() {
    this.data.foreignTextStyles?.map((obj) => obj.localSharedStyle).forEach(this.registerSharedStyle);
    this.data.foreignLayerStyles?.map((obj) => obj.localSharedStyle).forEach(this.registerSharedStyle);
    this.data.layerTextStyles?.objects?.forEach(this.registerSharedStyle);
    this.data.layerStyles?.objects?.forEach(this.registerSharedStyle);
  }

  private async initPages() {
    for (const page of this.data.pages) {
      const pageJson = await this.readPageFileRefJson(page);
      this.pages.push(new SkyPage().fromJson(pageJson));
    }
  }

  registerSymbol(id: string, symbol: SkySymbolMaster) {
    this.symbolRegistry.set(id, symbol);
  }

  getSymbol(id: string) {
    return this.symbolRegistry.get(id);
  }

  private registerSharedStyle = (sharedStyle: SketchFormat.SharedStyle) => {
    const skyStyle = new SkyStyle().fromJson(sharedStyle.value);
    this.registerStyle(sharedStyle.do_objectID, skyStyle);
  };

  private registerStyle(id: string, style: SkyStyle) {
    this.styleRegistry.set(id, style);
  }

  getStyle(id: string) {
    return this.styleRegistry.get(id);
  }

  private async readJsonFile(zipFile: JSZip, filename: string) {
    const docStr = await zipFile.file(filename)?.async('string');
    invariant(typeof docStr === 'string', `${filename} not exist!`);
    return JSON.parse(docStr);
  }

  async readImgFile(filename: string) {
    if (!/\.\w+$/.test(filename)) {
      filename = `${filename}.png`;
    }
    if (this.imageCache.has(filename)) return this.imageCache.get(filename);
    const file = this.zipFile.file(filename);
    if (!file) {
      console.error(`image not exist: >>>${filename}<<<`);
      return undefined;
    }
    const blob = await file.async('blob');

    const buffer = await blob.arrayBuffer();

    const skImg = sk.CanvasKit.MakeImageFromEncoded(buffer);
    if (skImg) {
      this.imageCache.set(filename, skImg);
    } else {
      console.error('Make image failed: ', filename);
    }
    return this.imageCache.get(filename);
  }

  async readPageFileRefJson(fileRef: SketchFormat.FileRef) {
    return await this.readJsonFile(this.zipFile, fileRef._ref + '.json');
  }

  dispose() {
    super.dispose();
    this.imageCache.clear();
    if (SkyModel.currentContext === this) {
      (SkyModel.currentContext as any) = undefined;
    }
  }
}
