/*
 * Memcing
 * Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

// Init reqs
/* jslint node: true */
'use strict';

var mFS       = require('fs'),
    mReadline = require('readline'),
    mUtilex   = require('utilex'),
    mQ        = require('q'),
    mCache    = require('./cache')
;

// Init vars
var gConfig   = {isHelp: false, isIactive: false, loadFile: null, debug : false, cache: {}},
    gCache,
    gCommands = ['get', 'set', 'add', 'delete', 'increment', 'decrement', 'vacuum', 'stats', 'dump', 'exit'],
    gRegex    = {
      command:    new RegExp('^\\b(' + gCommands.join('|') + ')\\b', 'i'),
      args:       new RegExp('("[^"]*")|([^\\s]+)', 'g'),
      number:     new RegExp('^(-*)[0-9]+(\\.[0-9]+)?$', 'g'),
      trimQuotes: new RegExp('^"|"$', 'g')
    }
;

// Init args
cmdArgParse();

// Check whether help or not
if(gConfig.isHelp || (!gConfig.isIactive && !gConfig.loadFile)) cmdHelp();

// Init cache
gCache = mCache({
  limitInKB:  gConfig.cache.limitInKB,
  vacuumIval: gConfig.cache.vacuumIval,
  eviction:   gConfig.cache.eviction,
  debug:      gConfig.debug
});

