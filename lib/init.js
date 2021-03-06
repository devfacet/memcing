/*
 * Memcing
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

/* jslint node: true, sub: true */
'use strict';

var utilex = require('utilex');

// Init the module
module.exports = function(options) {

  var appArgs  = utilex.appArgs(),
      appFlags = {},
      appConfig;

  // Check the options
  if(options && typeof options === 'object') {
    if(options.appConfig && typeof options.appConfig === 'object') {
      appConfig = options.appConfig;
    } else {
      throw new Error('Invalid app config instance!');
    }
  } else {
    throw new Error('Invalid app options!');
  }

  // Flags
  appFlags.debug     = (appArgs['debug'] !== undefined) ? true : false;
  appFlags.verbose   = (appArgs['verbose'] !== undefined) ? parseInt(appArgs['verbose'],  10) : 1;
  appFlags.loadFile  = (appArgs['load-file']) ? (appArgs['load-file']) : null;
  appFlags.listen    = (appArgs['listen-http'] !== undefined) ? true : false;
  appFlags.iactive   = (appArgs['i'] !== undefined) ? true : false;

  // Config
  appConfig.debug    = appFlags.debug;
  appConfig.verbose  = appFlags.verbose;
  appConfig.loadFile = appFlags.loadFile;
  appConfig.listen   = appFlags.listen;
  appConfig.iactive  = appFlags.iactive;
  appConfig.cache    = {};
  appConfig.pipe     = {stdin: {csv: {}}};
  appConfig.rest     = {http: {}};
  appConfig.repl     = {};

  // cache
  appConfig.cache.debug   = appConfig.debug;
  appConfig.cache.verbose = appConfig.verbose;
  if(appArgs['cache-limit'] !== undefined)  appConfig.cache.globLimit   = parseInt(appArgs['cache-limit'],  10);
  if(appArgs['entry-limit'] !== undefined)  appConfig.cache.entryLimit  = parseInt(appArgs['entry-limit'],  10);
  if(appArgs['vacuum-delay'] !== undefined) appConfig.cache.vacuumDelay = parseInt(appArgs['vacuum-delay'], 10);
  if(appArgs['eviction'] !== undefined)     appConfig.cache.eviction    = true;

  // pipe
  appConfig.pipe.debug   = appConfig.debug;
  appConfig.pipe.verbose = appConfig.verbose;
  if(appArgs['cmd'] !== undefined) {
    appConfig.pipe.stdin.kind = 'cmd';
  } else if(appArgs['csv'] !== undefined) {
    appConfig.pipe.stdin.kind = 'csv';
  }
  if(appArgs['csv-delimiter'])    appConfig.pipe.stdin.csv.delimiter   = appArgs['csv-delimiter'];
  if(appArgs['csv-field-key'])    appConfig.pipe.stdin.csv.fieldKey    = parseInt(appArgs['csv-field-key'], 10);
  if(appArgs['csv-field-filter']) appConfig.pipe.stdin.csv.fieldFilter = appArgs['csv-field-filter'];

  // rest
  appConfig.rest.debug   = appConfig.debug;
  appConfig.rest.verbose = appConfig.verbose;

  if(appConfig.listen === true) {
    if(appArgs['listen-http'] !== undefined) {
      var listenHTTP = (appArgs['listen-http']) ? appArgs['listen-http'] : '0.0.0.0:12080';

      appConfig.rest.http.isEnabled = true;
      appConfig.rest.http.hostname  = listenHTTP.substring(0, listenHTTP.indexOf(':')).trim();
      appConfig.rest.http.port      = parseInt(listenHTTP.substring(listenHTTP.indexOf(':')+1).trim(), 10);
      if(!appConfig.rest.http.hostname)   appConfig.rest.http.hostname = '0.0.0.0';
      if(isNaN(appConfig.rest.http.port)) appConfig.rest.http.port     = '12080';
      appConfig.rest.http.address   = appConfig.rest.http.hostname + ':' + appConfig.rest.http.port;
    }
  }

  // repl
  appConfig.repl.debug     = appConfig.debug;
  appConfig.repl.verbose   = appConfig.verbose;
  appConfig.repl.isEnabled = (appConfig.iactive === true) ? true : false;

  // Return
  return true;
};