import { writeFile } from 'node:fs/promises';
import { inspectInput, importSpecifications } from './io.ts';
import { inspectSchema } from './validate.ts';

async function main(args: string[]) {
  const [command, input, ...flags] = args;
  if (command === 'schema' && !input) {
    const issues = inspectSchema(); console.log(JSON.stringify({ valid: !issues.length, issues, factualVerification: false }, null, 2)); process.exitCode = issues.length ? 1 : 0; return;
  }
  if (!['validate','coverage','import'].includes(command) || !input) throw new Error('Usage: node --import tsx tools/game-specs/cli.ts schema | validate INPUT [--catalog FILE] [--complete] [--extensions id,id] [--report NEW_FILE] | coverage INPUT [--catalog FILE] | import INPUT --out NEW_DIRECTORY [same flags]');
  const values: Record<string, string> = {};
  let complete = command === 'coverage';
  for (let i = 0; i < flags.length; i++) {
    const flag = flags[i];
    if (flag === '--complete') { complete = true; continue; }
    if (!['--catalog','--out','--extensions','--report'].includes(flag) || !flags[i+1] || flags[i+1].startsWith('--') || values[flag]) throw new Error('Unknown, missing or repeated option.');
    values[flag] = flags[++i];
  }
  if (command === 'import' && !values['--out'] || command !== 'import' && values['--out']) throw new Error('--out is required only for import.');
  const options = { catalog: values['--catalog'], extensions: values['--extensions']?.split(','), complete };
  const result = command === 'import' ? await importSpecifications(input, values['--out'], options) : await inspectInput(input, options);
  const { specifications, ...report } = result;
  const output = { ...report, valid: result.valid && (!complete || result.coverage.complete), structurallyValidSpecifications: specifications.length, factualVerification: false };
  if (values['--report']) await writeFile(values['--report'], JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(output, null, 2));
  process.exitCode = output.valid ? 0 : 1;
}

main(process.argv.slice(2)).catch(error => { console.error(JSON.stringify({ valid: false, error: error instanceof Error ? error.message : 'Specification tool failed.', factualVerification: false })); process.exitCode = 1; });
