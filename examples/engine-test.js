'use strict';

var WiFli          = require('../index')
  , MockConnection = require('../lib/mock-connection')
  ;


var kopter = new WiFli();
// replace this with a real connect() call to send to real copter
kopter.connection = new MockConnection();
kopter.runQueue(function (tq) {
  tq.on('end', function () {
    console.log('all done!');
    kopter.end();
  });

  for (var i = 1; i <= 30; i += 1) {
    tq.enqueue({rotorSpeed : i}, 1000);
  }

  for (; i > 0; i -= 1) {
    tq.enqueue({rotorSpeed : i}, 1000);
  }

  tq.enqueue({reset : true}, 0);
});
