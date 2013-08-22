/*!
* Connect - Redis
* Copyright(c) 2013 Graham Kennery <graham@kennery.com>
* MIT Licensed
*/
var RedisPubSub = require('redis-sub'), 
	debug = require('debug')('connect:redis'),
	oneDay = 86400; // seconds

/**
* Return the `RedisStore` extending `connect`'s session Store.
*
* @param {object} connect
* @return {Function}
* @api public
*/

module.exports = function(connect) {

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
		this.prefix = options.prefix || 'sess:';
		this.subscriptions = {};


		if (options.pubsub) {
			this.pubsub = options.pubsub;
			this.client = this.pubsub.pubClient;
			this.subClient = this.pubsub.subClient;
		} else {
			this.client = options.client || new redis.createClient(options.port || options.socket, options.host, options);
			this.subClient = options.subClient || new redis.createClient(options.port || options.socket, options.host, options);

			this.pubsub = new RedisPubSub({
				pubClient: this.cient,
				subClient: this.subClient
			});

			if (options.pass) {
				this.client.auth(options.pass, function(err){
					if (err) throw err;
				});    
			}
		}

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
	* @param {Function} cb
	* @api public
	*/

	RedisStore.prototype.get = function(sid, cb){
		sid = this.prefix + sid;
		debug('GET "%s"', sid);
		this.client.get(sid, function(err, data) {
			if (!err && data) {
				try {
					data = data.toString();
					debug('GOT %s', data);
					var result = JSON.parse(data); 
					cb(null, result);
				} catch (err) {
					cb(err);
				}
			} else {
				cb(err);
			}
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

	RedisStore.prototype.set = function(sid, sess, cb){
		sid = this.prefix + sid;
		try {
			var maxAge = sess.cookie.maxAge, 
				ttl = this.ttl, 
				sess = JSON.stringify(sess);

			if (!ttl) {
				ttl = (typeof maxAge == 'number') ? maxAge / 1000 | 0 : oneDay;
			}

			debug('SETEX "%s" ttl:%s %s', sid, ttl, sess);

			var self = this;
			this.client.setex(sid, ttl, sess, function(err){
				if (!err) {
					self.publish(sid, sess);

					cb && cb.apply(this, arguments);
				} else {
					cb && cb(err);
				}
			});
		} catch (err) {
			cb && cb(err);
		} 
	};

	RedisStore.prototype.publish = function(sid, sess, fn) {
		var self = this;
		var session = JSON.parse(sess);
		delete session.cookie;
		session = JSON.stringify(session);

		self.client.get('temp:' + sid, function(err, lastSess) {
			if (err || !lastSess || session !== lastSess) {
				self.pubsub.publish(sid, sess, function() {
					self.client.setex('temp:' + sid, 3, session);
					fn && fn.apply(this, arguments)
				});
			} else {
				fn && fn();
			}
		});
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
		var wrapper = function(data) {
			if (data) {
				try {
					data = JSON.parse(data);
				}
				catch(e) {
					
				}
			}

			cb(data);
		};
		this.pubsub.on(sid, wrapper);
		this.subscriptions[cb] = wrapper;
	};

	/**
	* Subscribes to changes on a session only once.
	* @param  {String} sid
	* @param  {Function} cb
	*/
	RedisStore.prototype.subscribeOnce = function(sid, cb) {
		sid = this.prefix + sid;
		var wrapper = function(data) {
			if (data) {
				try {
					data = JSON.parse(data);
				}
				catch(e) {
					
				}
			}

			cb(data);
		};
		this.pubsub.once(sid, wrapper);
		this.subscriptions[cb] = wrapper;
	};

	/**
	* Unsubscribes from changes on a session
	* @param  {String}   sid
	* @param  {Function} cb
	*/
	RedisStore.prototype.unsubscribe = function(sid, cb) {
		sid = this.prefix + sid;
		if (this.subscriptions[cb]) {
			this.pubsub.removeListener(sid, this.subscriptions[cb]);
			delete this.subscriptions[cb];
		}
	};

	return RedisStore;
};
