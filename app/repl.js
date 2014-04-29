/*
 * Memcing
 * Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

// repl module implements REPL.

// Init reqs
/* jslint node: true */
'use strict';

var readline = require('readline');

// Init the module
exports = module.exports = function(options, cacheInstance) {

  // Init vars
  var config = {isDebug: false},
      start  // listen - function
  ;

  // Check params
  if(typeof cacheInstance !== 'object') throw new Error('Invalid cache instance!');

  if(options) {
    if(options.isDebug === true) config.isDebug = true;
  }

  // Starts repl
  start = function start() {

    // Init the pipe
    var rl = readline.createInterface({input: process.stdin, output: process.stdout});
    rl.setPrompt('> '); // set prompt
    rl.prompt();

    // line event
    rl.on('line', function(iLine) {

      // Check the input
      if(!iLine.trim()) { rl.prompt(); return; }

      // Execute the command
      var cp = cacheInstance.execCmd(iLine);

      // for debug
      if(config.isDebug === true) {
        if(cp.cmd) {
          console.log({cmd: cp.cmd, cmdArgs: cp.cmdArgs});

          if(cp.cmd == 'stats') {
            console.log(JSON.stringify(cp.cmdRes, null, 2));
          } else {
            console.log(cp.cmdRes);
          }

          // NOTE: Do not vacuum here for dump command.
        }
        if(cp.cmdRes) {
          if(cp.cmdRes.error) console.log('ERROR: ' + cp.cmdRes.error);
          if(cp.cmdRes.exit && cp.cmdRes.exit === true) process.exit(0);
        }
        rl.prompt();
        return;
      }

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
          if(cp.cmdRes.exit && cp.cmdRes.exit === true) process.exit(0);
          break;
        default:
          if(cp.cmdRes && cp.cmdRes.error) {
            console.log('ERROR: ' + cp.cmdRes.error);
          } else {
            console.log('ERROR: Unexpected command!' + cp);
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
  };

  // Return
  return {
    start: start
  };
};