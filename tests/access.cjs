const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
for(const page of ['index.html','facturation-reseau.html','ma-facturation.html','formations.html'])assert(read(page).includes('<head><script src="access-gate.js?v=20261115-5"></script>'));
assert(read('access.html').includes('id="access-api-key"'));
function memory(initial={}){const m=new Map(Object.entries(initial));return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),m};}
function gate(page=''){
 const handlers={},docHandlers={},nodes=[],sessionStorage=memory();let reloads=0;
 const node=tag=>({tag,style:{},dataset:{},contentWindow:{postMessage(){}},appendChild(child){nodes.push(child);},hidden:false});
 const document={readyState:'complete',documentElement:node('html'),head:node('head'),body:node('body'),createElement:node,addEventListener:(name,fn)=>docHandlers[name]=fn};
 const location={href:'https://site.test/limagecils-facturation/'+page,origin:'https://site.test',pathname:'/limagecils-facturation/'+page,reload(){reloads++;}};
 vm.runInNewContext(read('access-gate.js'),{document,window:{addEventListener:(name,fn)=>handlers[name]=fn},location,URL,Date,sessionStorage});
 return {root:document.documentElement,nodes,handlers,docHandlers,sessionStorage,reloads:()=>reloads};
}
const g=gate(),frame=g.nodes.find(n=>n.tag==='iframe');
const event={origin:'https://site.test',source:frame.contentWindow,data:{type:'limagecils:session',connected:true,uid:'test'}};
g.handlers.message({...event,origin:'https://evil.test'});assert.equal(g.root.dataset.limagecilsAccess,'pending');g.handlers.message({...event,source:{}});assert.equal(g.root.dataset.limagecilsAccess,'pending');
g.handlers.message(event);assert.equal(g.root.dataset.limagecilsAccess,'ready');
g.docHandlers.click({target:{closest:()=>({href:'https://site.test/limagecils-facturation/formations.html',target:'',hasAttribute:()=>false})}});assert.equal(JSON.parse(g.sessionStorage.getItem('limagecils_navigation')).path,'/limagecils-facturation/formations.html');
g.handlers.pagehide();assert.equal(g.root.dataset.limagecilsAccess,'pending');g.handlers.pageshow({persisted:true});assert.equal(g.sessionStorage.getItem('limagecils_navigation'),null);
const direct=gate('formations.html'),directFrame=direct.nodes.find(n=>n.tag==='iframe');direct.handlers.message({...event,source:directFrame.contentWindow,data:{...event.data,fresh:true}});assert.equal(direct.reloads(),1);assert.equal(direct.root.dataset.limagecilsAccess,'pending');
function authFixture({fail=false,ticket=null,path='/limagecils-facturation/'}={}){
 const nodes=new Map(),sent=[],listeners={},sessionStorage=memory(ticket?{limagecils_navigation:JSON.stringify(ticket)}:{}),localStorage=memory({anthropic_key:'saved-fiction-key'});let onAuth,signouts=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',disabled:true});return nodes.get(id);};
 const parent={location:{pathname:path},postMessage(data,origin){sent.push({data,origin});}};
 const user={uid:'test',email:'test@example.test'};
 const auth={setPersistence:async mode=>{assert.equal(mode,"session")},onAuthStateChanged(fn){onAuth=fn;},async signInWithEmailAndPassword(email,password){assert.equal(email,user.email);assert.equal(password,'fiction');if(fail)throw {code:'auth/invalid-credential'};onAuth(user);return {user};},async signOut(){signouts++;onAuth(null);}};
 const ctx={document:{getElementById:node},firebaseConfig:{},firebase:{auth:{Auth:{Persistence:{SESSION:"session"}}},initializeApp:()=>({auth:()=>auth})},location:{origin:'https://site.test',pathname:path,href:'https://site.test'+path},window:{parent,addEventListener:(name,fn)=>listeners[name]=fn},localStorage,sessionStorage,Date,Math,URL};
 vm.runInNewContext(read('access-auth.js'),ctx);return {sent,parent,listeners,node,onAuth,user,localStorage,sessionStorage,signouts:()=>signouts};
}
(async()=>{
 const a=authFixture();a.onAuth(a.user);assert.equal(a.sent.at(-1).data.connected,false,'Un compte mémorisé ne suffit jamais');assert.equal(a.node('access-api-key').value,'saved-fiction-key');
 a.node('access-email').value=' test@example.test ';a.node('access-password').value='fiction';a.node('access-api-key').value='new-fiction-key';await a.node('access-form').onsubmit({preventDefault(){}});
 assert.equal(a.sent.at(-1).data.connected,true);assert.equal(a.sent.at(-1).data.fresh,true);assert.equal(a.node('access-password').value,'');assert.equal(a.localStorage.getItem('anthropic_key'),'new-fiction-key');assert(!JSON.stringify(a.sent).includes('fiction'));
 a.listeners.storage({key:'workspace_access_event',newValue:JSON.stringify({app:'emma'})});assert.equal(a.sent.at(-1).data.connected,false,'Passer à EMMA referme LIMAGECILS');
 await a.listeners.message({origin:'https://site.test',source:a.parent,data:{type:'limagecils:signout'}});assert.equal(a.signouts(),2);
 const b=authFixture({fail:true});b.onAuth(b.user);b.node('access-email').value='test@example.test';b.node('access-password').value='fiction';b.node('access-api-key').value='must-not-save';await b.node('access-form').onsubmit({preventDefault(){}});assert.equal(b.sent.at(-1).data.connected,false);assert.equal(b.localStorage.getItem('anthropic_key'),'saved-fiction-key');
 const ticket={path:'/limagecils-facturation/formations.html',uid:'test',created:Date.now()};
 const c=authFixture({ticket,path:ticket.path});c.onAuth(c.user);assert.equal(c.sent.at(-1).data.connected,true);assert.equal(c.sessionStorage.getItem('limagecils_navigation'),null,'Continuation à usage unique');
 for(const invalid of [{...ticket,created:Date.now()-20000},{...ticket,uid:'other'},{...ticket,path:'/other'}]){const d=authFixture({ticket:invalid,path:ticket.path});d.onAuth(d.user);assert.equal(d.sent.at(-1).data.connected,false);}
 console.log('PASS : ancien compte refusé, mot de passe vérifié, clé API, échec sans sauvegarde, changement de logiciel verrouillé, continuation interne courte et unique, rechargement et retour verrouillés.');
})().catch(error=>{console.error(error);process.exit(1)});
