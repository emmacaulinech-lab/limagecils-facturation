(function startLimagecilsLogin(){
  'use strict';
  const form=document.getElementById('access-form'),button=document.getElementById('access-submit'),status=document.getElementById('access-status');
  const ticketKey='limagecils_navigation';
  let validatedUid=null,continuationUid=null;
  function announce(connected,user=null,fresh=false){
    if(window.parent!==window)window.parent.postMessage({type:'limagecils:session',connected,uid:connected?user?.uid:null,email:connected?user?.email:null,fresh},location.origin);
    else if(connected){sessionStorage.setItem(ticketKey,JSON.stringify({path:new URL('./',location.href).pathname,uid:user.uid,created:Date.now()}));location.replace('./');}
  }
  function enterWorkspace(){localStorage.setItem('workspace_access_event',JSON.stringify({app:'limagecils',nonce:Date.now()+':'+Math.random()}));}
  function lock(){validatedUid=null;continuationUid=null;sessionStorage.removeItem(ticketKey);announce(false);status.textContent='Valide ton e-mail et ton mot de passe pour ouvrir LIMAGECILS.';}
  try{
    const ticket=JSON.parse(sessionStorage.getItem(ticketKey)||'null');sessionStorage.removeItem(ticketKey);
    const target=window.parent!==window?window.parent.location.pathname:location.pathname;
    if(ticket&&ticket.path===target&&typeof ticket.uid==='string'&&Date.now()-ticket.created>=0&&Date.now()-ticket.created<15000)continuationUid=ticket.uid;
  }catch{sessionStorage.removeItem(ticketKey);}
  document.getElementById('access-api-key').value=localStorage.getItem('anthropic_key')||'';
  enterWorkspace();
  try{
    const app=firebase.initializeApp(firebaseConfig),auth=app.auth();
    const continueSession=Boolean(continuationUid);
    const startup=auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).then(()=>{if(!continueSession)return auth.signOut();});
    startup.catch(()=>{lock();status.textContent='Impossible de préparer la connexion. Recharge la page.';});
    auth.onAuthStateChanged(user=>{
      button.disabled=false;
      if(user&&(validatedUid===user.uid||continuationUid===user.uid)){
        validatedUid=user.uid;continuationUid=null;announce(true,user);status.textContent='Connexion confirmée.';
      }else{
        validatedUid=null;continuationUid=null;announce(false);status.textContent='Valide ton e-mail et ton mot de passe pour ouvrir LIMAGECILS.';
      }
    },()=>{lock();status.textContent='Impossible de vérifier la connexion. Recharge la page.';});
    form.onsubmit=async event=>{
      event.preventDefault();if(button.disabled)return;
      const email=document.getElementById('access-email').value.trim(),password=document.getElementById('access-password').value;
      if(!email||!password){status.textContent='Renseigne ton e-mail et ton mot de passe.';return;}
      button.disabled=true;status.textContent='Connexion…';
      try{
        await startup;
        const credential=await auth.signInWithEmailAndPassword(email,password);
        validatedUid=credential.user.uid;continuationUid=null;
        const key=document.getElementById('access-api-key').value.trim();
        if(key)localStorage.setItem('anthropic_key',key);else localStorage.removeItem('anthropic_key');
        document.getElementById('access-password').value='';enterWorkspace();
        announce(true,credential.user,true);status.textContent='Connexion confirmée.';
      }catch(error){
        lock();status.textContent=error.code==='auth/too-many-requests'?'Trop de tentatives. Attends un peu avant de réessayer.':error.code==='auth/network-request-failed'?'Connexion réseau indisponible. Réessaie.':'Connexion impossible. Vérifie ton e-mail et ton mot de passe.';
      }finally{button.disabled=false;}
    };
    window.addEventListener('message',async event=>{
      if(event.origin!==location.origin||event.source!==window.parent)return;
      if(event.data?.type==='limagecils:lock'){lock();return;}
      if(event.data?.type!=='limagecils:signout')return;
      lock();try{await auth.signOut();}catch{status.textContent='Déconnexion impossible. Réessaie.';}
    });
    window.addEventListener('storage',event=>{if(event.key!=='workspace_access_event')return;try{if(JSON.parse(event.newValue||'null')?.app==='emma')lock();}catch{}});
  }catch(error){lock();status.textContent='La connexion ne peut pas démarrer. Vérifie ta connexion Internet et recharge la page.';}
})();
