import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const file = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
test('no Supabase left in the app', () => {
  const pkg = JSON.parse(file('package.json'));
  assert.ok(!Object.keys(pkg.dependencies).some(d => d.startsWith('@supabase')));
  assert.ok(!existsSync(new URL('../supabase', import.meta.url)));
  assert.ok(!existsSync(new URL('../lib/supabase', import.meta.url)));
  assert.doesNotMatch(file('.env.example'), /SUPABASE|SERVICE_ROLE/);
});
test('local database is ignored by git', () => { assert.match(file('.gitignore'), /^data\/$/m); });
