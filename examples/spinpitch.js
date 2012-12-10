'use strict';

var WiFli = require('../index');

var kontroller = new WiFli();
kontroller.connect(function () {
  kontroller.sendCommand({rotorSpeed : 16, pitch : 8});

  setTimeout(function () {
    kontroller.sendReset();
    kontroller.end();
  }, 1000);
});
