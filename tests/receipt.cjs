const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
async function test(genre,scenario){
 const html=fs.readFileSync(`${__dirname}/../carnet-${genre}.html`,'utf8');
 for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
 const fn=html.slice(html.indexOf('async function sendToDrive(){'),html.indexOf('\nrestore();',html.indexOf('async function sendToDrive(){')));
 const nodes={sendButton:{},sendButtonTop:genre==='graphique'?{}:null,driveNotice:{setAttribute(){}}};
 let calls=0,release;
 const ctx={APPS_SCRIPT_URL:'https://example.invalid/exec',state:{fields:{nom:'TEST',prenom:'TEST',classe:'TEST'}},saveNow(){},toast(){},document:{getElementById:id=>nodes[id]},filename:()=> 'test.html',makeStandalone:()=>'<html></html>',URLSearchParams,AbortController,setTimeout:()=>1,clearTimeout(){},fetch:async()=>{
  calls++;
  if(scenario==='duplicate')await new Promise(r=>release=r);
  if(scenario==='network')throw Error('network');
  return {ok:scenario!=='http',json:async()=>{
   if(scenario==='json')throw Error('invalid JSON');
   const receipt={success:true,fileId:'receipt-id',filename:'test.html'};
   if(scenario==='missing-id')delete receipt.fileId;
   if(scenario==='wrong-file')receipt.filename='other.html';
   if(scenario==='server-error')receipt.success=false;
   return receipt;
  }};
 }};
 vm.createContext(ctx);vm.runInContext(fn,ctx);
 if(scenario==='identity')ctx.state.fields.nom='';
 const first=ctx.sendToDrive();
 if(scenario==='duplicate'){await ctx.sendToDrive();assert.equal(calls,1);release();}
 await first;
 if(['success','duplicate'].includes(scenario))assert.match(nodes.driveNotice.textContent,/receipt-id/);
 else if(scenario==='identity')assert.equal(calls,0);
 else {assert.match(nodes.driveNotice.textContent,/non confirmé/);assert.notEqual(nodes.sendButton.textContent,'✓ Carnet rendu');}
 if(scenario!=='identity')assert.equal(nodes.sendButton.disabled,false);
 console.log(`PASS ${genre}: ${scenario}`);
}
(async()=>{for(const genre of ['narratif','graphique'])for(const scenario of ['success','network','http','json','missing-id','wrong-file','server-error','identity','duplicate'])await test(genre,scenario);})();
