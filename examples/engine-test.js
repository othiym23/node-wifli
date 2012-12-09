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

  for (var i = 8; i <= 40; i += 1) {
    tq.enqueue({rotorSpeed : i}, 2000);
  }

  for (; i > 8; i -= 1) {
    tq.enqueue({rotorSpeed : i}, 2000);
  }

  tq.enqueue({reset : true}, 0);
});

// uncomment and put the above in here for a real run
// kopter.connect(function () {
// });
