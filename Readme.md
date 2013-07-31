# Connect Redis PubSub

connect-redis-pubsub is a Redis session store based on [connect-redis](https://github.com/visionmedia/connect-redis) backed by [node_redis](http://github.com/mranney/node_redis). Requires redis >= `2.0.0` for the _SETEX_ command.

This module has the ability to subscribe to session changes based on the `sid` of a session. Anytime a session is modified, it will publish to the session's channel, and any client subscribed to that session, will receive the updated session information.

 connect-redis `>= 1.0.0` support only connect `>= 1.0.0`.

## Installation

	  $ npm install connect-redis-pubsub

## Options
  
  - `client` An existing redis client object you normally get from `redis.createClient()`
  - `subClient` An existing redis client object that is going to ONLY be used for subscriptions
  - `host` Redis server hostname
  - `port` Redis server portno
  - `ttl` Redis session TTL in seconds
  - `db` Database index to use
  - `pass` Password for Redis authentication
  - `prefix` Key prefix defaulting to "sess:"
  - ...    Remaining options passed to the redis `createClient()` method.

## Usage

    var connect = require('connect'), 
      RedisStore = require('connect-redis')(connect);

    connect()
      .use(connect.session({ store: new RedisStore(options), secret: 'disco cat' }))

Subscribing:

    RedisStore.subscribe(sid, callback)

Unsubscribing:

    RedisStore.unsubscribe(sid, callback)

# License

  MIT
