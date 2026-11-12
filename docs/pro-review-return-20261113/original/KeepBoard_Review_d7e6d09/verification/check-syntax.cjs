const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const files = [
  'verification/patched/shared/estimatedBoardStructure.ts',
  'verification/patched/src/EstimatedBoardView.tsx',
  'patch/files/shared/estimatedStructureSafety.ts',
  'patch/files/tests/estimated-structure-safety.test.ts',
];
let failures = 0;
for (const f of files) {
  const result = ts.transpileModule(fs.readFileSync(path.join(root, f), 'utf8'), {
    fileName: f,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  for (const d of errors) console.error(f, ts.flattenDiagnosticMessageText(d.messageText, '\n'));
  failures += errors.length;
}
console.log(`Transpile/syntax: ${files.length} files, ${failures} errors. Imports/full application types NOT checked.`);
process.exitCode = failures ? 1 : 0;
