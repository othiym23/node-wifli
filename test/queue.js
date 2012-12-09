'use strict';

var test         = require('tap').test
  , Queue        = require('../lib/queue')
  , EventEmitter = require('events').EventEmitter
  ;

test("command queue", function (t) {
  t.plan(5);

  var verifiers = [
    function (command) {
      t.deepEqual(command, {rotorSpeed : 10}, "rotor turned on at 10");
    },
    function (command) {
      t.deepEqual(command, {rotorSpeed : 10, pitch : -3}, "pitch altered left");
    },
    function (command) {
      t.deepEqual(command, {rotorSpeed : 10}, "rotor speed maintained");
    },
    function (command) {
      t.deepEqual(command, {rotorSpeed : 10, pitch : 4}, "pitch altered right");
    },
    function (command) {
      t.deepEqual(command, {}, "everything shut down");
    }
  ];

  var pass = 0;
  var mockConnection = {
    sendCommand : function (command) {
      verifiers[pass++](command);
    }
  };

  var tq = new Queue(mockConnection);

  tq.on('end', function () { t.end(); });
  tq.enqueue({rotorSpeed : 10}, 500);
  tq.enqueue({rotorSpeed : 10, pitch : -3}, 500);
  tq.enqueue({rotorSpeed : 10}, 500);
  tq.enqueue({rotorSpeed : 10, pitch : 4}, 500);
  tq.enqueue({}, 500);
  tq.end();
});
