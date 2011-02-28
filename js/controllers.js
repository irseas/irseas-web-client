var Router = Backbone.Controller.extend({
  routes: {
    '':                     'index',
    ':networkId':           'network',
    ':networkId/:bufferId': 'buffer',
  },
  
  index: function () {
    this.buffer(-1, -1);
  },
  
  network: function (networkId) {
    var network = app.networkList.get(networkId);
    var consoleBufferId = network.bufferList.find(function (buffer) {
      return buffer.get('name') == '*';
    });
    this.buffer(networkId, consoleBufferId);
  },
  
  buffer: function (networkId, bufferId) {
    var network = app.networkList.get(networkId);
    if (network) {
      var buffer = network.bufferList.get(bufferId);
      if (buffer) {    
        if (buffer.listRowView)
          buffer.listRowView.select();
        else
          buffer.network.view.select();
          
        buffer.view.show();
        
        if (buffer.memberListView)
          buffer.memberListView.show();
        else
          $('#users ul').removeClass('active');
    
        var topic = buffer.get('topic_text');
        if (topic)
          $('#topic').html(topic);
        else
          $('#topic').html('');
          
        return;
      }
    }
    
    $('#users ul').removeClass('active');
    $('#networks li').removeClass('active');
    $('#buffers div').removeClass('active');

    // FIXME:        
    console.error('404');
  }
});

