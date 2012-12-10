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
var HELIADDRESS  = '192.168.11.123'
  , HELIPORT     = 2000
  , HOVER_SPEED  = 30 // FIXME: SWAG, varies with charge
  , DEFAULT_TRIM = 0  // FIXME: SWAG, varies with helicopter load
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

function WiFli (options) {
  EventEmitter.call(this);
  this.writable = true;

  if (!options) options = {};
  this.hoverSpeed = options.hoverSpeed || HOVER_SPEED;
  this.trim = options.trim || DEFAULT_TRIM;

  // make it easy to stream commands to copter
  this.on('data', function (command) {
    this.sendCommand(command);
  }.bind(this));

  this.on('error', function (error) {
    console.error("something bad happened, trying to reset WiFli before bailing out.");
    console.error(error);
    this.end();
  }.bind(this));

  // TODO: may make this optional
  this.on('sent', function (command) {
    console.log("sending command: %j", command);
  });

  this.once('end', function () {
    console.log("WiFli shut down.");
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
    this.emit('ready');
  }.bind(this));
  this.connection.on('end', function () {
    console.log("control channel to WiFli closed.");
  });
  this.connection.on('error', function (error) {
    this.emit('error', error);
  }.bind(this));

  if (callback) this.connection.once('connect', callback);
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
    return this.sendReset();
  }
  else if (command.hover) {
    return this.hover(command);
  }
  else {
    // need to prevent precession
    if (!command.hasOwnProperty('trim')) command.trim = this.trim;

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
  var status = this.sendCommand();
  this.emit('reset');
  return status;
};

WiFli.prototype.hover = function (command) {
  if (command) {
    delete command.hover;
  }
  else {
    command = {};
  }
  command.rotorSpeed = this.hoverSpeed;

  this.sendCommand(command);
  this.emit('hover');
};

WiFli.prototype.launch = function (duration) {
  if (!duration) duration = 1000;

  var self = this;
  this.runQueue(function (q) {
    q.once('end', function () { self.emit('launch'); });

    q.enqueue({rotorSpeed : Math.floor(self.hoverSpeed * 1.2)}, duration);
    q.enqueue({hover : true}, 0);
  });
};

WiFli.prototype.land = function (duration) {
  if (!duration) duration = 1000;

  var self = this;
  this.runQueue(function (q) {
    q.once('end', function () { self.emit('land'); });

    q.enqueue({rotorSpeed : Math.floor(self.hoverSpeed * 0.8)},   duration * 0.3);
    q.enqueue({hover : true},                                     duration * 0.3);
    q.enqueue({rotorSpeed : Math.floor(self.hoverSpeed * 0.95)},  duration * 0.4);
    q.enqueue({reset : true}, 0);
  });
};

module.exports = WiFli;
