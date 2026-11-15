const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
for(const file of ['formations-config.js','formations-runtime.js','formations.js','formations-auth.js'])new vm.Script(read(file));
for(const [file,hash] of [['facturation-reseau.html','4217e3c5343186e6c1409e620b695fc0298f07df46ec6c9ea5ce283f418c0085'],['ma-facturation.html','37e86bff21609f444f27900f9db95ebf3de6e710fc2fb683c41a67181e953d2c']]){
 const source=read(file).replace('<script src="access-gate.js?v=20261115-5"></script>',''),scripts=[...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');
 assert.equal(createHash('sha256').update(scripts).digest('hex'),hash,'Version des scripts facturation vérifiée');
 assert(source.includes('Accueil LIMAGECILS'));
}
const home=read('index.html');for(const title of ['Facturation<br> Franchise','Facturation<br> clientes','Formations'])assert(home.includes(title));
for(const target of ['facturation-reseau.html','ma-facturation.html','formations.html'])assert(fs.existsSync(path.join(root,target))&&home.includes('href="'+target+'"'));
assert(!home.includes('<iframe'));assert(!read('formations.html').includes('app-core.js'));assert(!read('formations.js').includes("'./documents/'"));
function fixture(records={}){
 const store=new Map(Object.entries(records)),writes=[],nodes=new Map();let onAuth;
 const el=()=>({hidden:false,textContent:'',value:'',style:{},classList:{add(){},remove(){}},querySelector:()=>el(),querySelectorAll:()=>[],remove(){},replaceWith(){},focus(){}});
 const node=id=>{if(!nodes.has(id))nodes.set(id,el());return nodes.get(id);};
 const doc=key=>({key,get:async()=>snapshot(key),collection:n=>({doc:id=>doc(key+'/'+n+'/'+id)})});
 const snapshot=key=>({exists:store.has(key),data:()=>store.get(key)});
 const db={collection:n=>({doc:id=>doc(n+'/'+id)}),runTransaction:async cb=>{const staged=[];await cb({get:async ref=>snapshot(ref.key),set:(ref,data,options)=>staged.push({key:ref.key,data,options})});for(const w of staged){store.set(w.key,{...(store.get(w.key)||{}),...w.data});writes.push(w);}}};
 const auth={onAuthStateChanged(fn){onAuth=fn},signOut:async()=>onAuth(null)};
 const ctx={Date,console,JSON,Math,String,Number,Object,Array,Set,Map,Promise,Error,RegExp,isNaN,parseFloat,parseInt,Uint8Array,AbortController,Blob,URL,encodeURIComponent,decodeURIComponent,setTimeout:()=>0,clearTimeout(){},localStorage:{getItem(){return null}},document:{getElementById:node,addEventListener(){},querySelectorAll:()=>[],body:{style:{}}},firebase:{initializeApp(){},auth:()=>auth,firestore:()=>db}};
 vm.createContext(ctx);vm.runInContext('const firebaseConfig={};',ctx);
 for(const file of ['formations-runtime.js','formations.js','formations-auth.js'])vm.runInContext(read(file),ctx);

 return {store,writes,nodes,ctx,login:()=>onAuth({uid:'emma',email:'fiction@example.test'}),run:code=>vm.runInContext(code,ctx)};
}
const key='users/emma/modules/formations',legacy='users/emma/data/main';
(async()=>{
 const original={etudiantes:[{id:'one',prenom:'Test',suiviFormation:{}}],extra:'CONSERVER'};
 const f=fixture({[key]:{data:JSON.stringify(original)},[legacy]:{formations:JSON.stringify({etudiantes:[{id:'old'}]}),journal:'NE PAS MODIFIER'}});
 await f.login();assert(f.nodes.get('fview-etudiantes').innerHTML.includes('Suivi des élèves'));for(const tab of ['kits','emails','planning','etudiantes'])f.run("goFTab('"+tab+"')");assert.equal(f.run('DB.formations.etudiantes[0].id'),'one');assert.equal(f.writes.length,0);
 f.run("DB.formations.etudiantes[0].prenom='Modifié'");await f.run('saveAll()');
 assert.equal(f.writes.length,1);assert.equal(f.writes[0].key,key);assert.equal(JSON.parse(f.store.get(key).data).extra,'CONSERVER');assert.equal(f.store.get(legacy).journal,'NE PAS MODIFIER');
 await assert.rejects(f.run("sauvegarderChampSeul('journal','{}')"),/refusée/);
 f.store.set(key,{data:JSON.stringify({etudiantes:[{id:'external'}]})});
 await assert.rejects(f.run('saveAll()'),/modifié/);assert.equal(JSON.parse(f.store.get(key).data).etudiantes[0].id,'external');assert.equal(f.writes.length,1);
 const fallback=fixture({[legacy]:{formations:JSON.stringify(original),journal:'CONSERVER'}});await fallback.login();assert.equal(fallback.run('DB.formations.etudiantes.length'),1);await fallback.run('saveAll()');assert.equal(fallback.writes[0].key,key);assert.equal(fallback.store.get(legacy).journal,'CONSERVER');
 const corrupt=fixture({[key]:{data:'corrompu'},[legacy]:{formations:JSON.stringify(original)}});await corrupt.login();assert.equal(corrupt.run('formationReady'),false);await assert.rejects(corrupt.run('saveAll()'));assert.equal(corrupt.writes.length,0);
 const blocked=fixture({[key]:{data:JSON.stringify(original)}});await blocked.login();blocked.run('currentUser={uid:"other"};formationReady=false;');await assert.rejects(blocked.run('saveAll()'));assert.equal(blocked.writes.length,0);
 const progress=fallback.run("getProgressionFormation(DB.formations.etudiantes[0])");assert(progress&&typeof progress==='object');
 console.log('PASS : trois rubriques, pages autonomes, scripts facturation conservés, lecture prioritaire, reprise ancienne, sauvegardes formations seules, conflit protégé, corruption bloquée et compte isolé.');
})().catch(e=>{console.error(e);process.exit(1)});
