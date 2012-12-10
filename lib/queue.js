'use strict';

var EventEmitter = require('events').EventEmitter
  , util         = require('util')
  ;

/**
 * CONSTANTS
 */
var MAX_ROTOR_SPEED = 256;

function Queue(kopter) {
  EventEmitter.call(this);
  this.controller = kopter;
  this.queue = [];
}
util.inherits(Queue, EventEmitter);

Queue.prototype.enqueue = function (command, duration) {
  this.queue.push({command : command, duration : duration});
};

/**
 * The only cleverness here is ensuring that the last / first function
 * emits the end event for the queue.
 */
Queue.prototype.nexter = function (pair, next) {
  var self = this;

  var command = next;
  if (!next) command = function () { self.emit('end', self.controller); };

  return function () {
    setTimeout(command, pair.duration);
    self.controller.sendCommand(pair.command);
  };
};

/**
 * Going backwards from the last command, stitch together a linked list of
 * function calls, separated by setTimeout intervalse. It was substack's idea,
 * blame him.
 */
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
