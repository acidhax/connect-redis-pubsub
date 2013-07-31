
/**
 * Module dependencies.
 */

var assert = require('assert')
  , connect = require('connect')
  , RedisStore = require('./')(connect);

var store = new RedisStore;
var store_alt = new RedisStore({ db: 15 });


// #subscribecb
var cb = function(err, data) {
  console.log('#subscribecb');
  assert.ok(!err, '#subscribecb got an error');
  assert.ok(data, '#subscribecb has no data');
  store.unsubscribe('123', cb);
};

store.subscribe('123', cb);
store.client.on('connect', function() {
  // #set()
  console.log('#set');
  store.set('123', { cookie: { maxAge: 2000 }, name: 'gk' }, function(err, ok){
    assert.ok(!err, '#set() got an error');
    assert.ok(ok, '#set() is not ok');

    // #get()
    console.log('#get');
    store.get('123', function(err, data){
      assert.ok(!err, '#get() got an error');
      assert.deepEqual({ cookie: { maxAge: 2000 }, name: 'gk' }, data);

      // #set null
      console.log('#set null');
      store.set('123', { cookie: { maxAge: 2000 }, name: 'gk' }, function(){
        store.destroy('123', function(){
         console.log('done');
         store.client.end(); 
         store_alt.client.end();
        });
      });
      throw new Error('Error in fn');
    });
  });
});

process.once('uncaughtException', function (err) {
  assert.ok(err.message === 'Error in fn', '#get() catch wrong error');
});