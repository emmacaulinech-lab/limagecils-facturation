const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../facturation-reseau.html'),'utf8');
const setup=html.slice(html.indexOf('  let franchiseSessionReady='),html.indexOf('  window._fbSignOut'));
const observer=html.slice(html.indexOf('  function afficherSessionFranchise'),html.indexOf('  onAuthStateChanged(auth,afficherSessionFranchise);'))+'\nonAuthStateChanged(auth,afficherSessionFranchise);';
let release,callback,loads=0;const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{style:{display:'none'},textContent:''});return nodes.get(id);};
const auth={currentUser:{uid:'cached',email:'old@example.test'}};
const ctx={auth,window:{chargerDepuisFirebase(){loads++;}},document:{getElementById:node},onAuthStateChanged(a,fn){callback=fn;},signOut:()=>new Promise(resolve=>release=()=>{auth.currentUser=null;resolve();}),signInWithEmailAndPassword:async()=>{const user={uid:'fresh',email:'fresh@example.test'};auth.currentUser=user;callback(user);return {user};}};
vm.createContext(ctx);vm.runInContext(setup+observer,ctx);
(async()=>{callback(auth.currentUser);assert.equal(loads,0);release();await vm.runInContext('franchiseStartup',ctx);assert.equal(node('login-screen').style.display,'flex');assert.equal(loads,0);await ctx.window._fbSignIn(auth,'fresh@example.test','fiction');assert.equal(loads,1);assert.equal(node('user-email-display').textContent,'fresh@example.test');console.log('PASS : la facturation Franchise ignore le compte mémorisé et ne charge qu’après une nouvelle connexion.');})().catch(error=>{console.error(error);process.exit(1)});
