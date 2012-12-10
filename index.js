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

/**
 * Two options parameters: hoverSpeed, to set the current
 * best guess at the power at which the helicopter will hover,
 * and trim, which will probably remain stable over time and
 * is the value necessary to make the copter fly straight in
 * a still room.
 */
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

/**
 * Establish the network connection to the Wi-Fli. Assumes you're already on
 * the correct SSID for the helicopter, which will look something like
 * wifli0deadbeef.
 *
 * @param Function callback Callback to be run once the copter's ready. Can
 *                          also listen on the 'ready' event on WiFli.
 */
WiFli.prototype.connect = function (callback) {
  this.connection = net.connect(HELIPORT, HELIADDRESS);

  // Do something sensible by default.
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

/**
 * Run a queue of low-level commands in order. See the README for details.
 * The queue is passed to the callback, and you can register an event on
 * 'end' on the queue to fire when all of the commands and durations have
 * been processed in the queue.
 */
WiFli.prototype.runQueue = function (callback) {
  var queue = new Queue(this);
  callback(queue);
  queue.end();
};

/**
 * Send a low-level command. Those commands are:
 *
 * reset: (always use true as the value). Stop the copter's engine.
 * hover: (always use true as the value). Hover in place (if calibrated).
 * rotorSpeed: engine power, from 0 to 256.
 * pitch: go forward or back, from -32 to 31.
 * yaw: rotate left or right, from -32 to 31.
 * trim: correct for flight precession, from -32 to 31.
 *
 * Commands can be combined, although reset discards other values, and hover
 * overrides rotorSpeed.
 */
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
    if (!command.hasOwnProperty('trim') && this.trim) command.trim = this.trim;

    var b = new Command(command).toBuffer();
    this.emit('sent', command);
    this.connection.write(b);

    return true;
  }
};

/**
 * Turn off the engine and shut down the connection to the helicopter.
 */
WiFli.prototype.end = function (command) {
  if (command) this.sendCommand(command);

  this.sendReset(); // fail safer
  if (this.connection) this.connection.end();
  this.writable = false;
  this.emit('end');
};

/**
 * Reclaim the resources used by this controller.
 */
WiFli.prototype.destroy = function () {
  if (this.connection) this.connection.end();
  this.connection = null;
  this.writable = false;
  this.emit('close');
};

/**
 **
 ** HIGH LEVEL COMMANDS
 **
 **/

/**
 * Turns off the helicopter's engine. Good for a failsafe, but use judiciously.
 *
 * Emits 'reset' when completed.
 */
WiFli.prototype.sendReset = function () {
  var status = this.sendCommand();
  this.emit('reset');
  return status;
};

/**
 * Hovers in place, optionally combined with other command values.
 *
 * Emits 'hover' when completed.
 */
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

/**
 * Try to take off without zooming off into the sky by using an engine power
 * that's a function of the (with luck, calibrated) hover speed.
 *
 * Emits 'launch' when completed.
 */
WiFli.prototype.launch = function (duration) {
  if (!duration) duration = 1000;

  var self = this;
  this.runQueue(function (q) {
    q.once('end', function () { self.emit('launch'); });

    q.enqueue({rotorSpeed : Math.floor(self.hoverSpeed * 1.2)}, duration);
    q.enqueue({hover : true}, 0);
  });
};

/**
 * Try to land smoothly -- choose a duration that makes sense based on your
 * best guess of how high off the ground the copter is, with longer for higher.
 *
 *
 * Emits 'land' when completed.
 */
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
