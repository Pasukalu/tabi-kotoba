import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export function secretFlags(text,known=[]) {
  const flags=[];
  if(known.some((value)=>value.length>=12 && text.includes(value))) flags.push('local-secret-match');
  if(/\bsk-[A-Za-z0-9_-]{24,}\b/.test(text)) flags.push('api-key-pattern');
  if(/\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}\b/.test(text)) flags.push('github-token-pattern');
  if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) flags.push('private-key');
  if(/NEXT_PUBLIC_[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)\s*=\s*["']?[^\s"'\r\n]{12,}/.test(text)) flags.push('public-secret-setting');
  return flags;
}
function git(args,input) {
  const result=spawnSync('git',args,{input,encoding:null,maxBuffer:128*1024*1024,windowsHide:true});
  if(result.status!==0) throw Error('Git inspection failed; no credential values are printed.');
  return result.stdout;
}
export function audit(history=false) {
  const known=[];
  // Values stay in this process and are never included in logs or process arguments.
  for(const name of ['.env.local','.env','.env.production','.env.development']) {
    if(!fs.existsSync(name))continue;
    for(const line of fs.readFileSync(name,'utf8').split(/\r?\n/)) {
      const match=/^\s*(?:export\s+)?([A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD))\s*=\s*(.*?)\s*$/.exec(line);
      if(match){const value=match[2].replace(/^(['"])(.*)\1$/,'$2');if(value.length>=12)known.push(value);}
    }
  }
  const issues=[];
  const tracked=git(['ls-files','-z']).toString('utf8').split('\0').filter(Boolean);
  for(const file of tracked) {
    if(/(^|\/)\.env(?:\.|$)/.test(file)&&!file.endsWith('.env.example'))issues.push({file,flags:['environment-file-tracked']});
    if(fs.existsSync(file)) {const flags=secretFlags(fs.readFileSync(file,'utf8'),known);if(flags.length)issues.push({file,flags});}
  }
  // Scan the actual index as well: a clean working copy can still have an older secret staged.
  const staged=git(['ls-files','--stage','-z']).toString('utf8').split('\0').filter(Boolean);
  const stagedIds=[...new Set(staged.map((record)=>record.slice(0,record.indexOf('\t')).split(' ')[1]))];
  for(const id of stagedIds) {
    const flags=secretFlags(git(['cat-file','blob',id]).toString('utf8'),known);
    if(flags.length)issues.push({object:id,scope:'index',flags});
  }
  let blobs=0;
  if(history) {
    const objectLines=git(['rev-list','--objects','--all']).toString('utf8').trim().split('\n').filter(Boolean);
    for(const line of objectLines) {
      const space=line.indexOf(' '),name=space<0?'':line.slice(space+1);
      if(/(^|\/)\.env(?:\.|$)/.test(name)&&!/(^|\/)\.env\.example$/.test(name))issues.push({object:line.split(' ')[0],flags:['environment-file-in-history']});
    }
    const objects=objectLines.map((line)=>line.split(' ')[0]);
    if(objects.length) {
      const types=git(['cat-file','--batch-check=%(objectname) %(objecttype)'],objects.join('\n')+'\n').toString('utf8').trim().split('\n');
      const ids=types.filter((line)=>line.endsWith(' blob')).map((line)=>line.split(' ')[0]);
      blobs=ids.length;
      // Commit and annotated-tag messages can also accidentally contain credentials.
      for(const record of types.filter((line)=>/ (commit|tag)$/.test(line))) {
        const [id,type]=record.split(' ');
        const flags=secretFlags(git(['cat-file',type,id]).toString('utf8'),known);
        if(flags.length)issues.push({object:id,scope:'history-message',flags});
      }
      const data=git(['cat-file','--batch'],ids.join('\n')+'\n');
      let offset=0;
      while(offset<data.length){const end=data.indexOf(10,offset);if(end<0)throw Error('Invalid Git object stream');const [id,type,size]=data.subarray(offset,end).toString('utf8').split(' ');const length=Number(size);if(type!=='blob'||!Number.isSafeInteger(length)||length<0)throw Error('Invalid Git object');const content=data.subarray(end+1,end+1+length).toString('utf8');const flags=secretFlags(content,known);if(flags.length)issues.push({object:id,flags});offset=end+length+2;}
    }
  }
  return {trackedFiles:tracked.length,historyBlobs:blobs,issues};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {const result=audit(process.argv.includes('--history'));console.log(JSON.stringify(result,null,2));if(result.issues.length)process.exitCode=1;}
  catch {console.error('Secret audit could not finish. No secret values were printed.');process.exitCode=1;}
}
