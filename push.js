/* Уведомления о новых объектах для тех, кто добавил сайт на экран «Домой». Работает только если на сервере включены уведомления. */
(function(){
  if(!('serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window))return;
  var store={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  var standalone=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
  var KEY=null;
  function u8(b){b=b.replace(/-/g,'+').replace(/_/g,'/');while(b.length%4)b+='=';var s=atob(b),a=new Uint8Array(s.length);for(var i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a}
  function post(url,body){return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}
  function getKey(){
    if(KEY!==null)return Promise.resolve(KEY);
    return fetch('/api/push/key',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(j){KEY=j&&j.ok?j.key:'';return KEY}).catch(function(){KEY='';return KEY});
  }
  function current(){return navigator.serviceWorker.getRegistration('/').then(function(r){return r?r.pushManager.getSubscription():null})}
  function subscribe(){
    return getKey().then(function(k){
      if(!k)throw new Error('off');
      return Notification.requestPermission().then(function(p){
        if(p!=='granted')throw new Error('denied');
        return navigator.serviceWorker.register('/sw.js');
      }).then(function(){return navigator.serviceWorker.ready}).then(function(reg){
        return reg.pushManager.getSubscription().then(function(s){return s||reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(k)})});
      }).then(function(s){return post('/api/push/subscribe',s.toJSON()).then(function(r){if(!r.ok)throw new Error('save')})});
    });
  }
  function unsubscribe(){
    return current().then(function(s){if(!s)return;return post('/api/push/subscribe',{action:'unsubscribe',endpoint:s.endpoint}).catch(function(){}).then(function(){return s.unsubscribe()})});
  }
  var buttons=[].slice.call(document.querySelectorAll('[data-push-toggle]'));
  function paint(on){
    buttons.forEach(function(b){b.hidden=false;b.textContent=on?'🔔 Уведомления включены. Отключить':'🔔 Получать уведомления о новых объектах';b.dataset.on=on?'1':''});
  }
  function banner(){
    if(!standalone||Notification.permission!=='default'||store.get('city_push_dismissed'))return;
    var el=document.createElement('div');el.className='push-banner';el.setAttribute('role','dialog');
    el.innerHTML='<p>Узнавайте о новых объектах первыми: включить уведомления?</p><div><button type="button" class="pb-yes">Включить</button><button type="button" class="pb-no">Не сейчас</button></div>';
    document.body.appendChild(el);
    el.querySelector('.pb-no').onclick=function(){store.set('city_push_dismissed','1');el.remove()};
    el.querySelector('.pb-yes').onclick=function(){subscribe().then(function(){paint(true)}).catch(function(){store.set('city_push_dismissed','1')}).then(function(){el.remove()})};
  }
  function init(){
    getKey().then(function(k){
      if(!k)return;
      current().then(function(s){
        if(buttons.length)paint(!!s&&Notification.permission==='granted');
        if(!s)banner();
      }).catch(function(){});
    });
  }
  buttons.forEach(function(b){
    b.addEventListener('click',function(){
      b.disabled=true;
      var on=b.dataset.on==='1';
      (on?unsubscribe():subscribe()).then(function(){paint(!on)}).catch(function(e){
        if(e&&e.message==='denied')alert('Уведомления запрещены в настройках браузера или телефона. Разрешите их для сайта и попробуйте снова.');
        else alert('Не удалось изменить настройку. Попробуйте позже.');
      }).then(function(){b.disabled=false});
    });
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
