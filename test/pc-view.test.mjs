import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPcObservationView } from '../on-client/student/extension.mjs';
import { collectPc } from '../on-client/student/pc/collect.mjs';
class Element {
  constructor(tag) { this.tag=tag; this.children=[]; this.listeners={}; this.attrs={}; this.text=''; this.disabled=false; this.value=tag==='select'?'all':''; }
  set textContent(value) { this.text=String(value); this.children=[]; }
  get textContent() { return this.text+this.children.map(c=>c.textContent).join('\n'); }
  get childElementCount() { return this.children.length; }
  append(...nodes) { this.children.push(...nodes); }
  prepend(...nodes) { this.children.unshift(...nodes); }
  replaceChildren(...nodes) { this.children=nodes; this.text=''; }
  setAttribute(k,v) { this.attrs[k]=v; }
  addEventListener(k,v) { this.listeners[k]=v; }
}
globalThis.document={createElement:tag=>new Element(tag)};
const nodes=root=>[root,...root.children.flatMap(nodes)];
const button=(root,label)=>nodes(root).find(n=>n.tag==='button'&&n.text===label);
const click=(root,label)=>button(root,label).listeners.click();
const status=root=>nodes(root).find(n=>n.attrs.role==='status').textContent;
const fixture=await collectPc({platform:'linux',sleep:async()=>{},system:{cpus:(()=>{let n=0;return()=>[{times:{user:++n*10,idle:n*10,sys:0,nice:0,irq:0}}]})(),totalmem:()=>1000,freemem:()=>200}});
const response=data=>({ok:true,status:200,json:async()=>({ok:true,data:structuredClone(data)})});
const history=root=>nodes(root).find(n=>n.tag==='ol');
test('no automatic request; partial results preserve source/time and SDP separation',async()=>{
 let calls=0;const root=createPcObservationView({request:async()=>{calls++;return response(fixture)}});root.setConnection('demo');
 assert.equal(calls,0);await click(root,'다시 조회');assert.equal(calls,1);
 assert.match(root.textContent,/예제 자료 · 실제 서버 연결 아님/);assert.match(root.textContent,/5개 항목 확인 불가/);assert.match(root.textContent,/node:os.cpus/);assert.match(root.textContent,/현재 실시간 상태가 아닙니다/);
});
test('30-entry cap, comparison, filtering and erase work without persistent storage',async()=>{
 const root=createPcObservationView({request:async()=>response(fixture)});
 for(let i=0;i<32;i++)await click(root,'다시 조회');
 assert.equal(history(root).children.length,30);assert.match(root.textContent,/직전 조회 대비/);
 const select=nodes(root).find(n=>n.tag==='select');select.value='unknown';select.listeners.change();
 assert.doesNotMatch(history(root).textContent,/CPU 사용률/);
 click(root,'조회 기록 지우기');assert.equal(history(root).children.length,0);
});
test('cancelled or erased pending response cannot repopulate history',async()=>{
 for(const action of ['조회 취소','조회 기록 지우기']){
  let resolve;const root=createPcObservationView({request:()=>new Promise(r=>resolve=r)});
  const pending=click(root,'다시 조회');assert.equal(button(root,'다시 조회').disabled,true);
  click(root,action);resolve(response(fixture));await pending;assert.equal(history(root).children.length,0);assert.equal(button(root,'다시 조회').disabled,false);
 }
});
test('manual retry recovers from unsupported, busy, failed and malformed results',async()=>{
 for(const first of [{ok:false,status:404},{ok:false,status:429},{ok:false,status:503},response({})]){
  let n=0;const root=createPcObservationView({request:async()=>n++?response(fixture):first});
  await click(root,'다시 조회');assert.equal(history(root).children.length,0);assert.equal(button(root,'다시 조회').disabled,false);
  await click(root,'다시 조회');assert.equal(history(root).children.length,1);
 }
});
test('a timeout is visible and unlocks manual retry',async()=>{
 const root=createPcObservationView({timeoutMs:1,request:(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted'))))});
 await click(root,'다시 조회');assert.match(status(root),/시간이 초과/);assert.equal(button(root,'다시 조회').disabled,false);
});
test('invalid metric values remain unknown, older observations rejected',async()=>{
 const bad=structuredClone(fixture);bad.metrics.cpu.value=999;
 let n=0;const old=structuredClone(fixture);old.checkedAt='2000-01-01T00:00:00Z';
 const root=createPcObservationView({request:async()=>response(n++?old:bad)});
 await click(root,'다시 조회');assert.match(status(root),/6개 항목 확인 불가/);
 await click(root,'다시 조회');assert.match(status(root),/오래된 결과/);assert.equal(history(root).children.length,1);
});
