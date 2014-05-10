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
exports = module.exports = function(options, appInstance) {

  // Init vars
  var config         = {
        debug:       false,
        verbose:     1,
        stdin:       {kind: 'stream', csv: {delimiter: ',', fieldKey: 1, fieldFilter: null}} // stream, cmd or csv
      },
      stdinHasPipe,  // checks stdin - function
      stdoutHasPipe, // checks stdout - function
      start          // start - function
  ;

  // Check the app
  if(typeof appInstance !== 'object') throw new Error('Invalid app instance!');

  // Check the options
  if(options) {
    if(options.debug === true)        config.debug   = true;
    if(options.verbose !== undefined) config.verbose = options.verbose;

    if(options.stdin !== undefined) {
      if(options.stdin.kind === 'stream' || options.stdin.kind === 'cmd' || options.stdin.kind === 'csv') {
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

    if(config.debug) utilex.tidyLog('[pipe.start]');

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

    if(config.stdin.kind === 'stream' || config.stdin.kind === 'cmd') {

      // Init vars
      var StrDecoder  = require('string_decoder').StringDecoder,
          decoder     = new StrDecoder('utf8'),
          cntRead     = 0,
          cntReadable = 0,
          lines       = [],
          lineF       = '',
          buffer      = '',
          chunk,
          spaceIndex
      ;

      // readable event
      process.stdin.on('readable', function() {

        // Read stdin
        while (null !== (chunk = process.stdin.read())) {

          buffer += decoder.write(chunk);   // decode chunk data
          lines   = buffer.split(/\r?\n/g); // split from line endings
          buffer  = lines.pop();            // keep the last part

          // Execute commands line by line
          for (i = 0; i < lines.length; i++) {
            if(lines[i]) {
              lineF = ('' + lines[i]).trim();

              if(config.stdin.kind === 'stream') {
                spaceIndex = lineF.indexOf(' ');
                cacheCmd   = appInstance.set(lineF.substring(0, spaceIndex), lineF.substring(spaceIndex + 1)); // TODO: What to do with errors?
              }
              else if(config.stdin.kind === 'cmd') {
                cacheCmd = appInstance.execCmd(lineF); // TODO: What to do with errors?
              }

              if(config.debug) utilex.tidyLog('[pipe.start.stdin.readable.lines]: ' + lines[i] + ' - ' + JSON.stringify(cacheCmd));
            }
          }

          cntRead++;
        }

        // Check buffer and execute the command if any
        if(buffer) {
          buffer = ('' + buffer).trim();

          if(config.stdin.kind === 'stream') {
            spaceIndex = buffer.indexOf(' ');
            cacheCmd   = appInstance.set(buffer.substring(0, spaceIndex), buffer.substring(spaceIndex + 1)); // TODO: What to do with errors?
          }
          else if(config.stdin.kind === 'cmd') {
            cacheCmd = appInstance.execCmd(buffer); // TODO: What to do with errors?
          }

          if(config.debug) utilex.tidyLog('[pipe.start.stdin.readable.buffer]: ' + buffer + ' - ' + JSON.stringify(cacheCmd));

          buffer = '';
        }

        cntReadable++;

        if(config.debug) utilex.tidyLog('[pipe.start.stdin.readable]:' + cntReadable);
      });

      // end event
      process.stdin.on('end', function() {
        if(config.debug) utilex.tidyLog('[pipe.start.stdin.end]: ' + cntReadable + ':' + cntRead);

        deferred.resolve();
      });

    } else if(config.stdin.kind === 'csv') {

      // Init vars
      var fieldKey    = config.stdin.csv.fieldKey-1,
          fieldFilter = (config.stdin.csv.fieldFilter) ? config.stdin.csv.fieldFilter.split(',') : null,
          entryKey,
          entryVal,
          csvFields
      ;

      // Read csv
      csv()
      .from.stream(process.stdin, {delimiter: config.stdin.csv.delimiter, comment: '#'})
      .on('record', function(record) {

        if(record[fieldKey]) {

          entryKey  = (''+record[fieldKey]).trim();
          csvFields = record;

          // Get only filtered fields
          if(fieldFilter) {
            csvFields = [];
            for(i = 0; i < fieldFilter.length; i++) {
              if(record[fieldFilter[i]-1]) csvFields.push(record[fieldFilter[i]-1]);
            }
          }

          // Set as string or `parse-able` array
          entryVal = (csvFields.length === 1) ? csvFields[0] : "['" + csvFields.join("','") + "']";

          cacheCmd = appInstance.set(entryKey, entryVal); // TODO: What to do with errors?

          if(config.debug) utilex.tidyLog('[pipe.start.csv.record.cacheCmd]: ' + JSON.stringify(record) + ' - ' + JSON.stringify(cacheCmd));
        }
      })
      .on('error', function(err) {
        deferred.reject(err.message);
      })
      .on('end', function(count) {
        if(config.debug) utilex.tidyLog('[pipe.start.csv.end]: ' + count);

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