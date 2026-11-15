(function startLimagecilsLogin(){
  'use strict';
  const form=document.getElementById('access-form'),button=document.getElementById('access-submit'),status=document.getElementById('access-status');
  function announce(connected){
    if(window.parent!==window)window.parent.postMessage({type:'limagecils:session',connected},location.origin);
    else if(connected)location.replace('./');
  }
  try{
    const app=firebase.initializeApp(firebaseConfig),auth=app.auth();
    auth.onAuthStateChanged(user=>{
      announce(Boolean(user));button.disabled=false;
      status.textContent=user?'Connexion réussie.':'Connecte-toi pour ouvrir LIMAGECILS.';
    },()=>{announce(false);status.textContent='Impossible de vérifier la connexion. Recharge la page.';});
    form.onsubmit=async event=>{
      event.preventDefault();button.disabled=true;status.textContent='Connexion…';
      try{
        await auth.signInWithEmailAndPassword(document.getElementById('access-email').value.trim(),document.getElementById('access-password').value);
        document.getElementById('access-password').value='';
      }catch(error){
        announce(false);
        status.textContent=error.code==='auth/too-many-requests'?'Trop de tentatives. Attends un peu avant de réessayer.':error.code==='auth/network-request-failed'?'Connexion réseau indisponible. Réessaie.':'Connexion impossible. Vérifie ton e-mail et ton mot de passe.';
      }finally{button.disabled=false;}
    };
    window.addEventListener('message',async event=>{
      if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='limagecils:signout')return;
      try{await auth.signOut();announce(false);}
      catch{status.textContent='Déconnexion impossible. Réessaie.';}
    });
  }catch(error){announce(false);status.textContent='La connexion ne peut pas démarrer. Vérifie ta connexion Internet et recharge la page.';}
})();
