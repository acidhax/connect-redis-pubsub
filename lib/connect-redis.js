/*!
 * Connect - Redis
 * Copyright(c) 2012 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var redis = require('redis')
  , debug = require('debug')('connect:redis');

/**
 * One day in seconds.
 */

var oneDay = 86400;

/**
 * Return the `RedisStore` extending `connect`'s session Store.
 *
 * @param {object} connect
 * @return {Function}
 * @api public
 */

module.exports = function(connect){

  /**
   * Connect's Store.
   */

  var Store = connect.session.Store;

  /**
   * Initialize RedisStore with the given `options`.
   *
   * @param {Object} options
   * @api public
   */

  function RedisStore(options) {
    var self = this;

    options = options || {};
    Store.call(this, options);
    this.prefix = null == options.prefix
      ? 'sess:'
      : options.prefix;

    this.client = options.client || new redis.createClient(options.port || options.socket, options.host, options);
    this.subClient = options.subClient || new redis.createClient(options.port || options.socket, options.host, options);
    this.subscriptions = {};

    if (options.pass) {
      this.client.auth(options.pass, function(err){
        if (err) throw err;
      });    
    }

    this.subClient.on('message', function(channel, message) {
      console.log('got a message on ' + channel);
      if (self.subscriptions[channel] && self.subscriptions[channel].length) {
        for (var n = 0; n < self.subscriptions[channel].length; n++) {
          var cb = self.subscriptions[channel][n];
          process.nextTick(function() {
            cb(null, JSON.parse(data));
          });
        }
      }
    });

    this.ttl =  options.ttl;

    if (options.db) {
      self.client.select(options.db);
      self.client.on("connect", function() {
        self.client.send_anyways = true;
        self.client.select(options.db);
        self.client.send_anyways = false;
      });
    }

    self.client.on('error', function () { self.emit('disconnect'); });
    self.client.on('connect', function () { self.emit('connect'); });
  };

  /**
   * Inherit from `Store`.
   */

  RedisStore.prototype.__proto__ = Store.prototype;

  /**
   * Attempt to fetch session by the given `sid`.
   *
   * @param {String} sid
   * @param {Function} fn
   * @api public
   */

  RedisStore.prototype.get = function(sid, fn){
    sid = this.prefix + sid;
    debug('GET "%s"', sid);
    this.client.get(sid, function(err, data){
      if (err) return fn(err);
      if (!data) return fn();
      var result;
      data = data.toString();
      debug('GOT %s', data);
      try {
        result = JSON.parse(data); 
      } catch (err) {
        return fn(err);
      }
      return fn(null, result);
    });
  };

  /**
   * Commit the given `sess` object associated with the given `sid`.
   *
   * @param {String} sid
   * @param {Session} sess
   * @param {Function} fn
   * @api public
   */

  RedisStore.prototype.set = function(sid, sess, fn){
    sid = this.prefix + sid;
    try {
      var maxAge = sess.cookie.maxAge
        , ttl = this.ttl
        , sess = JSON.stringify(sess);

      ttl = ttl || ('number' == typeof maxAge
          ? maxAge / 1000 | 0
          : oneDay);

      debug('SETEX "%s" ttl:%s %s', sid, ttl, sess);
      var self = this;
      this.client.setex(sid, ttl, sess, function(err){
        err || debug('SETEX complete');
        self.client.publish(sid, sess);
        console.log('publishing to ' + sid);
        fn && fn.apply(this, arguments);
      });
    } catch (err) {
      fn && fn(err);
    } 
  };

  /**
   * Destroy the session associated with the given `sid`.
   *
   * @param {String} sid
   * @api public
   */

  RedisStore.prototype.destroy = function(sid, fn){
    sid = this.prefix + sid;
    this.client.del(sid, fn);
  };


  /**
   * Subscribes to changes on a session
   * @param  {String} sid
   * @param  {Function} cb
   */
  RedisStore.prototype.subscribe = function(sid, cb) {
    sid = this.prefix + sid;
    console.log('subscribing to ' + sid);
    if (!this.subscriptions[sid]) {
      this.subscriptions[sid] = [];
    }

    this.subClient.subscribe(sid);

    this.subscriptions[sid].push(cb);
  };


  /**
   * Unsubscribes from changes on a session
   * @param  {String}   sid
   * @param  {Function} cb
   */
  RedisStore.prototype.unsubscribe = function(sid, cb) {
    sid = this.prefix + sid;
    console.log('unsubscribing from ' + sid);
    if(this.subscriptions[sid] && this.subscriptions[sid].indexOf(cb) > -1) {
      this.subscriptions[sid].splice(this.subscriptions[sid].indexOf(cb));
    }

    if(this.subscriptions[sid] && this.subscriptions[sid].length === 0) {
      delete this.subscriptions[sid];
    }

    this.subClient.unsubscribe(sid);
  };

  return RedisStore;
};
