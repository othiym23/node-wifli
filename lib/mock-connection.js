'use strict';

function MockConnection() {
}

MockConnection.prototype.write = function (buffer) {
  console.dir(buffer);
};

MockConnection.prototype.end = function () {
  console.log('connection shut down');
};

module.exports = MockConnection;
