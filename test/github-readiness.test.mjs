import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGithubReadinessView} from '../on-client/student/extension.mjs';
test('disconnected GitHub never requests data, accepts secrets, or invents successful values',()=>{
 const previousDocument=globalThis.document, previousFetch=globalThis.fetch;
 class El { constructor(tag){this.tag=tag;this.children=[];this.text='';}set textContent(v){this.text=v;}get textContent(){return this.text+this.children.map(n=>n.textContent).join(' ');}append(...nodes){this.children.push(...nodes);}setAttribute(){} }
 globalThis.document={createElement:tag=>new El(tag)};
 globalThis.fetch=()=>{throw Error('external request forbidden');};
 try {
  const root=createGithubReadinessView();const all=n=>[n,...n.children.flatMap(all)];
  assert.match(root.textContent,/연결 전 · 확인 불가/);
  for(const text of ['저장소 변경','월 비용','계정 보안','미조회','다음 단계'])assert.ok(root.textContent.includes(text));
  assert.doesNotMatch(root.textContent,/0원|안전|정상|연결 완료/);
  assert.equal(all(root).some(n=>['input','button','iframe','script','link'].includes(n.tag)),false);
 }finally{globalThis.document=previousDocument;globalThis.fetch=previousFetch;}
});
