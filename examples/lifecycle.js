'use strict';

var WiFli          = require('../index')
  , MockConnection = require('../lib/mock-connection')
  ;

var kopter = new WiFli({hoverSpeed : 20, charge : 100, trim : -5});

// replace this with a real connect() call to send to real copter
kopter.connection = new MockConnection();

kopter.on('launch', function () { console.log('WiFli launched'); });
kopter.on('land', function () { console.log('WiFli landed'); });

kopter.once('launch', function () {
  kopter.runQueue(function (q) {
    q.on('end', function () { kopter.land(2500); });

    q.enqueue({hover : true, pitch : 30, yaw : 31}, 2000);
  });
});

kopter.once('land', function () { kopter.end(); });
kopter.once('end', function () { console.log("all done!"); });

kopter.launch(2000);

// uncomment and put the above in here for a real run
// kopter.connect(function () {
// });
