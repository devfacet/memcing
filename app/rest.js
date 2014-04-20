/*
 * Memcing
 * Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

// rest module implements REST API related functions.

// Init reqs
/* jslint node: true */
'use strict';

var mQ      = require('q'),
    mHTTP   = require('http'),
    mURL    = require('url'),
    mQS     = require('querystring')
;

// Init the module
exports = module.exports = function(iConfig, iCache) {

  // Init vars
  var config        = {isDebug: false},
      listenOpt     = {
        http: {
          isEnabled:  false,
          hostname:   'localhost',
          port:       12080
        }
      },
      regex         = {
        number:     new RegExp('^(-*)[0-9]+(\\.[0-9]+)?$', 'g')
      },

      listen,       // listen - function
      listenReq     // request listener - function
  ;

  // Check params
  if(typeof iCache !== 'object') throw new Error('Invalid cache object!');

  if(iConfig) {
    if(iConfig.isDebug === true)         config.isDebug            = true;
    if(iConfig.http.isEnabled === true)  listenOpt.http.isEnabled  = true;
    if(!iConfig.http.hostname)           listenOpt.http.hostname   = ('' + iConfig.http.hostname);
    if(!isNaN(iConfig.http.port))        listenOpt.http.port       = iConfig.http.port;
  }

  // Listens for HTTP requests.
  listen = function listen() {

    // Init vars
    var deferred  = mQ.defer(),
        hostname  = listenOpt.http.hostname,
        port      = listenOpt.http.port,
        server    = mHTTP.createServer(listenReq)
    ;

    // listen
    server.listen(port, hostname, function() {
      deferred.resolve('Server is listening on ' + server.address().address + ':' + server.address().port);
    });

    // error
    server.on('error', function(e) {
      deferred.reject(e);
    });

    return deferred.promise;
  };

  // Request listener function HTTP server.
  listenReq = function reqListener(req, res) {

    // Init vars
    var up      = mURL.parse(req.url, true, false),
        resHdr  = {'Content-Type': 'application/json'}
    ;
    //console.log(up); // for debug

    if(up && up.pathname) {
      var pathAry = up.pathname.split('/');
      //console.log(pathAry); // for debug

      if(pathAry[1] == 'entries') {
        if(pathAry[2]) { // element
          var tElem = (regex.number.test(pathAry[2]) && !isNaN(pathAry[2]/1)) ? pathAry[2]/1 : pathAry[2];

          if(req.method == 'GET') {
            var cg = iCache.get(tElem);
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
                dLmt    = iCache.sizeOfPerEntry()*2
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
                      eVal    = (qsp && qsp.val && regex.number.test(qsp.val) && !isNaN(qsp.val/1)) ? qsp.val/1 : ((qsp && qsp.val) ? qsp.val : null),
                      eExp    = (qsp && qsp.exp) ? qsp.exp : null,
                      setTrig = true
                  ;

                  if(req.method == 'POST') {
                    var cg = iCache.get(tElem);
                    if(cg) {
                      res.writeHead(409, resHdr);
                      res.end(JSON.stringify({code: '409', message: 'Conflict', entry: cg}));
                      setTrig = false;
                    }
                  }

                  if(setTrig === true) {
                    var cs = iCache.set(tElem, eVal, eExp);
                    if(!cs.error) {
                      res.writeHead(200, resHdr);
                      res.end(JSON.stringify(iCache.get(tElem)));
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
            iCache.del(tElem);
            res.writeHead(200, resHdr);
            res.end();
          } else {
            res.writeHead(405, resHdr);
            res.end(JSON.stringify({code: '405', message: 'Method Not Allowed'}));
          }
        } else { // collection
          if(req.method == 'GET') {
            res.writeHead(200, resHdr);

            if(iCache.numOfEntry() > 0) {
              var cd = iCache.entries(),
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
            iCache.drop();
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
    } else {
      res.writeHead(500, resHdr);
      res.end(JSON.stringify({code: '500', message: 'Internal Server Error'}));      
    }
  };

  // Return
  return {
    listen: listen
  };
};