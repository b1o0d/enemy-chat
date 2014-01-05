var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    port = 8080,
    url = 'http://localhost:' + port + '/';

app.use(express.static(__dirname + '/public'));
server.listen(port);

io.set('log level', 1);

var users = {},
    banned = [],
    history = [],
    SYSTEM = ' ( ͡° ͜ʖ ͡°)=ε/̵͇̿̿/’̿’̿ ̿ ̿̿ ̿̿';

var HELPS = [
   '<br><b>/users</b> - список всех пользователей чата',
   '<b>/smiles</b> - список доступных смайлов',
   '<b>/pm userName text</b> - личные сообщения',
   '<b>/color #123ABC</b> - цвет ника'
];

var READY = false;

var SECRET_WORD = "СЕКРЕТНОЕ_СЛОВО";

setTimeout(function () {READY = true}, 1000 * 60);

var smiles = [
   'petro','buba','avtorklif','rickroll',
   'mameprivet','vihui','zloy','trollface','fffuuu','palevo','lol',
   'sosew','geys','hmm','nate','vaunew','clown','fuckyea',
   'smile','sad','dunno','subj','dance','xdnew','avtoradolf','opasnoste',
   'pidorasy','metalhead','snobuedance','nono','wizard','spydance',
   'newcry','spasibo_podrochil','palevojein','ohmy', 'ispug',
   'yes','ohpalevo','parovozdjan','ginsgnil','geypalevonew','shok',
   'yazik','shaytan','spy','metal','fie','huyase',
   'boss','lostneprowaet','bayan','perec','prayy'
];


var allowFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];

function getRandomColor() {
   function r() {return (40 + Math.random() * 140) | 0;}
   return 'rgb('+r()+','+r()+','+r()+')';
}


function getAllUsers() {
   var u = [];
   for(var k in users) {
      if(u.indexOf(users[k].name) === -1) u.push(users[k].name);
   }
   return u;
}

function escp(str) {
   var tagsToReplace = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;'
   };

   return str.replace(/[&<>]/g, function (tag) {
      return tagsToReplace[tag] || tag;
   });
}

function replaceLinks(inputText) {
   var replacedText, replacePattern1, replacePattern2;

   replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
   replacedText = inputText.replace(replacePattern1, function (a) {
      var ext = a.split('.');
      ext = ext[ext.length - 1];

      if(ext.length === 1 || allowFormats.indexOf(ext) === -1) return '<a href="'+a+'" target="_blank">'+a+'</a>';

      return '<a href="'+a+'" target="_blank"><img src="'+a+'"></a>';
   });

   replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
   replacedText = replacedText.replace(replacePattern2, function (b, a) {
      var ext = a.split('.');
      ext = ext[ext.length - 1];

      if(ext.length === 1 || allowFormats.indexOf(ext) === -1) return b+'<a href="'+a+'" target="_blank">'+a+'</a>';

      return '<a href="'+a+'" target="_blank"><img src="'+a+'"></a>';
   });

   return replacedText;
}

function replaceSmiles(msg) {
   return msg.replace(/\:([a-z\_]{1,25})\:/gim, function (a, b) {
      if(smiles.indexOf(b) === -1) return a;

      return '<img src=http://enemy.su/public/style_images/4_enemy_logo/'+b+'.png>';
   })
}

function prepareMessage(msg) {
   msg = replaceLinks(msg);
   msg = replaceSmiles(msg);
   return msg;
}

function hasUser (user) {
   for(var k in users) {
      if(users[k].name.toLowerCase() === user.toLowerCase()) return true;
   }
   return false;
}

function getUserIDs (user) {
   var ids = [];
   for(var k in users) {
      if(users[k].name.toLowerCase() === user.toLowerCase()) ids.push(k);
   }
   return ids;
}

function getUserObg (user) {
   for(var k in users) {
      if(users[k].name.toLowerCase() === user.toLowerCase()) return users[k];
   }
   return null;
}

function hexToRgb (hex) {
   var res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
   return (res && [1, 2, 3].filter(function (n) {
      res[n] = parseInt(res[n], 16);
      return res[n] > 40 && res[n] < 180;
   })) ? 'rgb('+res[1]+','+res[2]+','+res[3]+')' : false;
}


