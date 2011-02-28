var WebSocketServer = require('websocket-server');
var WebSocket       = require('./websocket_client.js').WebSocket;

var server = WebSocketServer.createServer();
server.addListener("connection", function (conn) {
  console.log('new connection');
  
  var websocket = new WebSocket('wss://irccloud.com', {
    cookies: {
      session: 'PUTCOOKIEHERE'
    }
  });
  
  websocket.onmessage = function (message) {
    conn.send(message);
  };
  
  websocket.onclose = function () {
    conn.close();
  };
  
  websocket.onerror = function (err) {
    console.error(err);
  };
  
  conn.addListener("message", function (message) {
    websocket.send(message);
  });
  
  conn.addListener("close", function () {
    websocket.close();
  });
});

var port = 8000;

server.addListener('listening', function () {
  console.log('listening for connections on ' + port);
})

server.listen(port);
