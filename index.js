'use strict';

var path         = require('path')
  , net          = require('net')
  , util         = require('util')
  , EventEmitter = require('events').EventEmitter
  , Command      = require(path.join(__dirname, 'lib', 'command'))
  , Queue        = require(path.join(__dirname, 'lib', 'queue'))
  ;

/*
 * CONSTANTS
 */
var HELIADDRESS    = '192.168.11.123'
  , HELIPORT       = 2000
  ;

function dumpResponse(response) {
  if (response.readUInt8(0) !== 0xee ||
      response.readUInt8(1) !== 0x64 ||
      !(response.readUInt8(8) === 0xbb ||
        response.readUInt8(8) === 0xdd)) {
    console.error("unexepected data from WiFli");
    console.dir(response);
  }
  else {
    console.log("helicopter battery level: %d", response.readUInt8(4));
  }
}

function WiFli () {
  EventEmitter.call(this);
  this.writable = true;

  // make it easy to stream commands to copter
  this.on('data', function (command) {
    this.sendCommand(command);
  }.bind(this));

  this.on('error', function (error) {
    console.error("something bad happened, trying to reset WiFli before bailing out.");
    console.error(error);
    this.sendReset();
  }.bind(this));

  // TODO: may make this optional
  this.on('sent', function (command) {
    console.log("sending command: %j", command);
  });
}
util.inherits(WiFli, EventEmitter);

WiFli.prototype.connect = function (callback) {
  this.connection = net.connect(HELIPORT, HELIADDRESS);

  /*
   * Do something sensible by default.
   */
  this.connection.on('data', dumpResponse);
  this.connection.on('connect', function () {
    console.log("connected to WiFli");
  });
  this.connection.on('end', function () {
    console.log("control channel to WiFli closed.");
  });
  this.connection.on('error', function (error) {
    this.emit('error', error);
  });

  if (callback) this.connection.on('connect', callback);
};

WiFli.prototype.runQueue = function (callback) {
  var queue = new Queue(this);
  callback(queue);
  queue.end();
};

WiFli.prototype.sendCommand = function (command) {
  if (!this.connection) return console.error("Attempted to send commands before connection!");
  if (!this.writable) return console.error("Attempted to write to closed command channel");
  if (!command) command = {};

  if (command.reset) {
    this.sendReset();
    return true;
  }
  else {
    var b = new Command(command).toBuffer();
    this.emit('sent', command);
    this.connection.write(b);

    return true;
  }
};

WiFli.prototype.end = function (command) {
  if (command) this.sendCommand(command);

  this.sendReset(); // fail safer
  if (this.connection) this.connection.end();
  this.writable = false;
  this.emit('end');
};

WiFli.prototype.destroy = function () {
  if (this.connection) this.connection.end();
  this.writable = false;
  this.emit('close');
};

WiFli.prototype.sendReset = function () {
  this.sendCommand();
  this.emit('reset');
};

module.exports = WiFli;
