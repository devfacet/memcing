/*
 * Memcing
 * Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

// repl module implements repl related functions.

// Init reqs
/* jslint node: true */
'use strict';

var mReadline = require('readline');

// Init the module
exports = module.exports = function(iConfig, iCache) {

  // Init vars
  var config = {isDebug: false},

      start  // listen - function
  ;

  // Check params
  if(typeof iCache !== 'object') throw new Error('Invalid cache object!');

  if(iConfig) {
    if(iConfig.isDebug === true) config.isDebug = true;
  }

  // Starts repl
  start = function start() {

    // Init the pipe
    var rl = mReadline.createInterface({input: process.stdin, output: process.stdout});
    rl.setPrompt('> '); // set prompt
    rl.prompt();

    // line event
    rl.on('line', function(iLine) {

      // Check the line
      if(!iLine.trim()) { rl.prompt(); return; }

      // Execute the command
      var cp = iCache.execCmd(iLine);

      // for debug
      if(config.isDebug === true) {
        if(cp.cmd) {
          console.log(cp);
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
          if(iCache.numOfEntry() > 0) {
            var cd    = cp.cmdRes,
                cdLen = iCache.numOfEntry(),
                cdCnt = 0,
                cc    = ''
            ;
            console.log('[');
            for(var key in cd) {
              cdCnt++;
              cc = (cdCnt < cdLen) ? ',' : '';
              console.log(JSON.stringify(cd[key]) + cc);
            }
            console.log(']');
          } else {
            console.log('[]');
          }
          break;
        case 'stats':
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
      rl.question('All the cached data will be gone. Are you sure? (y/n) ', function(answer) {
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