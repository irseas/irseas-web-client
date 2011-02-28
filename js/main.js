function App () {
  this.controller = new Router();
  this.networkList = new NetworkList();
  Util.bindMessageHandlers(this);
}

App.prototype = {  
  processMessage: function (message) {
    var target = this;
    
    // backbone uses 'cid' internally, so use 'nid' instead.
    if (message.cid) {
      message.nid = message.cid;
      message.cid = null;
    }
    
    // HACK HACK
    if (message.type == 'server_motd') {
      message.nid = this.networkList.find(function (network) {
        return network.bufferList.any(function (buffer) {
          return buffer.id == message.bid;
        });
      }).id;
    }

    // Network and buffer-specific messages are delegated to cooresponding model.
    if (message.nid && message.type != 'makeserver') {
      var network = this.networkList.get(message.nid);
      if (network == null)
        throw 'Network not found: ' + message.nid;
      target = network;

      if (message.bid && message.bid > -1 && message.type != 'makebuffer') {
        var buffer = network.bufferList.get(message.bid);
        if (buffer == null) {
          throw 'Buffer not found: ' + message.bid;
        }
        target = buffer;
      }
    }
      
    if (target.messageHandlers[message.type])
      target.messageHandlers[message.type].apply(target, [ message ]);
    else
      throw "Unknown message type: " + message.type + ' (target: ' + target.id + ') ' + JSON.stringify(message);
  },
  
  idleReconnect: function () {
    console.info('idle! reconnect!');
  },
  
  messageHandlers: {
    header: function (message) {
      this.timeOffset   = new Date().getTime() - message.time;
      this.maxIdle      = message.idle_interval;
      // this.idleInterval = setInterval(_.bind(this.idleReconnect, this), this.maxIdle)
    },
    
    stat_user: function (message) {
      if (!this.user)
        this.user = new User(message);
      else
        this.user.set(message);
    },
    
    makeserver: function (message) {
      message.id = message.nid;
      this.networkList.add(message);
    },
    
    backlog_complete: function (message) {
      // FIXME: Do anything here?
    },
    
    heartbeat_echo: function (message) {
      // FIXME: Need to implement this
      console.warn('Ignoring heartbeat echo');
      console.warn(message);
    },
    
    idle: function (message) {
      /* ignore, lastMessageTime will still be updated above. */
    },
  }
};


$(function () {
  window.app = new App();
  window.app.view = new AppView({
    el: $('#app')
  });  

  var myWebSocket = new WebSocket("ws://localhost:8000");
  
  myWebSocket.onopen = function(evt) { 
    console.info("Connection open ..."); 
  };
  
  myWebSocket.onmessage = function(evt) { 
    window.app.processMessage(JSON.parse(evt.data)); 
  };
  
  myWebSocket.onclose = function(evt) { 
    console.info("Connection closed."); 
  };
  
  Backbone.history.start();
});