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
    mHTTP     = require('http'),
    mURL      = require('url'),
    mUtilex   = require('utilex'),
    mQ        = require('q'),
    mCache    = require('./cache'),
    mQS       = require('querystring')
;

// Init vars
var gConfig   = {
      isDebug: false,
      isHelp: false,
      isIactive: false,
      loadFile: null,
      listen: {
        http: {
          isEnabled: false,
          hostname: null,
          port: null
        }
      },
      cache: {}
    },
    gCache,
    gCommands = ['get', 'set', 'add', 'delete', 'drop', 'increment', 'decrement', 'dump', 'stats', 'vacuum', 'exit'],
    gRegex    = {
      command:    new RegExp('^\\b(' + gCommands.join('|') + ')\\b', 'i'),
      // TODO: It should support escape chars. Currently \" doesn't work.
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
gCache = mCache(gConfig.cache);

// Load file
if(gConfig.loadFile) {
  cmdLoadFile(gConfig.loadFile).then(function() { // load file
    if(gConfig.listen.http.isEnabled || gConfig.isIactive) {
      if(gConfig.listen.http.isEnabled) { // listen
        cmdListen().then(function() {
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
    cmdListen().then(function() {
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
    var cp = cacheCmd(iLine);

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

// Execute listen commands.
function cmdListen() {

  // Init vars
  var deferred  = mQ.defer(),
      hostname  = gConfig.listen.http.hostname || 'localhost',
      port      = gConfig.listen.http.port || 12080,
      resHdr    = {'Content-Type': 'application/json'}
  ;

  // Init http
  if(gConfig.listen.http.isEnabled) {

    var server = mHTTP.createServer(function(req, res) {

      var up = mURL.parse(req.url, true, false);
      //console.log(up); // for debug

      if(up && up.pathname) {
        var pathAry = up.pathname.split('/');
        //console.log(pathAry); // for debug

        if(pathAry[1] == 'entries') {

          if(pathAry[2]) {
            // element

            var tElem = (gRegex.number.test(pathAry[2]) && !isNaN(pathAry[2]/1)) ? pathAry[2]/1 : pathAry[2];

            if(req.method == 'GET') {
              var cg = gCache.get(tElem);
              if(cg) {
                res.writeHead(200, resHdr);
                res.end(JSON.stringify(cg));
              } else {
                res.writeHead(404, resHdr);
                res.end(JSON.stringify({code: '404', message: 'Not Found'}));
              }
            } else if(req.method == 'PUT' || req.method == 'POST') {
              var bodyAry = [],
                  dLen    = 0,
                  dLmt    = gCache.sizeOfPerEntry()*2
              ;

              req.on('data', function(chunk) {
                //console.log(chunk.length + ' - ' + dLen + ' - ' + dLmt); // for debug
                if(dLen >= dLmt) {
                  return false;
                } else {
                  dLen += chunk.length;
                  bodyAry.push(chunk);
                }
              });

              req.on('end', function() {
                if(dLen >= dLmt) {
                  res.writeHead(413, resHdr);
                  res.end(JSON.stringify({code: '413', message: 'Request Entity Too Large'}));
                } else {
                  if(req.headers['content-type'] == 'application/x-www-form-urlencoded') {
                    var qsp     = mQS.parse(bodyAry.join()),
                        eVal    = (qsp && qsp.val && gRegex.number.test(qsp.val) && !isNaN(qsp.val/1)) ? qsp.val/1 : ((qsp && qsp.val) ? qsp.val : null),
                        eExp    = (qsp && qsp.exp) ? qsp.exp : null,
                        setTrig = true
                    ;

                    if(req.method == 'POST') {
                      var cg = gCache.get(tElem);
                      if(cg) {
                        res.writeHead(409, resHdr);
                        res.end(JSON.stringify({code: '409', message: 'Conflict', entry: cg}));
                        setTrig = false;
                      }
                    }

                    if(setTrig === true) {
                      var cs = gCache.set(tElem, eVal, eExp);
                      if(!cs.error) {
                        res.writeHead(200, resHdr);
                        res.end(JSON.stringify(gCache.get(tElem)));
                      } else {
                        res.writeHead(400, resHdr);
                        res.end(JSON.stringify({code: '400', message: cs.error}));
                      }
                    }
                  } else {
                    res.writeHead(400, resHdr);
                    res.end(JSON.stringify({code: '400', message: 'Bad Request (Use `application/x-www-form-urlencoded` for PUT/POST)'}));
                  }
                }
              });
            } else if(req.method == 'DELETE') {
              gCache.del(tElem);
              res.writeHead(200, resHdr);
              res.end();
            } else {
              res.writeHead(405, resHdr);
              res.end(JSON.stringify({code: '405', message: 'Method Not Allowed'}));
            }
          } else {
            // collection
            
            if(req.method == 'GET') {
              res.writeHead(200, resHdr);

              if(gCache.numOfEntry() > 0) {
                var cd = gCache.dataSet(),
                    cc = ''
                ;
                res.write('[');
                for(var key in cd) {
                  res.write(cc + '\n' + JSON.stringify(cd[key]));
                  if(!cc) cc = ',';
                }
                res.write('\n]');
              } else {
                res.write('[]');
              }

              res.end();
            } else if(req.method == 'DELETE') {
              gCache.drop();
              res.writeHead(200, resHdr);
              res.end();
            } else {
              res.writeHead(405, resHdr);
              res.end(JSON.stringify({code: '405', message: 'Method Not Allowed'}));
            }
          }
        } else if(pathAry[1]) {
          res.writeHead(501, resHdr);
          res.end(JSON.stringify({code: '501', message: 'Not Implemented'}));
        } else {
          res.writeHead(200, resHdr);
          res.end();
        }
      }
    }).listen(port, hostname, function() {
      mUtilex.tidyLog('Server is listening on ' + server.address().address + ':' + server.address().port);
      deferred.resolve();
    });

    server.on('error', function (e) {
      deferred.reject(e);
    });
  }

  return deferred.promise;
}

// Parses the command arguments.
function cmdArgParse() {

  // Init vars
  var args = mUtilex.tidyArgs();

  // Check args
  
  // global config
  if(typeof args['debug'] !== 'undefined')        gConfig.isDebug           = true;
  if(typeof args['help'] !== 'undefined')         gConfig.isHelp            = true;
  if(typeof args['i'] !== 'undefined')            gConfig.isIactive         = true;
  if(args['load-file'])                           gConfig.loadFile          = args['load-file'];

  // cache
  if(typeof args['debug'] !== 'undefined')        gConfig.cache.isDebug     = true;
  if(typeof args['cache-limit'] !== 'undefined')  gConfig.cache.limitInKB   = parseInt(args['cache-limit'], 10);
  if(typeof args['vacuum-ival'] !== 'undefined')  gConfig.cache.vacuumIval  = parseInt(args['vacuum-ival'], 10);
  if(typeof args['eviction'] !== 'undefined')     gConfig.cache.eviction    = true;

  // listen-http
  if(typeof args['listen-http'] !== 'undefined') {
    var tAry = ('' + args['listen-http']).split(':', 2);

    if(tAry[0]) {
      gConfig.listen.http.isEnabled = true;
      gConfig.listen.http.hostname  = tAry[0].trim();
      gConfig.listen.http.port      = (tAry[1] || null);
    }
  }

  return true;
}

// Executes the help command.
function cmdHelp() {

  console.log("Usage: node memching.js [OPTION]...\n");

  console.log("Memcing is an application for simple memory caching.\n");

  console.log("  Options:");
  console.log("    -i              : Enable interactive mode.");
  console.log("    -load-file      : Load a command file.");
  console.log("    -cache-limit    : Cache limit in KB. Default; 16384 kilobytes");
  console.log("    -vacuum-ival    : Interval in seconds for vacuum. Default; 30");
  console.log("    -eviction       : Enable eviction mode.");
  console.log("    -listen-http    : Listen HTTP requests for REST API.");
  console.log("                      Default; localhost:12080");
  console.log("    -help           : Display help and exit.\n");

  console.log("  Commands:");
  console.log("    get key");
  console.log("    set key value [expire = 0]");
  console.log("    add key value [expire = 0]");
  console.log("    increment key [amount = 1]");
  console.log("    decrement key [amount = 1]");
  console.log("    delete key");
  console.log("    drop");
  console.log("    dump");
  console.log("    stats");
  console.log("    vacuum");
  console.log("    exit\n");

  console.log("  Examples:");
  console.log("    node memcing.js -i");
  console.log("    node memcing.js -i -load-file /path/file");
  console.log("    node memcing.js -load-file /path/file -listen-http localhost:12080");
  console.log("    node memcing.js -listen-http localhost:12080 -eviction\n");

  

  console.log("  Please report issues to https://github.com/cmfatih/memcing/issues\n");

  process.exit(0);
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
    case 'drop':
      result.cmdRes = gCache.drop();
      break;
    case 'increment':
      result.cmdRes = gCache.increment(result.cmdArgs[0], result.cmdArgs[1]);
      break;
    case 'decrement':
      result.cmdRes = gCache.decrement(result.cmdArgs[0], result.cmdArgs[1]);
      break;
    case 'dump':
      result.cmdRes = gCache.dataSet();
      break;
    case 'stats':
      result.cmdRes = gCache.stats();
      break;
    case 'vacuum':
      result.cmdRes = gCache.vacuum({all: true});
      break;
    case 'exit':
      result.cmdRes = {exit: true};
      break;
    default:
      result.cmdRes = {error: 'Invalid command: ' + result.cmd + ' (Possible commands: ' + gCommands.join(', ') + ')'};
  }

  return result;
}