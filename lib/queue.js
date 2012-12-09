'use strict';

var EventEmitter = require('events').EventEmitter
  , util         = require('util')
  ;

/**
 * CONSTANTS
 */
var MAX_ROTOR_SPEED = 256;

function Queue(copter) {
  EventEmitter.call(this);
  this.controller = copter;
  this.queue = [];
}
util.inherits(Queue, EventEmitter);

Queue.prototype.enqueue = function (command, duration) {
  this.queue.push({command : command, duration : duration});
};

Queue.prototype.nexter = function (pair, next) {
  var self = this;

  var command = next;
  if (!next) command = function () { self.emit('end', self.controller); };

  return function () {
    setTimeout(command, pair.duration);
    self.controller.sendCommand(pair.command);
  };
};

Queue.prototype.end = function () {
  var self = this;

  var pair, next;
  for (var i = this.queue.length - 1; i >= 0; i--) {
    pair = this.queue[i];
    next = this.nexter(pair, next);
  }
  next();
};

module.exports = Queue;
