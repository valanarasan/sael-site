/// <reference types="astro/client" />

// Lets plain `tsc` (part of `npm run check`) resolve .astro imports in .ts files,
// e.g. component tests using the Container API. `astro check` uses the real
// component types; this wildcard is only a fallback for tsc.
declare module '*.astro' {
  import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
  const Component: AstroComponentFactory;
  export default Component;
}
