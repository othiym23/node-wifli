'use strict';

/*
 * CONSTANTS
 */
var COMMAND_LENGTH = 9;

function Command(init) {
  this.rotorSpeed = init.rotorSpeed || 0;
  this.trim = init.trim || 0;
  this.yaw = init.yaw || 0;
  this.pitch = init.pitch || 0;
}

Command.prototype.toBuffer = function () {
  var command = new Buffer(COMMAND_LENGTH);
  /*
   * bytes 1, 2, & 9 have reserved values; 7 & 8 are unused
   */
  command.writeUInt8(0xaa, 0);
  command.writeUInt8(0x64, 1);
  command.writeUInt8(0xbb, 8);

  command.writeUInt8(this.rotorSpeed || 0, 2);
  command.writeUInt8(this.trim       || 0, 3);
  command.writeUInt8(this.yaw        || 0, 4);
  command.writeUInt8(this.pitch      || 0, 5);
  /*
   * Buffers can come with random crap in them; init to 0
   */
  for (var i = 2; i < 8; i++) command.writeUInt8(0x00, i);

  return command;
};

module.exports = Command;
