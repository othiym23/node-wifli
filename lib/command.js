'use strict';

var path = require('path')
  , normalize = require(path.join(__dirname, 'normalize'))
  ;

/*
 * CONSTANTS
 */
var COMMAND_LENGTH = 9;

function Command(init) {
  if (!init) init = {};

  this.rotorSpeed = normalize.vector(init.rotorSpeed || 0);
  this.trim       = normalize.axial(init.trim        || 0);
  this.yaw        = normalize.axial(init.yaw         || 0);
  this.pitch      = normalize.axial(init.pitch       || 0);
}

// thanks to http://myrhev.net/?page_id=256 for "protocol" details
Command.prototype.toBuffer = function () {
  var command = new Buffer(COMMAND_LENGTH);

  // Bytes 1, 2, & 9 have reserved values; 7 & 8 are unused.
  command.writeUInt8(0xaa, 0);
  command.writeUInt8(0x64, 1);
  command.writeUInt8(0xbb, 8);

  // Buffers can come with random crap in them; init to 0.
  for (var i = 2; i < 8; i++) command.writeUInt8(0x00, i);

  command.writeUInt8(this.rotorSpeed | 0, 2);
  command.writeUInt8(this.trim       | 0, 3);
  command.writeUInt8(this.yaw        | 0, 4);
  command.writeUInt8(this.pitch      | 0, 5);

  return command;
};

/**
 * Useful in case you want to write a command interface based on relative
 * motion.
 */
Command.prototype.clone = function ()  {
  return new Command({
    rotorSpeed : this.rotorSpeed,
    trim       : this.trim,
    yaw        : this.yaw,
    pitch      : this.pitch
  });
};

module.exports = Command;
