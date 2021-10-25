import SketchFormat from '@sketch-hq/sketch-file-format-ts';

// 命名都使用驼峰 Id Uid Json Http
// 不用用 fromJson 了，尽量在 constructor 初始化，保证类型健壮性

// 文档内公用信息，
// file 管理
// symbols 等等

// model 中使用了 canvaskit， 初始化的时候需要注意点，感觉这样使用不太好

export * from './sky-model';
export * from './base';
export * from './page';

export * from './symbol';
// export * from './shape';

export { SketchFormat };
