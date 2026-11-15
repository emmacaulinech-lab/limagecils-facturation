'use strict';
const DB={formations:{etudiantes:[]}};
const MOIS=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const NOW=new Date();
const STATUTS_FORMATION=['Inscrite','Mail kit envoyé','Kit choisi','Kit payé','Kit préparé'];
const STATUT_COLORS={'Inscrite':'#4a78c8','Mail kit envoyé':'#c89040','Kit choisi':'#8b6fff','Kit payé':'#5a8a6a','Kit préparé':'#5A8A6A'};
function fa(n){return n==null||isNaN(n)?'—':Math.abs(n).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';}
function dlbl(d){return new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'2-digit'});}
function dm(d){return d.slice(0,7);}
function genId(){return Date.now()+'-'+Math.random().toString(36).slice(2,8);}
function dateLocaleISO(date=new Date()){return date.toLocaleDateString('fr-CA');}
function closeMo(id){document.getElementById(id)?.classList.remove('open');}
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3000);}
function actualiserNotificationsFormation(){}
// EMMA lit les mêmes formations pour son planning. LIMAGECILS ne charge ni
// ne modifie le Journal personnel ; son recalcul reste exécuté dans EMMA.
async function actualiserPlanningAutomatiqueEmma(){return true;}
let operationsImportFormation=0;
async function fetchIAAvecLoaderEmma(url,options){
  operationsImportFormation++;
  document.body.style.cursor='progress';
  const controller=options?.signal?null:new AbortController();
  const timeout=controller?setTimeout(()=>controller.abort(),120000):null;
  try{return await fetch(url,{...options,...(controller?{signal:controller.signal}:{})});}
  finally{if(timeout)clearTimeout(timeout);if(--operationsImportFormation===0)document.body.style.cursor='';}
}
function ouvrirParametresImport(){
  const dialog=document.createElement('dialog');dialog.className='mb';
  dialog.innerHTML='<h2>Import du planning PDF</h2><p>L’import utilise ta connexion IA existante. La clé reste dans le navigateur, comme dans EMMA.</p><form method="dialog"><label>Clé de connexion<input type="password" autocomplete="off" id="formation-import-key" style="width:100%"></label><div class="ma"><button class="btn bg" value="cancel">Annuler</button><button class="btn bd" value="save">Enregistrer</button></div></form>';
  document.body.appendChild(dialog);
  dialog.querySelector('input').value=localStorage.getItem('anthropic_key')||'';
  dialog.addEventListener('close',()=>{if(dialog.returnValue==='save'){const key=dialog.querySelector('input').value.trim();if(key)localStorage.setItem('anthropic_key',key);else localStorage.removeItem('anthropic_key');toast('Connexion d’import mise à jour');}dialog.remove();});
  dialog.showModal();
}
function exportFormationsBackup(){
  const blob=new Blob([JSON.stringify({dateExport:new Date().toISOString(),formations:DB.formations},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='LIMAGECILS_FORMATIONS_'+dateLocaleISO()+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMo('formationModal');});
