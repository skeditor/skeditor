import { Subscription } from 'rxjs';

export class Disposable {
  protected _disposables: ((() => void) | Subscription | Disposable)[] = [];
  protected _disposed = false;

  dispose() {
    this._disposables.forEach((fn) => {
      if (typeof fn === 'function') {
        fn();
      } else if (fn instanceof Disposable) {
        fn.dispose();
      } else {
        fn.unsubscribe();
      }
    });
    this._disposables.length = 0;
    this._disposed = true;
  }
}
