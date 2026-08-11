/* Compiles public/wasm_files/water.wat to public/wasm_files/water.wasm
 * using the `wabt` npm package. Run with `npm run build:wasm`. */
const fs = require('fs');
const path = require('path');
const wabtInit = require('wabt');

const WAT_PATH = path.join(__dirname, '..', 'public', 'wasm_files', 'water.wat');
const WASM_PATH = path.join(__dirname, '..', 'public', 'wasm_files', 'water.wasm');

wabtInit().then((wabt) => {
  const wat = fs.readFileSync(WAT_PATH, 'utf8');
  const module = wabt.parseWat('water.wat', wat, { simd: true });
  module.resolveNames();
  module.validate();
  const { buffer } = module.toBinary({});
  fs.writeFileSync(WASM_PATH, Buffer.from(buffer));
  console.log(`Wrote ${WASM_PATH} (${buffer.length} bytes)`);
  module.destroy();
}).catch((err) => {
  console.error('WASM build failed:', err);
  process.exit(1);
});
