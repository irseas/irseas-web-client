var Util = {
  bindMessageHandlers: function (obj) {
    if (obj.messageHandlers) {
      _.each(_.functions(obj.messageHandlers), function (name) {
        this.messageHandlers[name] = _.bind(this.messageHandlers[name], this);
      }, obj); 
    }
  }
};