io.sockets.on('connection', function (socket) {
   var ID = socket.id, time, name, color;

   // FUNCTIONS
   function bySystem(msg, esc) {
      msg = esc ? escp(msg) : msg;
      msg = prepareMessage(msg);

      socket.json.send({name : SYSTEM, text : msg, time : time, color : 'red'});
      socket.broadcast.json.send({name : SYSTEM, text : msg, time : time, color : 'red'});
   }

   function sendMeBySystem(msg, esc) {
      msg = esc ? escp(msg) : msg;
      msg = prepareMessage(msg);

      socket.json.send({name : SYSTEM, text : msg, time : time, color : 'red'});
   }

   function sendMe (msg, esc) {
      msg = esc ? escp(msg) : msg;
      msg = prepareMessage(msg);

      socket.json.send({name : name, text : msg, time : time, color : color});
   }

   function sendOther (msg, esc) {
      msg = esc ? escp(msg) : msg;
      msg = prepareMessage(msg);

      var message = {name : name, text : msg, time : time, color : color};

      socket.broadcast.json.send(message);
      history.push(message);
   }

   function sendToId(id, msg) {
      var message = {name : name, text : msg, time : time, color : color};
      io.sockets.sockets[id].json.send(message);
   }

   function sendPm (user, msg) {
      msg = prepareMessage(msg);

      if( ! hasUser(user)) {
         return sendMeBySystem('Пользователь не найден');
      }

      getUserIDs(user).forEach(function (id) {
         sendToId(id, '<i><b>лично:</b></i> ' + msg);
      });

      sendMeBySystem('Сообщение отправленно');
   }

   function sendAll (msg, esc) {
      sendMe(msg, esc);
      sendOther(msg, esc);
   }

   function isBanned (user) {
      return banned.indexOf(user) !== -1;
   }

   // EVENTS
   socket.on('message', function (msg) {
      time = +(new Date);

      try { msg = JSON.parse(msg); }
      catch(e) { return; }


      if(msg.type === 'nickname' && msg.user && ! (ID in users)) {
         var nick = msg.user.trim(), obj = getUserObg(nick);

         if( ! hasUser(nick) && READY) bySystem('Вошел пользователь <b>' + nick + '</b>');

         users[ID] = {name : nick, color : obj ? obj.color : getRandomColor()};

         sendMeBySystem('Список команд -  <b>/help</b>');
         sendMeBySystem('Донат на сервер - 270р/мес: вм R348060284937 и тел. +79600916519');
         sendMeBySystem('socketid:'+ID);

         history.slice(-8).forEach(function (msg) {
            socket.json.send(msg);
         });

         if(history.length > 100) {
            history = [];
         }
      }

      else if(msg.type === 'session' && msg.id) {
         if(msg.id in users) {
            users[ID] = users[msg.id];
         }

         sendMeBySystem('Список команд -  <b>/help</b>');
         sendMeBySystem('Донат на сервер - 270р/мес: вм R348060284937 и тел. +79600916519');
         sendMeBySystem('socketid:'+ID);

         history.slice(-8).forEach(function (msg) {
            socket.json.send(msg);
         });
      }

      else if(msg.type === 'msg' && ID in users) {
         name = users[ID].name;
         color = users[ID].color;

         if( ! msg.text) return;

         if(msg.text.indexOf('/') !== 0) { // not a command

            if(name === 'guest')
               sendMeBySystem('Вы можете только читать!');

            else if(!isBanned(name))
               sendAll(msg.text, true);

            else
               sendMeBySystem('Вы забаннены :(');
         }

         else {
            name = users[ID].name;
            var command = msg.text.split(' ');

            switch(command[0]) {
               case "/help" : {
                  sendMeBySystem(HELPS.join('<br>'));
                  break;
               }

               case "/roll" : {
                  if(name !== 'guest') bySystem('<b>' + name + '</b> rolled ' + (Math.random() * 100 | 0));
                  break;
               }

               case "/users" : {
                  sendMeBySystem(getAllUsers().join(', '));
                  break;
               }

               case "/ban" : {
                  if(name === "Двапой" || command[2] === SECRET_WORD) {
                     bySystem('Был забанен пользователь ' + command[1]);
                     if( ! isBanned(command[1])) {
                        banned.push(command[1]);
                     }
                  }
                  else {
                     sendMeBySystem('Недостаточно прав');
                  }

                  break;
               }

               case "/unban" : {
                  if(name === "Двапой" || command[2] === SECRET_WORD) {
                     if(isBanned(command[1])) {
                        banned[banned.indexOf(command[1])] = null;
                        bySystem('Был разбанен пользователь ' + command[1]);
                     }
                  }
                  else {
                     sendMeBySystem('Недостаточно прав');
                  }

                  break;
               }

               case "/system" : {
                  if(name === "Двапой" || command[1] === SECRET_WORD) {
                     command[0] = command[1] = "";
                     bySystem(command.join(' '))
                  }
                  else {
                     sendMeBySystem('Недостаточно прав');
                  }

                  break;
               }

               case "/smiles" : {
                  sendMeBySystem(':<i>' + smiles.join('</i>:, :<i>') + '</i>:');
                  break;
               }

               case "/color" : {
                  var rgb = hexToRgb(command[1]);
                  if(rgb) {
                     users[ID].color = rgb;
                     sendMeBySystem('Вы изменили цвет на <i style="color:'+rgb+'">'+command[1]+'</i>');
                  }
                  else {
                     sendMeBySystem('Нельзя выбирать слишком яркие или свлишком темные цвета');
                  }
                  break;
               }

               case "/login" : {
                  if(name === "Двапой" || command[2] === SECRET_WORD) {
                     users[ID] = {name : command[1], color : getRandomColor()};
                  }
                  else {
                     sendMeBySystem('Недостаточно прав');
                  }
                  break;
               }

               case "/pm" : {
                  if(name === 'guest') return;
                  var n = command[1];
                  command[0] = command[1] = "";
                  sendPm(n, command.join(''));
                  break;
               }

               default : {
                  sendMeBySystem("Команда не найдена");
               }

            }
         }
      }

   });

   socket.on('disconnect', function() {
      setTimeout(function () {
         delete users[ID];
      }, 1000 * 40);
   });
});
