
(function () {
   var titleEl = document.getElementsByTagName('title')[0],
       title = titleEl.innerHTML,
       counter = 0,
       ID = 0,
       focused = true;

   window.onblur = function() { focused = false; }
   window.onfocus = function() { focused = true; clearCounter();}
   document.onblur = window.onblur;
   document.onfocus = window.onfocus;

   var store = {
      s : function (key, value) {
         localStorage.setItem(key, typeof value === "object" ? JSON.stringify(value) : value);
      },
      g : function (key, json) {
         try {
            var res = localStorage.getItem(key);
            return json && res ? JSON.parse(res) : res;
         }
         catch (e) {
            return null;
         }
      }
   };

   function addCounter() {
      if(focused) return;
      titleEl.innerHTML = '(' + (++counter) + ') ' + title;
   }

   function clearCounter() {
       counter = 0;
       titleEl.innerHTML = title;
   }

   function getSize() {
      return  320 / document.body.clientWidth * 100;
   }

   function setPdWidth () {
      document.getElementById('ipbwrapper').style.width = store.g('sized') === 'sized' ? (100 - getSize()) + '%' : '100%';
   }

   window.onresize = setPdWidth;

   setPdWidth();

   var insert = document.getElementById('footer_utilities'),
       script = document.createElement('script'),
       DOMAIN = 'http://localhost:8080/';

   script.src = DOMAIN + 'socket.io/socket.io.js';

   script.onload = function () {

      var socket, input, log, login, toggle, chat, theme, size, socketEl, popup;

      login       = document.getElementById('user_link');
      input       = document.getElementById('b1o0d_input');
      socketEl    = document.getElementById('b1o0d_socket');
      chat        = document.getElementById('b1o0d_chat');
      log         = document.getElementById('b1o0d_log');
      theme       = document.getElementById('b1o0d_theme');
      size        = document.getElementById('b1o0d_size');
      toggle      = document.getElementById('b1o0d_toggle');
      popup       = document.getElementById('b1o0d_popup');
      login       = login ? login.innerHTML.split('&nbsp;')[0] : 'guest';

      window.CHATIK = input;

      function showMessage(msg) {
         if(!msg.text) return;

         if(msg.text.indexOf('socketid:') === 0) {
            ID = msg.text.slice(9);
            return;
         }

         msg.time = (new Date(+msg.time)).toString().split(' ')[4].split(':');
         msg.time = [msg.time[0], msg.time[1]].join(':');

         log.innerHTML += [
            '<div class="msg">',
               '<span class="time">'+msg.time+'</span> ',
               '<span class="name" style="color:'+msg.color+'" onclick="CHATIK.value=\'/pm '+msg.name+' \'+CHATIK.value;CHATIK.focus()">'+msg.name+'</span>: '+msg.text+
            '</div>'
         ].join('');

         log.scrollTop = log.scrollHeight;

         if(msg.name !== login) addCounter();
      }

      function send (obj) {
         socket.send(JSON.stringify(obj));
      }

      function sendMessage () {
         send({type: 'msg', text: input.value});
         input.value = '';
      }

      function toggleChat () {
         var state = chat.className.indexOf('toggled') === -1 ? 'toggled' : '';
         toggleClass(chat, 'toggled');
         toggle.innerHTML = state ? 'Развернуть' : 'Свернуть';
         store.s('toggled', state);
      }

      function themeToggle () {
         var state = chat.className.indexOf('theme') === -1;
         toggleClass(chat, 'theme');
         store.s('theme', state ? 'theme' : '');
      }

      function sizeToggle () {
         var state = chat.className.indexOf('sized') === -1;
         toggleClass(chat, 'sized');
         size.innerHTML = state ? 'Уменьшить' : 'Увеличить';
         store.s('sized', state ? 'sized' : '');
         setPdWidth();
      }

      function toggleClass (el, cls) {
         var has = el.className.indexOf(cls) !== -1;
         if (has) {
            var reg = new RegExp('(\\s|^)'+cls+'(\\s|$)');
            el.className = el.className.replace(reg,' ');
         }
         else {
            el.className += ' ' + cls;
         }
      }

      function isSocket () {
         return store.g('socket') === 'socket';
      }

      function toggleSocket () {
         store.s('socket', socketEl.checked ? 'socket' : '');
         location.reload();
      }

      function openPopup () {
         window
            .open(DOMAIN+"#"+ID, "Enemy chat",  "width=580,height=380,resizable=yes,scrollbars=no,status=no")
            .focus();

      }

      socket = io.connect(DOMAIN, {'transports': [isSocket() ? 'websocket' : 'xhr-polling']});

      socket.on('connect', function () {
         send({type: 'nickname', user: login});
         socket.on('message', function (msg) {showMessage(msg);});

         input.addEventListener('keypress', function(e) {
            if (e.which == '13') {
               e.preventDefault();
               sendMessage();
            }
         });
      });

      socket.on('error', function (err) {
         showMessage({name:'system', text: err});
      });

      socketEl.addEventListener('click', toggleSocket);
      toggle.addEventListener('click', toggleChat);
      popup.addEventListener('click', openPopup);
      theme.addEventListener('click', themeToggle);
      size.addEventListener('click', sizeToggle);

      if(store.g('toggled') !== 'toggled') toggleChat();
      if(store.g('socket') === 'socket') socketEl.checked = true;
      if(store.g('theme') === 'theme') themeToggle();
      if(store.g('sized') === 'sized') sizeToggle();
   };

   document.body.appendChild(script);

   insert.innerHTML += [
      '<div id="b1o0d_chat" class="toggled">',
         '<div id="b1o0d_options">',
            '<label title="Сокет увеличивает скорость чата, но РАБОТАЕТ НЕ У ВСЕХ!">',
               '<input id="b1o0d_socket" type="checkbox"> socket',
            '</label>',
            '<a id="b1o0d_popup">Popup</a>',
            '<a id="b1o0d_theme">Тема</a>',
            '<a id="b1o0d_size">Увеличить</a>',
            '<a id="b1o0d_toggle">Развернуть</a>',
         '</div>',
         '<div id="b1o0d_log"></div>',
         '<textarea id="b1o0d_input" placeholder="Сообщение"></textarea>',
      '</div>',

      '<style>',
         '#b1o0d_chat {position:fixed;bottom:0;right:0;background:#fff;border:1px solid #ccc;box-shadow:0 0 8px rgba(0,0,0,.35);}',
         '#b1o0d_chat {padding: 5px;z-index:10000; border: 3px solid #1492C4; border-width: 3px 0 0 3px}',
         '#b1o0d_chat a {color: #105799;cursor: pointer;}',
         '#b1o0d_log {height: 220px;width:380px;overflow-y:auto;overflow-x:hidden;text-align:left;color:#111;margin:5px 0; padding:0 5px;}',
         '#b1o0d_log .msg {font-size: 12px;border-bottom: 1px dotted #ccc;padding: 3px 0;}',
         '#b1o0d_log .msg .name {font-weight: bold;cursor:pointer;}',
         '#b1o0d_log .msg img {max-width: 200px;max-height:100px;}',
         '#b1o0d_log .msg .time {color: #819193; font-size: 11px;}',
         '#b1o0d_input {width: 100%;background: #eee; border: 1px solid #aaa; border-radius: 0;height: 21px; color: #424852;}',
         '#b1o0d_options {text-align: right;}',
         '#b1o0d_options a:before {content: "|"; color: #bbb; display: inline-block; margin: 0 5px;}',
         '#b1o0d_options label {cursor: pointer;}',
         '#b1o0d_options label input {position: relative; top: 3px;}',

         '#b1o0d_chat.toggled #b1o0d_log, .toggled input, .toggled label, .toggled textarea {display: none}',

         '#b1o0d_chat.sized {top:0;width:320px;border-top:0;}',
         '#b1o0d_chat.sized #b1o0d_log {top:25px; bottom: 50px; width:auto;margin:8px 0; padding:0 4px;position:fixed;height:auto;}',
         '#b1o0d_chat.sized #b1o0d_log .msg {font-size: 13px;}',
         '#b1o0d_chat.sized #b1o0d_input {position: fixed; bottom: 5px;width:320px;height: 40px}',

         '#b1o0d_chat.theme {background: #19191B; color: #eee}',
         '#b1o0d_chat.theme a {color: #5798D5}',
         '#b1o0d_chat.theme #b1o0d_input {color: #eee; background: #3E3E3E; border-color: #636363}',
         '#b1o0d_chat.theme .msg {border-color: #4F4F4F}',
         '#b1o0d_chat.theme #b1o0d_log {color: #eee}',
      '</style>'
   ].join("");

}());
