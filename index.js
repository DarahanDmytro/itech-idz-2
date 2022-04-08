var express = require("express");
var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('public'));
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

var answer = "";
var ruller = -1;
var started = false;
var gamers = 1;

function wipe(){
  ruller = -1;
  started = false;
  gamers = 1;
  answer = "";
  io.emit('gamers',gamers);
}

io.on('connection', function(socket){
  socket.on('create', function(msg){
    if(ruller < 0){
      answer = msg;
      socket.emit('transform_wait');
      socket.broadcast.emit('transform_join',false);
      ruller = socket.id;
      gamers = 1;
    }
    else{
      socket.emit('alert','Вже йде сеанс гри');
      socket.emit('transform_join',false);
    }
  });
  socket.on('join', function(){
    if(!started){
      io.to(ruller).emit('trasform_start');
      socket.emit('transform_wait');
      io.emit('gamers',++gamers);
    }
    else{
      socket.emit('transform_slave');
      io.emit('gamers',++gamers);
    }
  });
  socket.on('start', function(){
    if(gamers>1){
      started = true;
      socket.emit('transform_master');
      socket.broadcast.emit('transform_slave');
    }
    else{
      socket.emit('alert','Недостатно гравців');
    }
  });
  socket.on('send message', function(msg) {
    io.emit('receive message', msg);
    io.to(ruller).emit('allow');
    io.emit('block_slave');
  });
  socket.on('yes', function(){
    io.emit('receive message', 'Так');
    io.emit('allow_slave');
  });
  socket.on('no', function(){
    io.emit('receive message', 'Ні');
    io.emit('allow_slave');
  });
  socket.on('incorrect', function(){
    io.emit('receive message', 'Немає значення');
    io.emit('allow_slave');
  });
  socket.on('finish', function(){
    io.emit('finish', answer);
    wipe();
  });
  socket.on('disconnect',function(){
    if(started){
      if(socket.id == ruller){
        io.emit('gamers',1);
        io.emit('finish', answer);
        io.emit('alert',"Ведучий вибув");
        wipe();
      }
      else{
        --gamers;
        if(gamers < 2){
          gamers = 1;
          io.emit('gamers', gamers);
          io.emit('alert', "Немає інших гравців");
        }
      }
    }
  });
});

http.listen(3000);