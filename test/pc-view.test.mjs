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

const officialFixture = {
 schema:'aleph.on.pc-status.v1', source:'local-pc', measuredAt:'2026-10-26T06:00:00Z', metrics:{
  cpu:{state:'ok',usagePercent:20,sampleMs:200}, memory:{state:'ok',usedBytes:20,totalBytes:100},
  disk:{state:'ok',freeBytes:50,totalBytes:100}, network:{state:'ok',interfaceCount:2,ipv4Count:3},
  firewall:{state:'ok',profiles:[{name:'Domain',enabled:true},{name:'Private',enabled:false},{name:'Public',enabled:true}]},
  events:{state:'ok',warningCount:2,errorCount:1,truncated:false,sampleLimit:5000,since:'2026-10-25T06:00:00Z'}
 }
};
test('official API is manual, uses six exact metrics and no unsupported stylesheet or legacy fetch',async()=>{
 const paths=[];const root=createPcObservationView({api:{get:async path=>{paths.push(path);return {ok:true,data:structuredClone(officialFixture)}}},request:()=>{throw Error('legacy fetch forbidden')}});
 assert.deepEqual(paths,[]);assert.equal(nodes(root).filter(n=>n.tag==='link').length,0);
 await click(root,'다시 조회');await click(root,'다시 조회');
 assert.deepEqual(paths,['/api/pc/status','/api/pc/status']);assert.match(status(root),/6개 항목/);
 assert.match(root.textContent,/200ms/);assert.match(root.textContent,/앱 위치 디스크/);assert.match(root.textContent,/합산/);assert.match(root.textContent,/5,000건/);assert.match(root.textContent,/링크 Up 수 아님/);assert.match(root.textContent,/직전 조회 대비/);
 assert.doesNotMatch(root.textContent,/500ms|10,000|시스템 디스크/);
 const filter=nodes(root).find(n=>n.tag==='select');filter.value='security';filter.listeners.change();assert.doesNotMatch(history(root).textContent,/CPU 사용률/);
 click(root,'조회 기록 지우기');assert.equal(history(root).children.length,0);
});
test('official unavailable/malformed metrics stay unknown and extra response data never appears',async()=>{
 const data=structuredClone(officialFixture);data.metrics.cpu.sampleMs=500;data.metrics.events.sampleLimit=10000;data.metrics.network.interfaceCount=-1;data.metrics.firewall={state:'unavailable',reason:'permission_denied',private:'DO_NOT_DISPLAY'};data.secret='DO_NOT_DISPLAY';
 const root=createPcObservationView({api:{get:async()=>({ok:true,data})}});await click(root,'다시 조회');
 assert.match(status(root),/4개 항목 확인 불가/);assert.doesNotMatch(root.textContent,/DO_NOT_DISPLAY/);
});
test('official cancellation ignores late results and timeout unlocks controls',async()=>{
 for(const action of ['조회 취소','조회 기록 지우기']){
  let resolve;const root=createPcObservationView({api:{get:()=>new Promise(r=>resolve=r)}});const pending=click(root,'다시 조회');click(root,action);resolve({ok:true,data:officialFixture});await pending;assert.equal(history(root).children.length,0);
 }
 const root=createPcObservationView({timeoutMs:1,api:{get:()=>new Promise(()=>{})}});await click(root,'다시 조회');assert.match(status(root),/시간이 초과/);assert.equal(button(root,'다시 조회').disabled,false);
});
test('official unsupported/error/invalid envelope never falls back to custom API and can retry',async()=>{
 for(const first of [{ok:false,error:{code:'NOT_ALLOWED'}},{ok:false,error:{code:'TIMEOUT'}},{ok:true,data:{...officialFixture,source:'demo'}}]){
  let calls=0;const root=createPcObservationView({api:{get:async()=>calls++?{ok:true,data:officialFixture}:first},request:()=>{throw Error('no fallback')}});
  await click(root,'다시 조회');assert.equal(history(root).children.length,0);await click(root,'다시 조회');assert.equal(history(root).children.length,1);
 }
});
test('official older results are rejected and history stays bounded',async()=>{
 let data=officialFixture;const root=createPcObservationView({api:{get:async()=>({ok:true,data})}});
 for(let i=0;i<32;i++)await click(root,'다시 조회');assert.equal(history(root).children.length,30);
 data={...officialFixture,measuredAt:'2020-01-01T00:00:00Z'};await click(root,'다시 조회');assert.match(status(root),/오래된 결과/);assert.equal(history(root).children.length,30);
});

