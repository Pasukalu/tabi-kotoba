import assert from 'node:assert/strict';
import {secretFlags, audit} from '../scripts/check-secrets.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
assert.equal(secretFlags('DEEPSEEK_API_KEY=\n').length,0);
assert.ok(secretFlags('sk-'+ 'a'.repeat(32)).includes('api-key-pattern'));
assert.ok(secretFlags('ghp_'+ 'b'.repeat(36)).includes('github-token-pattern'));
const value='example-sensitive-'+'x'.repeat(20);
assert.ok(secretFlags('prefix '+value,[value]).includes('local-secret-match'));
assert.equal(secretFlags('ordinary Japanese lesson: 予約しています。',[value]).length,0);
const original=process.cwd();
const parent=fs.realpathSync(os.tmpdir());
const directory=fs.mkdtempSync(path.join(parent,'tabi-secret-test-'));
function git(...args) {
  const result=spawnSync('git',['-c','user.name=Audit Test','-c','user.email=audit@example.invalid',...args],{cwd:directory,windowsHide:true,stdio:'pipe'});
  assert.equal(result.status,0,'Temporary audit fixture Git command failed');
}
try {
  process.chdir(directory);
  git('init');
  fs.writeFileSync('lesson.txt','safe Japanese lesson');
  git('add','lesson.txt');git('commit','-m','Initial fixture');
  assert.equal(audit(true).issues.length,0);
  const synthetic='sk-'+'z'.repeat(32);
  fs.writeFileSync('lesson.txt',synthetic);git('add','lesson.txt');
  fs.writeFileSync('lesson.txt','clean working copy');
  assert.ok(audit().issues.some((issue)=>issue.scope==='index'));
  git('commit','-m','Synthetic fixture only');
  git('add','lesson.txt');git('commit','-m','Clean latest file');
  const result=audit(true);
  assert.ok(result.issues.some((issue)=>issue.object));
  assert.ok(!JSON.stringify(result).includes(synthetic));
  fs.writeFileSync('.env.local','DEEPSEEK_API_KEY=\n');
  git('add','.env.local');git('commit','-m','Environment fixture');
  fs.unlinkSync('.env.local');git('add','-u');git('commit','-m','Remove environment fixture');
  assert.ok(audit(true).issues.some((issue)=>issue.flags.includes('environment-file-in-history')));
} finally {
  process.chdir(original);
  const resolved=fs.realpathSync(directory);
  if(path.dirname(resolved)===parent && path.basename(resolved).startsWith('tabi-secret-test-'))fs.rmSync(resolved,{recursive:true,force:true});
}
console.log('Secret audit: exact credentials, staged-only leaks, deleted historical keys and environment files are detected without printing values.');
