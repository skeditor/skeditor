export const PI_2 = Math.PI * 2;

export interface IPointData {
  x: number;
  y: number;
}

export interface IPoint extends IPointData {
  copyFrom(p: IPointData): this;
  copyTo<T extends IPoint>(p: T): T;
  equals(p: IPointData): boolean;
  set(x?: number, y?: number): void;
}

export function degreeToRadian(degree) {
  return (degree / 180) * Math.PI;
}
