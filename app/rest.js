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
    qs     = require('querystring');

// Init the module
exports = module.exports = function(options, appInstance) {

  var config = {debug: false, verbose: 1, http: {isEnabled: false, hostname: null, port: null, server: null}},
      regex  = {number: new RegExp('^(-*)[0-9]+(\\.[0-9]+)?$', 'g')},
      listen,    // listen - function
      listenReq, // request listener - function
      addrOf;    // address - function

  // Check the app
  if(typeof appInstance !== 'object') throw new Error('Invalid app instance!');

  // Check the options
  if(options && typeof options === 'object')
    for(var key in config)
      if(options.hasOwnProperty(key)) config[key] = options[key];

  // Returns the address of the given kind
  addrOf = function addrOf(kind) {
    if(kind === 'http') {
      return config.http.hostname + ':' + config.http.port;
    }

    return;
  };

  // Starts HTTP server.
  listen = function listen() {

    var deferred = q.defer();

    // http
    if(options.http.isEnabled === true) {
      config.http.server = http.createServer(listenReq)
      .listen(config.http.port, config.http.hostname, function() {
        config.http.hostname = config.http.server.address().address;
        config.http.port     = config.http.server.address().port;

        if(config.verbose > 0 || config.debug === true) {
          utilex.conLog('Server is listening on ' + config.http.hostname + ':' + config.http.port);
        }

        deferred.resolve();
      }).on('error', function(e) {
        deferred.reject(e);
      });
    } else {
      deferred.resolve();
    }

    return deferred.promise;
  };

  // Request listener function HTTP server.
  listenReq = function reqListener(req, res) {

    var urlParse = url.parse(req.url, true, false),
        resHdr   = {'Content-Type': 'application/json'};

    if(urlParse && urlParse.pathname) {
      var pathAry = urlParse.pathname.split('/');
      pathAry.shift(); // remove first element

      if(config.debug === true) utilex.conLog('[rest.listenReq.pathAry]: ' + JSON.stringify(pathAry));

      if(pathAry[0] === 'entries') {
        if(pathAry[1]) { // element
          var element = (regex.number.test(pathAry[1]) && !isNaN(pathAry[1]/1)) ? pathAry[1]/1 : pathAry[1];

          if(req.method === 'GET') {
            var cg = appInstance.get(element);
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
                dataLmt = appInstance.entryMaxSize()*2; // TODO: Find a better approach.

            req.on('data', function(chunk) {
              //if(config.debug === true) utilex.conLog('[rest.listenReq.req.data]: ' + chunk.length + ' - ' + dataLen + ' - ' + dataLmt);

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
                
                if(config.debug === true) utilex.conLog('[rest.listenReq.req.end]: ' + bodyAry.join());

                if(req.headers['content-type'] === 'application/x-www-form-urlencoded') {
                  var qsp      = qs.parse(bodyAry.join()),
                      entryVal = (qsp && qsp.val && regex.number.test(qsp.val) && !isNaN(qsp.val/1)) ? qsp.val/1 : ((qsp && qsp.val) ? qsp.val : null),
                      entryExp = (qsp && qsp.exp) ? qsp.exp : null,
                      setTrig  = true;

                  if(req.method === 'POST') {
                    var cg = appInstance.get(element);
                    if(cg) {
                      res.writeHead(409, resHdr);
                      res.end(JSON.stringify({code: '409', message: 'Conflict', entry: cg}));
                      setTrig = false;
                    }
                  }

                  if(setTrig === true) {
                    var cs = appInstance.set(element, entryVal, entryExp);
                    if(!cs.error) {
                      res.writeHead(200, resHdr);
                      res.end(JSON.stringify(appInstance.get(element)));
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
            appInstance.del(element);
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
            appInstance.vacuum({exp: true});

            if(appInstance.numOfEntry() > 0) {
              var cData = appInstance.entries(),
                  cChar = '';

              res.write('[');
              for(var key in cData) {
                if(cData.hasOwnProperty(key)) {
                  res.write(cChar + '\n' + JSON.stringify(cData[key]));
                  if(!cChar) cChar = ',';
                }
              }
              res.write('\n]');
            } else {
              res.write('[]');
            }

            res.end();
          } else if(req.method === 'DELETE') {
            appInstance.drop();
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