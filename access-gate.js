(function requireLimagecilsSession(){
  'use strict';
  const root=document.documentElement;
  root.dataset.limagecilsAccess='pending';
  const style=document.createElement('style');
  style.textContent='html[data-limagecils-access="pending"] body>*:not(#limagecils-access-overlay){display:none!important}#limagecils-access-overlay{position:fixed;inset:0;z-index:2147483647;background:#fcf9fa}#limagecils-access-overlay iframe{width:100%;height:100%;border:0;display:block}.limagecils-access-logout{position:fixed;bottom:18px;left:18px;z-index:10001;border:1px solid #ead5de;border-radius:30px;background:#fff9fc;color:#7a3d5a;padding:12px 16px;cursor:pointer;font:600 12px sans-serif}@media print{.limagecils-access-logout{display:none!important}}';
  document.head.appendChild(style);
  function mount(){
    const overlay=document.createElement('div');overlay.id='limagecils-access-overlay';
    const frame=document.createElement('iframe');frame.title='Connexion à LIMAGECILS';frame.src='access.html?v=20261115-4';
    const logout=document.createElement('button');logout.type='button';logout.className='limagecils-access-logout';logout.textContent='Déconnexion';
    logout.onclick=()=>frame.contentWindow.postMessage({type:'limagecils:signout'},location.origin);
    window.addEventListener('message',event=>{
      if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='limagecils:session')return;
      const connected=event.data.connected===true;
      root.dataset.limagecilsAccess=connected?'ready':'pending';
      overlay.style.display=connected?'none':'block';
      logout.hidden=!connected;
    });
    overlay.appendChild(frame);document.body.appendChild(overlay);document.body.appendChild(logout);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
