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
exports = module.exports = function(options, appInstance) {

  // Init vars
  var config    = {debug: false, verbose: 1, isEnabled: false},
      start,    // start - function
      completer // auto complete - function
  ;

  // Check the app
  if(typeof appInstance !== 'object') throw new Error('Invalid app instance!');

  // Check the options
  if(options && typeof options === 'object')
    for(var key in config)
      if(options.hasOwnProperty(key)) config[key] = options[key];

  // Starts repl
  start = function start() {

    // Init vars
    var deferred = q.defer();

    // Check config
    if(config.isEnabled !== true) {
      deferred.resolve();
      return deferred.promise;
    } else if(process.stdin.isTTY !== true) {
      // TODO: There are some issues with TTY Check this code block later.
      //       https://www.npmjs.org/package/ttys
      //       https://github.com/joyent/node/issues/7300

      deferred.reject("There is not a TTY context for interactive mode. (Or there is a pipe/stdin usage.)");
      return deferred.promise;
    }

    var rl = require('readline').createInterface({
      input:      process.stdin,
      output:     process.stdout,
      terminal:   true,
      completer:  completer
    });

    if(config.verbose > 0) utilex.tidyLog('Running on interactive mode. Commands: ' + appInstance.cmdList.join(' '));

    rl.setPrompt('> '); // set prompt
    rl.prompt();

    // line event
    rl.on('line', function(line) {

      // Check the input
      if(!line.trim()) {
        rl.prompt();
        return;
      }

      var cacheCmd = appInstance.execCmd(line); // Execute the command

      if(config.debug) utilex.tidyLog('[repl.line]: ' + JSON.stringify({cmd: cacheCmd.cmd, cmdArgs: cacheCmd.cmdArgs, cmdRes: cacheCmd.cmdRes}));

      switch(cacheCmd.cmd) {
        case 'get':
          console.log((cacheCmd.cmdRes && cacheCmd.cmdRes.val) ? cacheCmd.cmdRes.val : '');
          break;
        case 'set':
        case 'add':
          console.log((cacheCmd.cmdRes.error) ? 'ERROR' : 'STORED');
          break;
        case 'delete':
          console.log((cacheCmd.cmdRes) ? 'DELETED' : 'ERROR');
          break;
        case 'drop':
          console.log((cacheCmd.cmdRes) ? 'DROPPED' : 'ERROR');
          break;
        case 'increment':
        case 'decrement':
          console.log((cacheCmd.cmdRes.error) ? 'ERROR' : cacheCmd.cmdRes.val);
          break;
        case 'dump':
          // Cleanup expired entries
          appInstance.vacuum({exp: true});

          if(appInstance.numOfEntry() > 0) {
            var cData     = cacheCmd.cmdRes,
                cDataLen  = appInstance.numOfEntry(),
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
          console.log(JSON.stringify(cacheCmd.cmdRes, null, 2));
          break;
        case 'vacuum':
          console.log(cacheCmd.cmdRes);
          break;
        case 'exit':
          if(cacheCmd.cmdRes.exit === true) process.exit(0);
          break;
        default:
          if(cacheCmd.cmdRes && cacheCmd.cmdRes.error) {
            console.log('ERROR (' + cacheCmd.cmdRes.error + ')');
          } else {
            console.log('ERROR');
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
      matchingCmds  = appInstance.cmdList;
    } else {
      lineCmds      = lineF.split(' ');
      lastCmd       = lineCmds.pop();

      if(lineCmds.length > 0) {
        cmdList     = appInstance.cmdList.map(function(value) { return lineCmds.join(' ') + ' ' + value; });
      } else {
        cmdList     = appInstance.cmdList;
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