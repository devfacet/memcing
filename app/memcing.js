/*
 * Memcing
 * Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

// Init reqs
/* jslint node: true */
'use strict';

var mReadline = require('readline'),
    mUtilex   = require('utilex'),
    mCache    = require('./cache'),
    mHelp     = require('./help'),
    mConfig   = require('./config'),
    mRest     = require('./rest')
;

// Init vars
var gConfig   = mConfig().get(),
    gCache    = mCache(gConfig.cache),
    gRest     = mRest(gConfig.listen, gCache)
;

// Check whether help or not
if(gConfig.isHelp || (!gConfig.isIactive && !gConfig.loadFile)) mHelp.helpForShell();

// Load file
if(gConfig.loadFile) {
  gCache.loadFile(gConfig.loadFile).then(function() { // load file
    if(gConfig.listen.http.isEnabled || gConfig.isIactive) {
      if(gConfig.listen.http.isEnabled) { // listen
        gRest.listen().then(function() {
          if(gConfig.isIactive) cmdIactive(); // interactive mode
        }, function(err) {
          mUtilex.tidyLog(err);
          process.exit(0);
        });
      } else if(gConfig.isIactive) {
        cmdIactive(); // interactive mode
      }
    } else {
      process.exit(0); // Nothing else to do
    }
  }, function(err) {
    mUtilex.tidyLog('Error on ' + gConfig.loadFile + ' (' + err + ')');
    process.exit(0);
  });
} else if(gConfig.isIactive) {
  if(gConfig.listen.http.isEnabled) { // listen
    gRest.listen().then(function() {
      cmdIactive(); // interactive mode
    }, function(err) {
      mUtilex.tidyLog(err);
      process.exit(0);
    });
  } else {
    cmdIactive(); // interactive mode
  }
} else {
  process.exit(0); // Nothing else to do
}

// Executes interactive mode command.
function cmdIactive() {

  // Init the pipe
  var rl = mReadline.createInterface({input: process.stdin, output: process.stdout});
  rl.setPrompt('> '); // set prompt
  rl.prompt();

  // line event
  rl.on('line', function(iLine) {

    // Check the line
    if(!iLine.trim()) { rl.prompt(); return; }

    // Execute the command
    var cp = gCache.execCmd(iLine);

    // for debug
    if(gConfig.isDebug === true) {
      if(cp.cmd) {
        mUtilex.tidyLog('[memching.cmdIactive]: ' + cp.cmd + ' ' + cp.cmdArgs.join(' '));
        mUtilex.tidyLog(cp.cmdRes, 'JSONT');
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
        if(gCache.numOfEntry() > 0) {
          var cd    = cp.cmdRes,
              cdLen = gCache.numOfEntry(),
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
}