var tls    = require('tls'),
    assert = require('assert'),
    sys    = require('sys'),
    URL    = require('url')
    _      = require('underscore'),
    Binary = require('binary');
  
var HTTPParser = process.binding('http_parser').HTTPParser;

var WebSocket = function (url, options) {
  var self = this;

  url = URL.parse(url);
  
  var secure = (url.protocol == 'wss:');
  var port   = url.port || (secure ? 443 : 80);

  var origin = (options && options.origin) ? options.origin : ((secure ? 'https://' : 'http://') + url.host);
  
  var klass  = (secure ? tls : socket);
  var client = klass.connect(port, url.host, function () {
    console.info('socket connected!');
    
    var headersComplete = false;
    
    var httpParser = new HTTPParser('response');
    httpParser.onHeadersComplete = function(info) {
      console.info('headers complete!!');
      headersComplete = true;
      
      Binary.stream(client)
        .skip(16) // FIXME verify challenge response
        .loop(function (vars) {
          this
          .word8('header') // FIXME: Verify that this is '\x00'
          .scan('msg', new Buffer('\xFF', 'binary'))
          .tap(function (vars) {
            if (self.onmessage)
              self.onmessage(vars.msg);
          })
        });
      
      return true;
    };
    
    client.on('data', function (data) {      
      if (!headersComplete) {
        var ret = httpParser.execute(data, 0, data.length);
        
        // FIXME: close socket when error
        if (ret instanceof Error) {
          console.info('parse error');
          return;
        } else if (typeof(ret) != 'number') {
          console.info('wtf');
          return;
        }

        // Re-emit remaining data.so that binary parser will see it.
        client.emit('data', data.slice(ret + 1));
      }
    });

    client.on('error', function (err) {
      console.info('error ' + err);
    });

    var headers = [
      'GET / HTTP/1.1',
      'Upgrade: WebSocket',
      'Connection: Upgrade',
      'Host: ' + url.host,
      'Origin: ' + origin
    ];
    
    if (options.cookies) {
      headers = headers.concat(_.map(options.cookies, function (val, name) { 
        return 'Cookie: ' + name + '=' + val;
      }));
    }
    
    headers = headers.concat([
      'Sec-WebSocket-Key1: ' + createSecretKey(),
      'Sec-WebSocket-Key2: ' + createSecretKey(),
      '\r\n'
    ]).join('\r\n');
  
    client.write(headers, 'binary');
    client.write(createChallenge(), 'binary');
  });
  this.client = client;
};

WebSocket.prototype = {
  readState:      WebSocket.CONNECTING,
  bufferedAmount: 0,
  
  onopen:    null,
  onmessage: null,
  onerror:   null,
  onclose:   null,
  protocol:  null, // FIXME
  
  send: function (data) {
    throw 'not implemented';
  },
  
  close: function () {
    this.client.destroy();
  }
};

WebSocket.CONNECTING = 0;
WebSocket.OPEN       = 1;
WebSocket.CLOSING    = 2;
WebSocket.CLOSED     = 3;

exports.WebSocket = WebSocket;


function createChallenge () {
  return _.range(8).reduce(function (memo, num) { 
    return memo + String.fromCharCode(Math.floor(Math.random() * 255));
  });
}


// Generate a Sec-WebSocket-* value
var createSecretKey = function() {
    // How many spaces will we be inserting?
    var numSpaces = 1 + Math.floor(Math.random() * 12);
    assert.ok(1 <= numSpaces && numSpaces <= 12);

    // What is the numerical value of our key?
    var keyVal = (Math.floor(
        Math.random() * (4294967295 / numSpaces)
    ) * numSpaces);

    // Our string starts with a string representation of our key
    var s = keyVal.toString();

    // Insert 'numChars' worth of noise in the character ranges
    // [0x21, 0x2f] (14 characters) and [0x3a, 0x7e] (68 characters)
    var numChars = 1 + Math.floor(Math.random() * 12);
    assert.ok(1 <= numChars && numChars <= 12);
    
    for (var i = 0; i < numChars; i++) {
        var pos = Math.floor(Math.random() * s.length + 1);

        var c = Math.floor(Math.random() * (14 + 68));
        c = (c <= 14) ?
            String.fromCharCode(c + 0x21) :
            String.fromCharCode((c - 14) + 0x3a);

        s = s.substring(0, pos) + c + s.substring(pos, s.length);
    }

    // We shoudln't have any spaces in our value until we insert them
    assert.equal(s.indexOf(' '), -1);

    // Insert 'numSpaces' worth of spaces
    for (var i = 0; i < numSpaces; i++) {
        var pos = Math.floor(Math.random() * (s.length - 1)) + 1;
        s = s.substring(0, pos) + ' ' + s.substring(pos, s.length);
    }

    assert.notEqual(s.charAt(0), ' ');
    assert.notEqual(s.charAt(s.length), ' ');

    return s;
};

