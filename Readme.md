# Connect Redis

connect-redis-pubsub is a Redis session store based on [connect-redis](https://github.com/visionmedia/connect-redis) backed by [node_redis](http://github.com/mranney/node_redis). Requires redis >= `2.0.0` for the _SETEX_ command.

 connect-redis `>= 1.0.0` support only connect `>= 1.0.0`.

<!-- ## Installation

	  $ npm install connect-redis -->

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

    var connect = require('connect')
	 	  , RedisStore = require('connect-redis')(connect);

    connect()
      .use(connect.session({ store: new RedisStore(options), secret: 'keyboard cat' }))

# License

  MIT
