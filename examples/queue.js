'use strict';

var Queue        = require('../lib/queue')
  , EventEmitter = require('events').EventEmitter
  , WiFli        = require('../index')
  ;

var kopter = new WiFli();
kopter.connect(function () {
  var tq = new Queue(kopter);

  tq.on('end', function () { console.log('all done!'); });
  tq.enqueue({rotorSpeed : 10}, 500);
  tq.enqueue({rotorSpeed : 10, pitch : -3}, 500);
  tq.enqueue({rotorSpeed : 10}, 500);
  tq.enqueue({rotorSpeed : 10, pitch : 4}, 500);
  tq.enqueue({}, 500);
  tq.end();
});
