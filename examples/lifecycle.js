'use strict';

var WiFli          = require('../index')
  , MockConnection = require('../lib/mock-connection')
  ;

var kopter = new WiFli();
// replace this with a real connect() call to send to real copter
kopter.connection = new MockConnection();

kopter.once('launch', function () {
  kopter.runQueue(function (q) {
    q.on('end', function () { kopter.land(); });

    q.enqueue({hover : true}, 1000);
    q.enqueue({hover : true, trim : -8}, 500);
    q.enqueue({hover : true, trim :  8}, 1000);
  });
});

kopter.once('land', function () { kopter.end(); });
kopter.once('end', function () { console.log("all done!"); });

kopter.launch();
