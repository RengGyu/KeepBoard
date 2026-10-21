// Node-only SSR verification: CSS is inspected separately, never replaced in product builds.
import { register } from 'node:module';
register('./skip-css.mjs', import.meta.url);
