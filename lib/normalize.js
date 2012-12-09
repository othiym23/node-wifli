'use strict';

/*
 * CONSTANTS
 */
var MAX_ROTOR_SPEED = 256
  , LEFT_BASE       = 0
  , RIGHT_BASE      = 128
  , MIN_AXIS        = -32
  , MAX_AXIS        = 31
  ;

var util = module.exports = {
  axial : function axial(value) {
    value = Math.max(MIN_AXIS, Math.min(MAX_AXIS, value));
    if (value <= 0) {
      return LEFT_BASE + Math.abs(value);
    }
    else {
      return RIGHT_BASE + value;
    }
  },
  vector : function vector(value) {
    return Math.max(0, Math.min(MAX_ROTOR_SPEED, value));
  }
};
