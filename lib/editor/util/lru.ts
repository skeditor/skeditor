type LinkNode<T> = {
  next?: LinkNode<T>;
  pre?: LinkNode<T>;
  val?: T;
  key?: string;
};

export class LruCache<T> {
  head: LinkNode<T>;
  tail: LinkNode<T>;
  map: { [key: string]: LinkNode<T> };
  size = 0;

  constructor(private limit: number, private evictHandler?: (val: T) => void) {
    this.head = {};
    this.tail = {};
    this.head.next = this.tail;
    this.tail.pre = this.head;
    this.map = {};
    this.size = 0;
  }

  set(k: string, v: T) {
    if (this.get(k)) {
      this.map[k].val = v;
      return;
    }
    this.size++;
    const node = { pre: this.head, next: this.head.next, val: v, key: k };

    this._fitNode(node);

    this.map[k] = node;
    this._trim();
  }

  get(k: string) {
    const node = this.map[k];
    if (node) {
      this._hoist(node);
      return node.val;
    } else {
      return undefined;
    }
  }

  _trim() {
    if (this.size > this.limit) {
      this.size--;
      const rm = this.tail.pre;
      this._removeNode(rm!);

      this.evictHandler?.(rm!.val!);
      delete this.map[rm!.key!];
    }
  }

  _hoist(node: LinkNode<T>) {
    this._removeNode(node);

    node.next = this.head.next;
    node.pre = this.head;

    this._fitNode(node);
  }

  _fitNode(node: LinkNode<T>) {
    node.pre!.next = node;
    node.next!.pre = node;
  }

  _removeNode(node: LinkNode<T>) {
    node.pre!.next = node.next;
    node.next!.pre = node.pre;
  }

  delete(key: string) {
    const node = this.map[key];
    if (!node) return;
    this.size--;
    this.evictHandler?.(node!.val!);
    delete this.map[key];
    this._removeNode(node);
  }

  clear() {
    Object.keys(this.map).forEach((key) => this.delete(key));
  }
}
