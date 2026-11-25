import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSnapshot, buildRadar, boardIssue, dataScript } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
function option(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const inline = process.argv.find(a => a.startsWith(`--${name}=`));
  return i >= 0 ? process.argv[i + 1] : inline ? inline.slice(name.length + 3) : fallback;
}
const input = option('input', '/input');
const output = option('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const snapshot = parseSnapshot(readFileSync(input.endsWith('.json') ? input : join(input, 'snapshot.json'), 'utf8'));
const { board, radar } = buildRadar(snapshot);
const issue = boardIssue(board, snapshot);
if (issue) throw new Error(issue);
mkdirSync(output, { recursive: true });
const rows = board.map(row => JSON.stringify(row)).join(',\n');
writeFileSync(join(output, 'board.json'), `{\n"as_of":${JSON.stringify(snapshot.as_of)},\n"source":${JSON.stringify(snapshot.source)},\n"rows":[\n${rows}\n]}\n`);
writeFileSync(join(output, 'data.js'), dataScript(radar));
for (const directory of ['dashboard', 'screenshots']) {
  const destination = join(output, directory);
  mkdirSync(destination, { recursive: true });
  for (const name of readdirSync(join(root, directory), { withFileTypes: true })) {
    if (name.isFile() && !name.name.startsWith('.')) copyFileSync(join(root, directory, name.name), join(destination, name.name));
  }
}
writeFileSync(join(output, 'dossier.json'), buildDossier(output, { text_max_bytes: 65536, screenshots: { max: 4, max_bytes: 524288 }, dashboard: { max_files: 400, max_bytes: 4194304 } }));
console.log(`Signal Desk: ${board.length} rows, ${snapshot.watchlist.length} watchlist protocols, snapshot ${snapshot.as_of}`);
