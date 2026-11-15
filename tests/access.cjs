const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
for(const page of ['index.html','facturation-reseau.html','ma-facturation.html','formations.html'])assert(read(page).includes('<head><script src="access-gate.js?v=20261115-4"></script>'),'Accès direct couvert : '+page);
function gate(){
 const messages={},nodes=[],window={addEventListener:(name,fn)=>messages[name]=fn};
 const node=tag=>({tag,style:{},dataset:{},contentWindow:{postMessage(){}},appendChild(child){nodes.push(child);},hidden:false});
 const document={readyState:'complete',documentElement:node('html'),head:node('head'),body:node('body'),createElement:node};
 vm.runInNewContext(read('access-gate.js'),{document,window,location:{origin:'https://site.test'}});
 return {root:document.documentElement,nodes,message:messages.message};
}
const g=gate(),frame=g.nodes.find(n=>n.tag==='iframe'),overlay=g.nodes.find(n=>n.id==='limagecils-access-overlay');
assert.equal(g.root.dataset.limagecilsAccess,'pending');
const event={origin:'https://site.test',source:frame.contentWindow,data:{type:'limagecils:session',connected:true}};
g.message({...event,origin:'https://evil.test'});assert.equal(g.root.dataset.limagecilsAccess,'pending');
g.message({...event,source:{}});assert.equal(g.root.dataset.limagecilsAccess,'pending');
g.message(event);assert.equal(g.root.dataset.limagecilsAccess,'ready');assert.equal(overlay.style.display,'none');
g.message({...event,data:{type:'limagecils:session',connected:false}});assert.equal(g.root.dataset.limagecilsAccess,'pending');assert.equal(overlay.style.display,'block');
function authFixture(fail=false){
 const nodes=new Map(),sent=[],listeners={};let onAuth,signouts=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',disabled:true});return nodes.get(id);};
 const parent={postMessage(data,origin){sent.push({data,origin});}};
 const auth={onAuthStateChanged(fn){onAuth=fn;},async signInWithEmailAndPassword(email,password){assert.equal(email,'test@example.test');assert.equal(password,'fiction');if(fail)throw {code:'auth/invalid-credential'};onAuth({uid:'test'});},async signOut(){signouts++;onAuth(null);}};
 const ctx={document:{getElementById:node},firebaseConfig:{},firebase:{initializeApp:()=>({auth:()=>auth})},location:{origin:'https://site.test'},window:{parent,addEventListener:(name,fn)=>listeners[name]=fn}};
 vm.runInNewContext(read('access-auth.js'),ctx);
 return {nodes,sent,parent,listeners,node,onAuth,signouts:()=>signouts};
}
(async()=>{
 const a=authFixture();a.onAuth(null);assert.equal(a.sent.at(-1).data.connected,false);a.node('access-email').value=' test@example.test ';a.node('access-password').value='fiction';
 await a.node('access-form').onsubmit({preventDefault(){}});assert.equal(a.sent.at(-1).data.connected,true);assert.equal(a.node('access-password').value,'');assert(!JSON.stringify(a.sent).includes('fiction'));
 await a.listeners.message({origin:'https://evil.test',source:a.parent,data:{type:'limagecils:signout'}});assert.equal(a.signouts(),0);
 await a.listeners.message({origin:'https://site.test',source:a.parent,data:{type:'limagecils:signout'}});assert.equal(a.signouts(),1);assert.equal(a.sent.at(-1).data.connected,false);
 const b=authFixture(true);b.onAuth(null);b.node('access-email').value='test@example.test';b.node('access-password').value='fiction';await b.node('access-form').onsubmit({preventDefault(){}});assert.equal(b.sent.at(-1).data.connected,false);assert.match(b.node('access-status').textContent,/impossible/);
 console.log('PASS : quatre entrées couvertes, écran fermé par défaut, session vérifiée, messages étrangers rejetés, connexion, erreur et déconnexion.');
})().catch(error=>{console.error(error);process.exit(1)});
