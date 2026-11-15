'use strict';
firebase.initializeApp(firebaseConfig);
const auth=firebase.auth(),db=firebase.firestore();
let currentUser=null,userRef=null,formationReady=false,formationRevision=null,formationLegacyRevision=null,formationModuleExists=false;
let formationSaveQueue=Promise.resolve();
const serialiseRevision=value=>JSON.stringify(value??null);
function parseFormationRecord(raw){
  const result=typeof raw==='string'?JSON.parse(raw):raw;
  if(!result||typeof result!=='object'||Array.isArray(result)||!Array.isArray(result.etudiantes))throw new Error('Les données formations sont invalides. Aucun écrasement autorisé.');
  return result;
}
async function chargerFormations(user){
  formationReady=false;
  const ref=db.collection('users').doc(user.uid);
  const primary=await ref.collection('modules').doc('formations').get();
  let raw,legacyRevision=null;
  if(primary.exists){raw=primary.data().data;}
  else{
    const legacy=await ref.collection('data').doc('main').get();
    raw=legacy.exists?legacy.data().formations:null;
    legacyRevision=serialiseRevision(raw);
  }
  const loaded=raw==null&&!primary.exists?{etudiantes:[]}:parseFormationRecord(raw);
  if(currentUser?.uid!==user.uid)return;
  DB.formations=loaded;
  userRef=ref;formationModuleExists=primary.exists;formationRevision=serialiseRevision(primary.exists?raw:null);formationLegacyRevision=legacyRevision;
  formationReady=true;
}
function formationSaveProblem(error){
  const message=document.getElementById('formation-save-error');
  message.hidden=false;message.textContent=error.message.includes('modifié')?'Les formations ont été modifiées dans une autre fenêtre. Exporte ta saisie si nécessaire, puis recharge avant de continuer.':'La sauvegarde a échoué. Tes données existantes sont conservées. Réessaie avant de quitter.';
  toast('⚠ '+message.textContent);
}
async function sauvegarderFormationsSeules(snapshot){
  if(!formationReady||!currentUser||!userRef)throw new Error('Chargement non terminé : sauvegarde bloquée.');
  const owner=currentUser.uid,reference=userRef.collection('modules').doc('formations'),legacy=userRef.collection('data').doc('main');
  try{
    await db.runTransaction(async transaction=>{
      const actual=await transaction.get(reference);
      if(currentUser?.uid!==owner||!formationReady)throw new Error('Compte modifié : sauvegarde bloquée.');
      if(actual.exists!==formationModuleExists||serialiseRevision(actual.exists?actual.data().data:null)!==formationRevision)throw new Error('Dossier modifié dans une autre fenêtre. Recharge la page.');
      if(!actual.exists){const old=await transaction.get(legacy);if(serialiseRevision(old.exists?old.data().formations:null)!==formationLegacyRevision)throw new Error('Dossier modifié dans une autre fenêtre. Recharge la page.');}
      transaction.set(reference,{data:snapshot,updatedAt:new Date().toISOString()},{merge:true});
    });
    if(currentUser?.uid!==owner)throw new Error('Compte modifié pendant la sauvegarde.');
    formationModuleExists=true;formationRevision=serialiseRevision(snapshot);formationLegacyRevision=null;
    document.getElementById('formation-save-error').hidden=true;
    return true;
  }catch(error){if(error.message.includes('modifié'))formationReady=false;formationSaveProblem(error);throw error;}
}
async function saveAll(){
  const snapshot=JSON.stringify(DB.formations),owner=currentUser?.uid;
  const operation=formationSaveQueue.then(()=>{if(currentUser?.uid!==owner)throw new Error('Compte modifié : sauvegarde bloquée.');return sauvegarderFormationsSeules(snapshot);});
  formationSaveQueue=operation.catch(()=>{});
  return operation;
}
async function sauvegarderChampSeul(name,value){
  if(name!=='formations')throw new Error('Écriture hors du module Formations refusée.');
  parseFormationRecord(value);
  const owner=currentUser?.uid;
  const operation=formationSaveQueue.then(()=>{if(currentUser?.uid!==owner)throw new Error('Compte modifié : sauvegarde bloquée.');return sauvegarderFormationsSeules(value);});
  formationSaveQueue=operation.catch(()=>{});
  try{return await operation;}catch{return false;}
}
document.getElementById('formation-login-form').onsubmit=async event=>{
  event.preventDefault();const button=document.getElementById('formation-login-button'),status=document.getElementById('formation-status');button.disabled=true;status.textContent='Connexion…';
  try{await auth.signInWithEmailAndPassword(document.getElementById('formation-email').value.trim(),document.getElementById('formation-password').value);document.getElementById('formation-password').value='';}
  catch{status.textContent='Connexion impossible. Vérifie ton e-mail et ton mot de passe.';}
  finally{button.disabled=false;}
};
async function deconnexionFormations(){await formationSaveQueue;await auth.signOut();}
auth.onAuthStateChanged(async user=>{
  currentUser=user;userRef=null;formationReady=false;DB.formations={etudiantes:[]};
  document.getElementById('formation-workspace').hidden=true;document.getElementById('formation-account').hidden=true;closeMo('formationModal');
  document.querySelectorAll('dialog').forEach(dialog=>dialog.remove());
  const login=document.getElementById('formation-login'),status=document.getElementById('formation-status');login.hidden=false;
  if(!user){status.textContent='Connecte-toi avec ton compte EMMA actuel.';return;}
  status.textContent='Chargement de tes formations…';
  try{
    await chargerFormations(user);if(currentUser?.uid!==user.uid)return;
    document.getElementById('formation-user').textContent=user.email;
    renderFormationsModule();
    login.hidden=true;document.getElementById('formation-workspace').hidden=false;document.getElementById('formation-account').hidden=false;
  }catch(error){status.textContent='Chargement impossible : '+error.message+' Recharge la page pour réessayer.';}
});
