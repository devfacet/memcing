/*
 * Memcing
 * Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

// rest module implements REST API.

// Init reqs
/* jslint node: true */
'use strict';

var utilex = require('utilex'),
    q      = require('q'),
    http   = require('http'),
    url    = require('url'),
    qs     = require('querystring')
;

// Init the module
exports = module.exports = function(options, cacheInstance) {

  // Init vars
  var config          = {isDebug: false, verbose: 1},
      listenOpt       = {
        http: {
          isEnabled:  false, 
          hostname:   'localhost', 
          port:       12080
        }
      },
      regex           = {
        number:       new RegExp('^(-*)[0-9]+(\\.[0-9]+)?$', 'g')
      },

      listen,         // listen - function
      listenReq,      // request listener - function

      addrOf          // address - function
  ;

  // Check options
  if(typeof cacheInstance !== 'object') throw new Error('Invalid cache instance!');

  if(options) {
    if(options.isDebug === true)          config.isDebug            = true;
    if(options.verbose !== undefined)     config.verbose            = options.verbose;

    if(options.http) {
      if(options.http.isEnabled === true) listenOpt.http.isEnabled  = true;
      if(options.http.hostname)           listenOpt.http.hostname   = ('' + options.http.hostname);
      if(!isNaN(options.http.port))       listenOpt.http.port       = options.http.port;
    }
  }

  // Returns the address of the given kind
  addrOf = function addrOf(kind) {
    if(kind === 'http') {
      return listenOpt.http.hostname + ':' + listenOpt.http.port;
    }

    return;
  };

  // Starts HTTP server.
  listen = function listen() {

    // Init vars
    var deferred = q.defer();

    // http
    if(options.http.isEnabled === true) {
      var server = http.createServer(listenReq);

      // listen
      server.listen(listenOpt.http.port, listenOpt.http.hostname, function() {
        if(config.verbose > 0) utilex.tidyLog('Server is listening on ' + server.address().address + ':' + server.address().port);

        deferred.resolve();
      });

      // error
      server.on('error', function(e) {
        deferred.reject(e);
      });

    } else {
      deferred.resolve();
    }

    return deferred.promise;
  };

  // Request listener function HTTP server.
  listenReq = function reqListener(req, res) {

    // Init vars
    var urlParse  = url.parse(req.url, true, false),
        resHdr    = {'Content-Type': 'application/json'}
    ;

    if(urlParse && urlParse.pathname) {
      var pathAry = urlParse.pathname.split('/');
      pathAry.shift(); // remove first element

      if(config.isDebug === true) utilex.tidyLog('[rest.listenReq.pathAry]: ' + JSON.stringify(pathAry));

      if(pathAry[0] === 'entries') {
        if(pathAry[1]) { // element
          var element = (regex.number.test(pathAry[1]) && !isNaN(pathAry[1]/1)) ? pathAry[1]/1 : pathAry[1];

          if(req.method === 'GET') {
            var cg = cacheInstance.get(element);
            if(cg) {
              res.writeHead(200, resHdr);
              res.end(JSON.stringify(cg));
            } else {
              res.writeHead(404, resHdr);
              res.end(JSON.stringify({code: '404', message: 'Not Found'}));
            }
          } else if(req.method === 'PUT' || req.method === 'POST') {
            var bodyAry = [],
                dataLen = 0,
                dataLmt = cacheInstance.entryMaxSize()*2 // TODO: Find a better approach.
            ;

            req.on('data', function(chunk) {
              //if(config.isDebug === true) utilex.tidyLog('[rest.listenReq.req.data]: ' + chunk.length + ' - ' + dataLen + ' - ' + dataLmt);

              // NOTE: Ignore rest of the data and give 413 error at end of the request.
              // TODO: Re-think this part, maybe it should destroy the connection instead of 
              // try to return a `good` message (413).
              if(dataLen >= dataLmt) {
                return false;
              } else {
                dataLen += chunk.length;
                bodyAry.push(chunk);
              }
            });

            req.on('end', function() {
              if(dataLen >= dataLmt) {
                res.writeHead(413, resHdr);
                res.end(JSON.stringify({code: '413', message: 'Request Entity Too Large'}));
              } else {
                
                if(config.isDebug === true) utilex.tidyLog('[rest.listenReq.req.end]: ' + bodyAry.join());

                if(req.headers['content-type'] === 'application/x-www-form-urlencoded') {
                  var qsp       = qs.parse(bodyAry.join()),
                      entryVal  = (qsp && qsp.val && regex.number.test(qsp.val) && !isNaN(qsp.val/1)) ? qsp.val/1 : ((qsp && qsp.val) ? qsp.val : null),
                      entryExp  = (qsp && qsp.exp) ? qsp.exp : null,
                      setTrig   = true
                  ;

                  if(req.method === 'POST') {
                    var cg = cacheInstance.get(element);
                    if(cg) {
                      res.writeHead(409, resHdr);
                      res.end(JSON.stringify({code: '409', message: 'Conflict', entry: cg}));
                      setTrig = false;
                    }
                  }

                  if(setTrig === true) {
                    var cs = cacheInstance.set(element, entryVal, entryExp);
                    if(!cs.error) {
                      res.writeHead(200, resHdr);
                      res.end(JSON.stringify(cacheInstance.get(element)));
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
          } else if(req.method === 'DELETE') {
            cacheInstance.del(element);
            res.writeHead(200, resHdr);
            res.end();
          } else {
            res.writeHead(405, resHdr);
            res.end(JSON.stringify({code: '405', message: 'Method Not Allowed'}));
          }
        } else { // collection
          if(req.method === 'GET') {
            res.writeHead(200, resHdr);

            // Cleanup expired entries
            cacheInstance.vacuum({exp: true});

            if(cacheInstance.numOfEntry() > 0) {
              var cData = cacheInstance.entries(),
                  cChar = ''
              ;
              res.write('[');
              for(var key in cData) {
                res.write(cChar + '\n' + JSON.stringify(cData[key]));
                if(!cChar) cChar = ',';
              }
              res.write('\n]');
            } else {
              res.write('[]');
            }

            res.end();
          } else if(req.method === 'DELETE') {
            cacheInstance.drop();
            res.writeHead(200, resHdr);
            res.end();
          } else {
            res.writeHead(405, resHdr);
            res.end(JSON.stringify({code: '405', message: 'Method Not Allowed'}));
          }
        }
      } else if(pathAry[0]) {
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
    listen: listen,
    addrOf: addrOf
  };
};