test('official student panel uses globally available layout rather than pc-status-scoped selectors',async()=>{
 const root=createPcObservationView({api:{get:async()=>({ok:true,data:officialFixture})}});await click(root,'다시 조회');
 const all=nodes(root);assert.equal(all.filter(n=>n.className==='grid-2').length,1);
 assert.equal(all.filter(n=>n.tag==='article'&&n.className.split(' ').includes('card')).length,6);
 assert.equal(all.filter(n=>n.tag==='strong'&&n.className.includes('item-title')).length,6);
 assert.equal(history(root).className,'pc-history records');assert.equal(history(root).children[0].className,'event');
 assert.equal(all.some(n=>n.className==='pc-actions row'),true);
 assert.equal(all.some(n=>n.className==='pc-metrics'),false);
 assert.equal(all.some(n=>n.tag==='link'),false);
 const {readFile}=await import('node:fs/promises');const css=await readFile(new URL('../on-client/public/style.css',import.meta.url),'utf8');
 for(const cls of ['grid-2','card','row','records','event','item-title','muted']) assert.match(css,new RegExp('(?:^|\\n)\\.'+cls+'\\s*\\{'));
 assert.match(css,/\.grid-2 \{ grid-template-columns: minmax\(0, 1fr\)/);
});


test('summary counts partial results and keeps evidence expanded through filter and refresh', async()=>{
 const data=structuredClone(officialFixture);data.metrics.firewall={state:'unavailable',reason:'permission_denied'};
 const root=createPcObservationView({api:{get:async()=>({ok:true,data})}});
 assert.match(root.textContent,/다시 조회를 눌러 첫 기록/);
 await click(root,'다시 조회');
 assert.match(root.textContent,/읽은 항목 5\/6 · 확인 불가 1개 · 보관 기록 1\/30회/);
 const evidence=()=>nodes(root).find(n=>n.attrs['data-metric']==='cpu').children.find(n=>n.tag==='details');
 evidence().open=true;
 const filter=nodes(root).find(n=>n.tag==='select');filter.value='unknown';filter.listeners.change();
 assert.equal(evidence().open,true);
 await click(root,'다시 조회');assert.equal(evidence().open,true);
 assert.match(root.textContent,/보관 기록 2\/30회/);
 evidence().open=false;filter.listeners.change();assert.equal(evidence().open,false);
 click(root,'조회 기록 지우기');assert.doesNotMatch(root.textContent,/읽은 항목 5/);
});


test('observations distinguish disabled profiles, partial event counts, unknowns and zero',async()=>{
 let data=structuredClone(officialFixture);data.metrics.events.truncated=true;
 const root=createPcObservationView({api:{get:async()=>({ok:true,data})}});
 const observations=()=>nodes(root).find(n=>n.attrs['aria-label']==='PC 관찰 요약');
 await click(root,'다시 조회');
 assert.match(observations().textContent,/꺼진 방화벽 프로필: private/);
 assert.match(observations().textContent,/일부 집계/);
 assert.match(observations().textContent,/비교 가능한 이전 실측이 없습니다/);
 data=structuredClone(data);data.metrics.cpu.usagePercent=30;
 data.metrics.firewall.profiles.forEach(p=>p.enabled=true);
 data.metrics.events.warningCount=0;data.metrics.events.errorCount=0;
 await click(root,'다시 조회');
 assert.match(observations().textContent,/CPU 사용률 · 직전 조회 대비 \+10\.0%p/);
 assert.match(observations().textContent,/경고 0건 · 오류 0건/);
 assert.match(observations().textContent,/0건도 이상 없음의 증거가 아닙니다/);
 assert.doesNotMatch(observations().textContent,/꺼진 방화벽 프로필: private/);
 data.metrics.firewall={state:'unavailable'};await click(root,'다시 조회');
 assert.match(observations().textContent,/방화벽 설정: 확인 불가/);
 click(root,'조회 기록 지우기');assert.equal(observations(),undefined);
});


test('filter preserves live metric nodes and interpretation details stay collapsed by default',async()=>{
 const root=createPcObservationView({api:{get:async()=>({ok:true,data:officialFixture})}});
 await click(root,'다시 조회');
 const cpu=nodes(root).find(n=>n.attrs['data-metric']==='cpu');
 const source=cpu.children.find(n=>n.tag==='details');source.open=true;
 const filter=nodes(root).find(n=>n.tag==='select');filter.value='unknown';filter.listeners.change();
 assert.equal(nodes(root).find(n=>n.attrs['data-metric']==='cpu'),cpu);
 assert.equal(source.open,true);
 assert.match(history(root).textContent,/필터 조건에 맞는 기록이 없습니다/);
 const limits=nodes(root).find(n=>n.tag==='details'&&n.children[0]?.text==='측정값을 해석할 때 알아둘 점');
 assert.ok(limits);assert.ok(!limits.open);
});
