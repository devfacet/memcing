/*
 * Memcing
 * Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

// pipe module implements stream operations.
// 
// TODO: This module needs a lot of things such as mime type detection, JSON support, etc.
//       For now just keep it simple. 

// Init reqs
/* jslint node: true */
'use strict';

var utilex = require('utilex'),
    q      = require('q'),
    csv    = require('csv')
;

// Init the module
exports = module.exports = function(options, cacheInstance) {

  // Init vars
  var config          = {
        isDebug:      false,
        verbose:      1,
        stdin: {
          kind: 'cmd', // cmd or csv
          csv: {delimiter: ',', fieldKey: 1, fieldFilter: null}
        }
      },
      stdinHasPipe,   // checks stdin - function
      stdoutHasPipe,  // checks stdout - function
      start           // start - function

  ;

  // Check options
  if(typeof cacheInstance !== 'object') throw new Error('Invalid cache instance!');

  if(options) {
    if(options.isDebug === true)      config.isDebug = true;
    if(options.verbose !== undefined) config.verbose = options.verbose;

    if(options.stdin !== undefined) {
      if(options.stdin.kind === 'cmd' || options.stdin.kind === 'csv') {
        config.stdin.kind = options.stdin.kind;
      }

      if(options.stdin.csv !== undefined) {
        if(options.stdin.csv.delimiter !== undefined) {
          if(options.stdin.csv.delimiter === 'tab') {
            config.stdin.csv.delimiter = '\t';
          } else {
            config.stdin.csv.delimiter = options.stdin.csv.delimiter;
          }
        }

        if(options.stdin.csv.fieldKey !== undefined && !isNaN(options.stdin.csv.fieldKey)) {
          config.stdin.csv.fieldKey = options.stdin.csv.fieldKey;
        }

        if(options.stdin.csv.fieldFilter) {
          config.stdin.csv.fieldFilter = options.stdin.csv.fieldFilter;
        }
      }
    }
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

    if(config.isDebug) utilex.tidyLog('[pipe.start]');

    // Init vars
    var deferred = q.defer(),
        cacheCmd,
        i
    ;

    // Check config
    if(stdinHasPipe() !== true) {
      deferred.resolve();
      return deferred.promise;      
    }

    if(config.stdin.kind === 'cmd') {

      // Init vars
      var StrDecoder    = require('string_decoder').StringDecoder,
          decoder       = new StrDecoder('utf8'),
          counterRead   = 0,
          counterEvent  = 0,
          lines         = [],
          buffer        = '',
          chunk
      ;

      // readable event
      process.stdin.on('readable', function() {
        if(config.isDebug) utilex.tidyLog('[pipe.start.stdin.readable]');

        // read stdin
        while (null !== (chunk = process.stdin.read())) {
          //process.stdout.write(chunk);    // for debug
          //console.log(chunk);             // for debug

          buffer += decoder.write(chunk);   // decode chunk data
          lines   = buffer.split(/\r?\n/g); // split from line endings
          buffer  = lines.pop();            // keep the last part

          // Execute commands
          for (i = 0; i < lines.length; i++) {
            if(lines[i]) {
              cacheCmd = cacheInstance.execCmd(lines[i]); // TODO: What to do with errors?

              if(config.isDebug) utilex.tidyLog('[pipe.start.stdin.readable.lines]: ' + lines[i] + ' - ' + JSON.stringify(cacheCmd));
            }
          }

          counterRead++;
        }

        // Check buffer and execute the command if any
        if(buffer) {
          cacheCmd  = cacheInstance.execCmd(buffer); // TODO: What to do with errors?
          buffer    = '';

          if(config.isDebug) utilex.tidyLog('[pipe.start.stdin.readable.buffer]: ' + buffer + ' - ' + JSON.stringify(cacheCmd));
        }

        counterEvent++;
      });

      // end event
      process.stdin.on('end', function() {
        if(config.isDebug) utilex.tidyLog('[pipe.start.stdin.end]: ' + counterEvent + ':' + counterRead);

        deferred.resolve();
      });

    } else if(config.stdin.kind === 'csv') {

      // Init vars
      var entryKey,
          entryVal,
          entryValFields  = [],
          fieldKey        = config.stdin.csv.fieldKey-1,
          fieldFilter     = (config.stdin.csv.fieldFilter) ? config.stdin.csv.fieldFilter.split(',') : null
      ;

      // Read csv
      csv()
      .from.stream(process.stdin, {
        delimiter: config.stdin.csv.delimiter,
        comment: '#'
      })
      .on('record', function(record, index) {
        if(config.isDebug) utilex.tidyLog('[pipe.start.csv.record]: ' + JSON.stringify(record));

        entryKey = record[fieldKey];

        if(entryKey) {
          if(fieldFilter) {
            entryValFields = [];
            for(i = 0; i < fieldFilter.length; i++) {
              if(record[fieldFilter[i]-1]) entryValFields.push(record[fieldFilter[i]-1]);
            }
          } else {
            entryValFields = record;
          }

          entryVal  = (entryValFields.length === 1) ? entryValFields[0] : "['" + entryValFields.join("','") + "']";

          cacheCmd  = cacheInstance.set(entryKey, entryVal); // TODO: What to do with errors?

          if(config.isDebug) utilex.tidyLog('[pipe.start.csv.record].cacheCmd: ' + JSON.stringify(cacheCmd));
        }
      })
      .on('error', function(err) {
        deferred.reject(err.message);
      })
      .on('end', function(count) {
        if(config.isDebug) utilex.tidyLog('[pipe.start.csv.end]: ' + count);

        deferred.resolve();
      });
    }

    return deferred.promise;
  };

  // Return
  return {
    stdinHasPipe: stdinHasPipe,
    stdoutHasPipe: stdoutHasPipe,
    start: start
  };
};