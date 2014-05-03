/*
 * Memcing
 * Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

// repl module implements Read-Eval-Print-Loop (REPL).
// 
// TODO: Command result messages should be change.

// Init reqs
/* jslint node: true */
'use strict';

var utilex = require('utilex'),
    q      = require('q')
;

// Init the module
exports = module.exports = function(options, cacheInstance) {

  // Init vars
  var config    = {isDebug: false, isEnabled: false},
      start,    // start - function
      completer // auto complete - function
  ;

  // Check params
  if(typeof cacheInstance !== 'object') throw new Error('Invalid cache instance!');

  if(options) {
    if(options.isDebug === true)    config.isDebug    = true;
    if(options.isEnabled === true)  config.isEnabled  = true;
  }

  // Starts repl
  start = function start() {

    if(config.isDebug) utilex.tidyLog('[repl.start]: called');

    // Init vars
    var deferred = q.defer();

    // Check config
    if(config.isEnabled !== true) {
      deferred.resolve();
      return deferred.promise;
    } else if(process.stdin.isTTY !== true) {
      deferred.reject("There is not a TTY context for interactive mode. (Or there is a pipe/stdin usage.)");
      return deferred.promise;
    }

    var rl = require('readline').createInterface({
      input:      process.stdin, 
      output:     process.stdout, 
      terminal:   true, 
      completer:  completer
    });

    rl.setPrompt('> '); // set prompt
    rl.prompt();

    // line event
    rl.on('line', function(line) {

      // Check the input
      if(!line.trim()) { 
        rl.prompt(); 
        return;
      }

      // Execute the command
      var cp = cacheInstance.execCmd(line);

      if(config.isDebug) utilex.tidyLog('[repl.line]: ' + JSON.stringify({cmd: cp.cmd, cmdArgs: cp.cmdArgs, cmdRes: cp.cmdRes}));

      switch(cp.cmd) {
        case 'get':
          console.log((cp.cmdRes && cp.cmdRes.val) ? cp.cmdRes.val : '');
          break;
        case 'set':
        case 'add':
          console.log((cp.cmdRes.error) ? 'ERROR' : 'STORED');
          break;
        case 'delete':
          console.log((cp.cmdRes) ? 'DELETED' : 'ERROR');
          break;
        case 'drop':
          console.log((cp.cmdRes) ? 'DROPPED' : 'ERROR');
          break;
        case 'increment':
        case 'decrement':
          console.log((cp.cmdRes.error) ? 'ERROR' : cp.cmdRes.val);
          break;
        case 'dump':
          // Cleanup expired entries
          cacheInstance.vacuum({exp: true});

          if(cacheInstance.numOfEntry() > 0) {
            var cData     = cp.cmdRes,
                cDataLen  = cacheInstance.numOfEntry(),
                cDataCnt  = 0,
                cChar     = ''
            ;
            console.log('[');
            for(var key in cData) {
              cDataCnt++;
              cChar = (cDataCnt < cDataLen) ? ',' : '';
              console.log(JSON.stringify(cData[key]) + cChar);
            }
            console.log(']');
          } else {
            console.log('[]');
          }
          break;
        case 'stats':
          console.log(JSON.stringify(cp.cmdRes, null, 2));
          break;
        case 'vacuum':
          console.log(cp.cmdRes);
          break;
        case 'exit':
          if(cp.cmdRes.exit === true) process.exit(0);
          break;
        default:
          if(cp.cmdRes && cp.cmdRes.error) {
            console.log('ERROR: ' + cp.cmdRes.error);
          } else {
            console.log('ERROR: Unexpected command!' + (cp.cmd || ''));
          }
      }

      rl.prompt();
    });

    // close event
    rl.on('close', function() {
      process.exit(0);
    });

    // SIGINT (^C) event
    rl.on('SIGINT', function() {
      rl.clearLine(process.stdin, 0); // clear prompt
      rl.question('All the cached data will be gone. Are you sure? (y/N) ', function(answer) {
        if(answer.match(/^(y|yes)$/i)) {
          rl.close();
        } else {
          rl.prompt();
        }
      });
    });

    deferred.resolve();

    return deferred.promise;
  };

  // Auto complete function for readline.
  completer = function completer(line) {

    // Init vars
    var lineF         = line.trim(),
        cmdList,      // cache command list
        lineCmds,     // commands on the line
        lastCmd,      // last command on the line
        fltrdCmds,    // filtered commands
        matchingCmds  // matching commands
    ;

    if(!lineF) {
      matchingCmds  = cacheInstance.cmdList;
    } else {
      lineCmds      = lineF.split(' ');
      lastCmd       = lineCmds.pop();

      if(lineCmds.length > 0) {
        cmdList     = cacheInstance.cmdList.map(function(value) { return lineCmds.join(' ') + ' ' + value; });
      } else {  
        cmdList     = cacheInstance.cmdList;
      }

      fltrdCmds = cmdList.filter(function(element) { return element.indexOf(lineF) === 0; });

      if(!fltrdCmds.length) {
        matchingCmds  = null;
      } else if(fltrdCmds.length === 1) {
        matchingCmds  = [fltrdCmds[0] + ' '];
      } else {
        if(lineCmds.length > 0) {
          fltrdCmds   = fltrdCmds.map(function(value) { return value.split(' ').pop(); });
        }

        matchingCmds  = fltrdCmds;
      }
    }

    return [matchingCmds, line];
  };

  // Return
  return {
    start: start
  };
};