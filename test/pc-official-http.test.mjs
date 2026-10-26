import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createOnServer} from '../on-client/src/server.mjs';
import {normalizeOfficialPc, createStudentView} from '../on-client/student/extension.mjs';

test('official server returns measured PC data and applies student appearance without custom entrypoint',async()=>{
 const server=createOnServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  const result=await (await fetch(base+'/api/pc/status')).json();assert.equal(result.ok,true);const data=normalizeOfficialPc(result.data);
  assert.equal(Object.keys(data.metrics).length,6);assert.equal(result.data.source,'local-pc');
  const appearance=await (await fetch(base+'/student/appearance.json')).json();assert.equal(appearance.state,'applied');assert.equal(appearance.dashboardPreset,'student-first');
  assert.equal((await fetch(base+'/student/pc-view.css')).status,404);
  assert.equal((await fetch(base+'/api/pc/status',{headers:{origin:'https://example.invalid'}})).status,403);
  assert.equal((await fetch(base+'/api/pc/status?extra=1')).status,400);
 }finally{await new Promise(r=>server.close(r));}
});

test('createStudentView wires the provided API into renderStatus without automatic collection',async()=>{
 class El{constructor(tag){this.tag=tag;this.children=[];this.listeners={};}append(...v){this.children.push(...v)}setAttribute(){}replaceChildren(...v){this.children=v}addEventListener(k,v){this.listeners[k]=v}}
 const previous=globalThis.document;globalThis.document={createElement:tag=>new El(tag)};
 try{
  let calls=0;const view=createStudentView({api:{get:async path=>{assert.equal(path,'/api/pc/status');calls++;return {ok:false,error:{code:'NOT_ALLOWED'}}}}});
  const root=view.renderStatus({mode:'demo'});assert.equal(calls,0);
  const all=n=>[n,...n.children.flatMap(all)];const read=all(root).find(n=>n.tag==='button'&&n.textContent==='다시 조회');await read.listeners.click();assert.equal(calls,1);
 }finally{globalThis.document=previous;}
});
