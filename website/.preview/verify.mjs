import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const root = path.resolve('website');
const target = await fetch('http://127.0.0.1:9337/json/new?about:blank', { method:'PUT' }).then(r => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject) => { socket.onopen=resolve;socket.onerror=reject; });
let seq=0;const pending=new Map();
socket.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id&&pending.has(msg.id)){const pair=pending.get(msg.id);pending.delete(msg.id);if(msg.error)pair.reject(new Error(msg.error.message));else pair.resolve(msg.result)}};
function call(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));})}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
await call('Page.enable');await call('Runtime.enable');
await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
const results=[];
try {
for(const width of [1440,390,320]){
 await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
 for(const page of ['index.html','about.html','packages.html','contact.html']){
  await call('Page.navigate',{url:pathToFileURL(path.join(root,page)).href});
  await new Promise(r=>setTimeout(r,700));
  await evaluate(`Promise.all(Array.from(document.images).filter(i=>i.loading!=='lazy').map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=r;i.onerror=r})))`);
  const info=await evaluate(`({title:document.title,width:innerWidth,scroll:document.documentElement.scrollWidth,images:Array.from(document.images).map(i=>({src:i.getAttribute('src'),loaded:i.naturalWidth>0})),headings:document.querySelectorAll('h1').length,errors:Array.from(document.querySelectorAll('script[src]')).map(s=>s.src)})`);
  assert.equal(info.headings,1,`${page}: one H1`);assert.ok(info.scroll<=info.width,`${page} overflows at ${width}: ${info.scroll}`);assert.ok(info.images.every(i=>i.loaded),`${page}: broken image`);
  if(page==='packages.html'){
   const checks=await evaluate(`(()=>{const search=document.querySelector('#package-search'),language=document.querySelector('#language-filter'),quality=document.querySelector('#quality-filter');const count=()=>document.querySelectorAll('[data-package-index]:not([hidden])').length;const all=count();search.value='Vijay';search.dispatchEvent(new Event('input'));const vijay=count();search.value='this channel does not exist';search.dispatchEvent(new Event('input'));const empty=count()===0&&!document.querySelector('.empty-results').hidden;document.querySelector('.reset-filters').click();language.value='Tamil';language.dispatchEvent(new Event('change'));quality.value='HD';quality.dispatchEvent(new Event('change'));const hd=count();document.querySelector('.reset-filters').click();document.querySelector('details').open=true;const detailVisible=document.querySelector('.channel-list').offsetHeight>0;return {all,vijay,empty,hd,reset:count(),detailVisible,data:window.TCV_PACKAGES?.length}})()`);
   assert.equal(checks.all,18);assert.equal(checks.data,18);assert.ok(checks.vijay>0&&checks.vijay<18);assert.ok(checks.empty);assert.equal(checks.hd,3);assert.equal(checks.reset,18);assert.ok(checks.detailVisible);
  }
  if(page==='contact.html'){
   const validation=await evaluate(`(()=>{const f=document.querySelector('form');const before=f.checkValidity();f.querySelector('#name').value='Browser review';f.querySelector('#phone').value='9999999999';f.querySelector('#service').value='Internet';f.querySelector('#message').value='Availability enquiry';const noConsent=f.checkValidity();f.querySelector('[name=consent]').checked=true;return {before,noConsent,valid:f.checkValidity()}})()`);
   assert.equal(validation.before,false);assert.equal(validation.noConsent,false);assert.equal(validation.valid,true);
  }
  if(width<850){const mobile=await evaluate(`(()=>{const b=document.querySelector('.menu-toggle');b.click();const open=b.getAttribute('aria-expanded')==='true'&&document.querySelector('nav').classList.contains('open');document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));return {open,closed:b.getAttribute('aria-expanded')==='false'}})()`);assert.ok(mobile.open&&mobile.closed);}
  results.push({page,width,passed:true});
  if(width===1440||width===390){const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(root,'.preview',`${page.replace('.html','')}-${width}.png`),Buffer.from(shot.data,'base64'));}
 }
}
await call('Page.navigate',{url:pathToFileURL(path.join(root,'contact.html')).href+'?service=Cable%20TV&package=Super%20Star%20Pack'});
await new Promise(r=>setTimeout(r,600));
assert.deepEqual(await evaluate(`({service:document.querySelector('#service').value,pack:document.querySelector('#package').value})`),{service:'Cable TV',pack:'Super Star Pack'});
await call('Emulation.setScriptExecutionDisabled',{value:true});
for(const page of ['contact.html','packages.html']){
 await call('Page.navigate',{url:pathToFileURL(path.join(root,page)).href});await new Promise(r=>setTimeout(r,500));
 const fallback=await evaluate(`({navigation:document.querySelector('nav').offsetHeight>0,formHidden:!document.querySelector('#enquiry-form')||getComputedStyle(document.querySelector('#enquiry-form')).display==='none',packageCount:document.querySelectorAll('[data-package-index]:not([hidden])').length,hasFallback:Array.from(document.querySelectorAll('noscript')).some(n=>n.textContent.trim().length>0)})`);
 assert.ok(fallback.navigation&&fallback.formHidden&&fallback.hasFallback);if(page==='packages.html')assert.equal(fallback.packageCount,18);
}
console.log(JSON.stringify({passed:results.length,layouts:results,packageFilters:'passed',mobileMenu:'passed',contactValidation:'passed',enquiryPrefill:'passed',noJavaScriptFallback:'passed'},null,2));
}finally{socket.close();await fetch(`http://127.0.0.1:9337/json/close/${target.id}`);}
