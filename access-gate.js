(function requireLimagecilsSession(){
  'use strict';
  const root=document.documentElement;
  root.dataset.limagecilsAccess='pending';
  const style=document.createElement('style');
  style.textContent='html[data-limagecils-access="pending"] body>*:not(#limagecils-access-overlay){display:none!important}#limagecils-access-overlay{position:fixed;inset:0;z-index:2147483647;background:#fcf9fa}#limagecils-access-overlay iframe{width:100%;height:100%;border:0;display:block}.limagecils-access-logout{position:fixed;bottom:18px;left:18px;z-index:10001;border:1px solid #ead5de;border-radius:30px;background:#fff9fc;color:#7a3d5a;padding:12px 16px;cursor:pointer;font:600 12px sans-serif}@media print{.limagecils-access-logout{display:none!important}}';
  document.head.appendChild(style);
  function mount(){
    const overlay=document.createElement('div');overlay.id='limagecils-access-overlay';
    const frame=document.createElement('iframe');frame.title='Connexion à LIMAGECILS';frame.src='access.html?v=20261115-5';
    const logout=document.createElement('button');logout.type='button';logout.className='limagecils-access-logout';logout.textContent='Déconnexion';
    logout.onclick=()=>frame.contentWindow.postMessage({type:'limagecils:signout'},location.origin);
    let identity=null;
    const ticketKey='limagecils_navigation',base=new URL('./',location.href);
    function ticket(path){if(identity)sessionStorage.setItem(ticketKey,JSON.stringify({path,uid:identity.uid,created:Date.now()}));}
    function conceal(){identity=null;root.dataset.limagecilsAccess='pending';overlay.style.display='block';logout.hidden=true;}
    document.addEventListener('click',event=>{
      const link=event.target.closest?.('a[href]');
      if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
      const target=new URL(link.href,location.href);
      if(target.origin===location.origin&&target.pathname.startsWith(base.pathname)){
        const page=target.pathname.slice(base.pathname.length);
        if(/^(?:index\.html|formations\.html|ma-facturation\.html|facturation-reseau\.html)?$/.test(page))ticket(target.pathname);
      }else sessionStorage.removeItem(ticketKey);
    },true);
    window.addEventListener('pagehide',conceal);
    window.addEventListener('pageshow',event=>{if(event.persisted){conceal();sessionStorage.removeItem(ticketKey);frame.contentWindow.postMessage({type:'limagecils:lock'},location.origin);}});
    window.addEventListener('message',event=>{
      if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='limagecils:session')return;
      const connected=event.data.connected===true&&typeof event.data.uid==='string';
      if(!connected){conceal();return;}
      identity={uid:event.data.uid};
      // Le rechargement initialise les outils avec le compte qui vient d'être
      // confirmé, sans laisser apparaître les données d'une ancienne session.
      if(event.data.fresh&&/\/(?:formations|ma-facturation|facturation-reseau)\.html$/.test(location.pathname)){
        ticket(location.pathname);location.reload();return;
      }
      root.dataset.limagecilsAccess='ready';overlay.style.display='none';logout.hidden=false;
    });
    overlay.appendChild(frame);document.body.appendChild(overlay);document.body.appendChild(logout);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