if(gConfig.loadFile) {
  // Load file
  cmdLoadFile(gConfig.loadFile).then(function() {
    // Interactive mode
    if(gConfig.isIactive === true) {
      cmdIactive();
    } else {
      // Nothing else to do
      process.exit(0);
    }
  }, function(err) {
    console.log('Error on ' + gConfig.loadFile + ' (' + err + ')');
    process.exit(0);
  });
} else if(gConfig.isIactive === true) {
  // Interactive mode
  cmdIactive();
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
    var cp = cacheCmd(iLine);

    // for debug
    if(gConfig.debug === true) {
      if(cp.cmd) {
        mUtilex.tidyLog('[memching.cmdIactive]: ' + cp.cmd + ' ' + cp.cmdArgs.join(' '));

        // Don't show result for some commands
        if(cp.cmd != 'stats' && cp.cmd != 'dump' && cp.cmd != 'vacuum') console.log(cp.cmdRes);
      }
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
      case 'increment':
      case 'decrement':
        console.log((cp.cmdRes.error) ? 'ERROR' : cp.cmdRes.val);
        break;
      case 'exit':
        if(cp.cmdRes.exit && cp.cmdRes.exit === true) process.exit(0);
        break;
      default:
        if(cp.cmdRes && cp.cmdRes.error) {
          console.log('ERROR: ' + cp.cmdRes.error);
        } else {
          console.log(cp.cmdRes);
        }
    }

    rl.prompt();
  });

  // close event
  rl.on('close', function() {
    console.log('Bye.');
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

// Executes load file command.
function cmdLoadFile(iPath) {

  // Init vars
  var deferred  = mQ.defer(),
      pPath     = ('' + iPath),
      pathSS    = (pPath && mFS.existsSync(pPath)) ? mFS.statSync(pPath) : null,
      lineCntr  = 0,
      lineErr   = null
  ;

  // Check the file
  if(!pathSS || !pathSS.isFile()) {
    deferred.reject('Invalid file! (' + pPath + ')');
    return deferred.promise;
  }

  // Init the pipe
  var rl = mReadline.createInterface({input: mFS.createReadStream(pPath), terminal: false});
  rl.setPrompt('');

  // line event
  rl.on('line', function(iLine) {

    // Check the line
    lineCntr++;
    if(!iLine.trim()) { return; }

    // Execute the command
    var cp = cacheCmd(iLine);
    if(cp.cmdRes && cp.cmdRes.error) {
      lineErr = cp.cmdRes.error + ' - line #' + lineCntr + ': ' + iLine;
      rl.close();
    }
  });

  // close event
  rl.on('close', function() {
    if(lineErr) {
      deferred.reject(lineErr);
    } else {
      deferred.resolve();
    }
  });

  return deferred.promise;
}

// Parses and executes the given cache command.
function cacheCmd(iCmd) {

  // Init vars
  var result  = {cmd: null, cmdArgs: null, cmdRes: null},
      pCmd    = ('' + iCmd).trim()
  ;

  // Check vars
  if(!pCmd) return result;

  // Parse the command
  var cmdMatch    = pCmd.match(gRegex.command),
      cmdArgs     = pCmd.match(gRegex.args)
  ;

  result.cmd      = (cmdMatch instanceof Array && cmdMatch[0]) ? cmdMatch[0].toLowerCase() : null;
  if(cmdArgs instanceof Array) cmdArgs.shift();
  result.cmdArgs  = (cmdArgs instanceof Array) ? cmdArgs : null;

  // Cleanup args
  if(result.cmdArgs) {
    for(var i = 0; i < result.cmdArgs.length; i++) {
      result.cmdArgs[i] = result.cmdArgs[i].replace(gRegex.trimQuotes, ''); // quotes
      if(gRegex.number.test(result.cmdArgs[i]) && !isNaN(result.cmdArgs[i]/1)) {
        result.cmdArgs[i] = result.cmdArgs[i]/1; // number
      }
    }
  }

  // Execute command
  switch(result.cmd) {
    case 'get':
      result.cmdRes = gCache.get(result.cmdArgs[0]);
      break;
    case 'set':
      result.cmdRes = gCache.set(result.cmdArgs[0], result.cmdArgs[1], result.cmdArgs[2]);
      break;
    case 'add':
      result.cmdRes = gCache.add(result.cmdArgs[0], result.cmdArgs[1], result.cmdArgs[2]);
      break;
    case 'delete':
      result.cmdRes = gCache.del(result.cmdArgs[0]);
      break;
    case 'increment':
      result.cmdRes = gCache.increment(result.cmdArgs[0], result.cmdArgs[1]);
      break;
    case 'decrement':
      result.cmdRes = gCache.decrement(result.cmdArgs[0], result.cmdArgs[1]);
      break;
    case 'vacuum':
      result.cmdRes = gCache.vacuum({all: true});
      break;
    case 'stats':
      result.cmdRes = {cache: gCache.stats()};
      break;
    case 'dump':
      result.cmdRes = gCache.dump();
      break;
    case 'exit':
      result.cmdRes = {exit: true};
      break;
    default:
      result.cmdRes = {error: 'Invalid command. (Possible commands: ' + gCommands.join(', ') + ')'};
  }

  return result;
}

// Parses the command arguments.
function cmdArgParse() {

  // Init vars
  var args = mUtilex.tidyArgs();

  // Check args
  if(typeof args['i'] !== 'undefined')           gConfig.isIactive         = true;
  if(typeof args['load-file'] !== 'undefined')   gConfig.loadFile          = args['load-file'];
  if(typeof args['help'] !== 'undefined')        gConfig.isHelp            = true;
  if(typeof args['debug'] !== 'undefined')       gConfig.debug             = true;

  if(typeof args['cache-limit'] !== 'undefined') gConfig.cache.limitInKB   = parseInt(args['cache-limit'], 10);
  if(typeof args['vacuum-ival'] !== 'undefined') gConfig.cache.vacuumIval  = parseInt(args['vacuum-ival'], 10);
  if(typeof args['eviction'] !== 'undefined')    gConfig.cache.eviction    = true;

  return true;
}

// Executes the help command.
function cmdHelp() {

  console.log("Usage: node memching.js [OPTION]...\n");
  console.log("Memcing is an application for simple memory caching.\n");
  console.log("  Options:");
  console.log("    -i             : Interactive mode.");
  console.log("    -load-file     : Load a command file.");
  console.log("    -cache-limit   : Cache limit in KB. Default; 16384 kilobytes");
  console.log("    -vacuum-ival   : Interval for vacuum. Default; 30 seconds");
  console.log("    -eviction      : Eviction mode. Default; false");
  console.log("    -help          : Display help and exit.\n");
  console.log("  Commands:");
  console.log("    get key");
  console.log("    set key value [expire = 0]");
  console.log("    add key value [expire = 0]");
  console.log("    increment key [amount = 1]");
  console.log("    decrement key [amount = 1]");
  console.log("    delete key");
  console.log("    vacuum");
  console.log("    stats");
  console.log("    dump");
  console.log("    exit\n");
  console.log("  Please report issues to https://github.com/cmfatih/memcing/issues\n");

  process.exit(0);
}