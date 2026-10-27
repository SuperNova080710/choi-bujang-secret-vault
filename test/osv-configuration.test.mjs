import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createProjectScanner} from '../on-client/src/vulnerabilities/project-scan.mjs';

async function fixture(run){
 const dir=await mkdtemp(join(tmpdir(),'osv-config-'));
 try{
  await mkdir(join(dir,'node_modules','example-public'),{recursive:true});
  await writeFile(join(dir,'package-lock.json'),JSON.stringify({lockfileVersion:3,packages:{'node_modules/example-public':{version:'1.2.3',resolved:'https://registry.npmjs.org/example-public/-/example-public-1.2.3.tgz'}}}));
  await writeFile(join(dir,'node_modules','example-public','package.json'),JSON.stringify({name:'example-public',version:'1.2.3'}));
  await run(dir);
 }finally{await rm(dir,{recursive:true,force:true});}
}
const rejectClient={lookupPackages(){throw Error('unexpected external lookup');}};
test('missing or relative project path remains not configured without a request',async()=>{
 for(const projectDirectory of [undefined,'.']){
  const result=await createProjectScanner({projectDirectory,client:rejectClient}).scan();
  assert.equal(result.code,'PROJECT_NOT_CONFIGURED');assert.equal(result.status,'not_configured');
 }
});
test('configured lock with no approval is not checked, never clean',()=>fixture(async projectDirectory=>{
 const result=await createProjectScanner({projectDirectory,client:rejectClient}).scan();
 assert.equal(result.code,'NO_APPROVED_PACKAGES');assert.equal(result.status,'not_checked');
}));
test('only matching approved installed version reaches the mock OSV transport',()=>fixture(async projectDirectory=>{
 let called=0;
 const result=await createProjectScanner({projectDirectory,approvedPublicPackages:['example-public'],client:{async lookupPackages(queries){
  called++;assert.deepEqual(queries,[{package:{name:'example-public',ecosystem:'npm'},version:'1.2.3'}]);
  return [{name:'example-public',version:'1.2.3',status:'none_found',vulnerabilities:[],source:'https://api.osv.dev/v1/querybatch',checkedAt:new Date().toISOString()}];
 }}}).scan();
 assert.equal(called,1);assert.equal(result.status,'complete');assert.equal(result.packages[0].status,'none_found');
}));
test('installed version mismatch prevents remote query and stays partial',()=>fixture(async projectDirectory=>{
 await writeFile(join(projectDirectory,'node_modules','example-public','package.json'),JSON.stringify({name:'example-public',version:'9.9.9'}));
 const result=await createProjectScanner({projectDirectory,approvedPublicPackages:['example-public'],client:rejectClient}).scan();
 assert.equal(result.status,'partial');assert.equal(result.packages[0].status,'unverifiable');
}));
