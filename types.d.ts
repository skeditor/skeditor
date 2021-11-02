// Ambient types

declare module '*.png' {
  let str: string;
  export default str;
}

declare module '*.jpg' {
  let str: string;
  export default str;
}

declare module '*.jpeg' {
  let str: string;
  export default str;
}

declare module '*.svg' {
  import type { Component } from 'vue';
  let comp: Component;
  export default comp;
}
