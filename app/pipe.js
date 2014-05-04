/*
 * Memcing
 * Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

// pipe module implements stream operations.
// 
// TODO: This module needs a lot of things such as mime type detection, better line reader, etc.
//       For now just keep it simple. 

// Init reqs
/* jslint node: true */
'use strict';

var utilex = require('utilex'),
    q      = require('q')
;

// Init the module
exports = module.exports = function(options, cacheInstance) {

  // Init vars
  var config          = {isDebug: false, verbose: 1},

      stdinHasPipe,   // checks stdin - function
      stdoutHasPipe,  // checks stdout - function
      start           // start - function
  ;

  // Check params
  if(typeof cacheInstance !== 'object') throw new Error('Invalid cache instance!');

  if(options) {
    if(options.isDebug === true)      config.isDebug = true;
    if(options.verbose !== undefined) config.verbose = options.verbose;
  }

  // Returns whether is there a stream on stdin or not.
  stdinHasPipe = function stdinHasPipe() {
    return (process.stdin.isTTY === true) ? false : true;
  };

  // Returns whether is there a stream on stdout or not.
  stdoutHasPipe = function stdoutHasPipe() {
    return (process.stdout.isTTY === true) ? false : true;
  };

  // Starts reading
  start = function start() {

    if(config.isDebug) utilex.tidyLog('[pipe.start]: called');

    // Init vars
    var deferred = q.defer();

    // Check config
    if(stdinHasPipe() !== true) {
      deferred.resolve();
      return deferred.promise;      
    }

    var StrDecoder = require('string_decoder').StringDecoder,
        decoder    = new StrDecoder('utf8'),
        lines      = [],
        buffer     = '',
        i,
        cacheCmd
    ;

    process.stdin.on('readable', function(chunk) {
      while (null !== (chunk = process.stdin.read())) {
        //process.stdout.write(chunk);    // for debug
        //console.log(chunk);             // for debug

        buffer += decoder.write(chunk);   // decode chunk data
        lines   = buffer.split(/\r?\n/g); // split from line endings
        buffer  = lines.pop();            // keep the last part

        for (i = 0; i < lines.length; i++) {
          cacheCmd = cacheInstance.execCmd(lines[i]); // Execute the command

          if(config.isDebug) utilex.tidyLog('[pipe.line.i]: ' + JSON.stringify({cmd: cacheCmd.cmd, cmdArgs: cacheCmd.cmdArgs, cmdRes: cacheCmd.cmdRes}));
        }
      }

      if(buffer) {
        cacheCmd = cacheInstance.execCmd(buffer); // Execute the command

        if(config.isDebug) utilex.tidyLog('[pipe.line.b]: ' + JSON.stringify({cmd: cacheCmd.cmd, cmdArgs: cacheCmd.cmdArgs, cmdRes: cacheCmd.cmdRes}));
      }
    });

    process.stdin.on('end', function() {
      deferred.resolve();
    });

    return deferred.promise;
  };

  // Return
  return {
    stdinHasPipe: stdinHasPipe,
    stdoutHasPipe: stdoutHasPipe,
    start: start
  };
};