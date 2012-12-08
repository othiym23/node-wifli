'use strict';

var path    = require('path')
  , net     = require('net')
  , Command = require(path.join(__dirname, 'lib', 'command'))
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
      response.readUInt8(8) !== 0xbb) {
    console.error("unexepected data from WiFli");
    console.dir(response);
  }
  else {
    console.log("helicopter battery level: %d", response.readUInt8(4));
  }
}

function WiFli () {
}

WiFli.prototype.connect = function (callback) {
  this.connection = net.connect(HELIPORT, HELIADDRESS);
  this.on('data', dumpResponse);
  this.on('connect', function () {
    console.log('connected to WiFli');
  });

  if (callback) this.on('connect', callback);
};

WiFli.prototype.sendCommand = function (command) {
  this.connection.write(new Command(command));
};

WiFli.prototype.sendReset = function () {
  this.sendCommand();
};