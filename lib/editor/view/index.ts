// view 中将不再使用 SketchFormat 了，所以的结构体都已经在 model 中初始化过了。

import debug from 'debug';
debug.log = console.log;

export * from './sky-view';
export * from './base';
export * from './layer-view';
export * from './shape-view';
export * from './image-view';
export * from './text-view';
export * from './artboard-view';
export * from './symbol-view';
export * from './group-view';
export * from './page-view';
