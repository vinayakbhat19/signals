import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const loader = require('@tailwindcss/turbopack');

const cssPath = path.resolve(process.cwd(), 'app/globals.css');
const outPath = path.resolve(process.cwd(), 'app/globals-compiled.css');
const cssInput = fs.readFileSync(cssPath, 'utf8');

const context = {
  async: () => (err, res) => {
    if (err) {
      console.error('[build-css] Error compiling Tailwind CSS:', err);
      process.exit(1);
    }
    fs.writeFileSync(outPath, res, 'utf8');
    console.log(`[build-css] Successfully wrote ${res.length} bytes to ${outPath}`);
  },
  getOptions: () => ({ base: process.cwd(), optimize: true }),
  resourcePath: cssPath,
  resource: cssPath,
  addDependency: () => {},
  addContextDependency: () => {},
};

loader.call(context, cssInput);
