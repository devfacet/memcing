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
    mHelp     = require('./help'),
    mConfig   = require('./config'),
    mRegex    = require('./regex'),
    mQS       = require('querystring')
;

// Init vars
var gConfig   = mConfig().get(),
    gCache    = mCache(gConfig.cache)
;

// Check whether help or not
if(gConfig.isHelp || (!gConfig.isIactive && !gConfig.loadFile)) mHelp.helpForShell();

// Load file
if(gConfig.loadFile) {
  gCache.loadFile(gConfig.loadFile).then(function() { // load file
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

// Execute listen commands.
function cmdListen() {

  // Init vars
  var deferred  = mQ.defer(),
      hostname  = gConfig.listen.http.hostname || 'localhost',
      port      = gConfig.listen.http.port || 12080,
      resHdr    = {'Content-Type': 'application/json'}
  ;

  // Init http
  var server = mHTTP.createServer(function(req, res) {

    var up = mURL.parse(req.url, true, false);
    //console.log(up); // for debug

    if(up && up.pathname) {
      var pathAry = up.pathname.split('/');
      //console.log(pathAry); // for debug

      if(pathAry[1] == 'entries') {

        if(pathAry[2]) {
          // element

          var tElem = (mRegex.number.test(pathAry[2]) && !isNaN(pathAry[2]/1)) ? pathAry[2]/1 : pathAry[2];

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
                      eVal    = (qsp && qsp.val && mRegex.number.test(qsp.val) && !isNaN(qsp.val/1)) ? qsp.val/1 : ((qsp && qsp.val) ? qsp.val : null),
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
              var cd = gCache.entries(),
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


  return deferred.promise;
}