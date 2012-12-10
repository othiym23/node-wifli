'use strict';

var Queue          = require('../lib/queue')
  , EventEmitter   = require('events').EventEmitter
  , WiFli          = require('../index')
  , MockConnection = require('../lib/mock-connection')
  ;

var kopter = new WiFli();

// replace this with a real connect() call to send to real copter
kopter.connection = new MockConnection();

var q = new Queue(kopter);
q.on('end', function () { console.log('all done!'); });
q.enqueue({rotorSpeed : 10}, 500);
q.enqueue({rotorSpeed : 10, pitch : -3}, 500);
q.enqueue({rotorSpeed : 10}, 500);
q.enqueue({rotorSpeed : 10, pitch : 4}, 500);
q.enqueue({}, 500);
q.end();

// uncomment and put the above in here for a real run
// kopter.connect(function () {
// });
