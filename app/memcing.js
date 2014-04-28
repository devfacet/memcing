/*
 * Memcing
 * Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

// Init reqs
/* jslint node: true */
'use strict';

var utilex  = require('utilex'),
    cache   = require('./cache'),
    rest    = require('./rest'),
    repl    = require('./repl')
;

// Init vars
var appArgs     = utilex.tidyArgs(),
    appConfig   = {
      isDebug:    false,
      isIactive:  false,
      loadFile:   null,
      rest: {
        http: {}
      },
      cache: {}
    },
    appCache,   // cache instance  
    appREST,    // rest instance
    appREPL     // repl instance
;

// Check for help
if(typeof appArgs['help'] !== 'undefined')  cmdHelp();

// Config - global
if(typeof appArgs['debug'] !== 'undefined') appConfig.isDebug   = true;
if(typeof appArgs['i'] !== 'undefined')     appConfig.isIactive = true;
if(appArgs['load-file'])                    appConfig.loadFile  = appArgs['load-file'];

// Config - cache
if(appConfig.isDebug === true) appConfig.cache.isDebug = true;
if(typeof appArgs['cache-limit'] !== 'undefined')   appConfig.cache.globLimit   = parseInt(appArgs['cache-limit'],  10);
if(typeof appArgs['entry-limit'] !== 'undefined')   appConfig.cache.entryLimit  = parseInt(appArgs['entry-limit'],  10);
if(typeof appArgs['vacuum-delay'] !== 'undefined')  appConfig.cache.vacuumDelay = parseInt(appArgs['vacuum-delay'], 10);
if(typeof appArgs['eviction'] !== 'undefined')      appConfig.cache.eviction    = true;

// Config - rest
if(appConfig.isDebug === true) appConfig.rest.isDebug = true;
if(typeof appArgs['listen-http'] !== 'undefined') {
  appConfig.rest.http.isEnabled = true;

  var httpAddr = ('' + appArgs['listen-http']).split(':', 2);
  if(httpAddr[0]) {
    appConfig.rest.http.hostname  = httpAddr[0].trim();
    appConfig.rest.http.port      = (httpAddr[1] || null);
  }
}

var appCache = cache(appConfig.cache),
    appREST  = rest(appConfig.rest, appCache),
    appREPL  = repl(appConfig, appCache)
;

if(appConfig.loadFile) {
  appCache.loadFile(appConfig.loadFile).then(function() {
    if(appConfig.rest.http.isEnabled) {
      appREST.listen().then(function(res) {
        utilex.tidyLog(res);
        if(appConfig.isIactive) appREPL.start();
      }, function(err) {
        utilex.tidyLog(err);
        process.exit(0);
      });
    } else if(appConfig.isIactive) {
      appREPL.start();
    } else {
      process.exit(0);
    }
  }, function(err) {
    utilex.tidyLog(err);
    process.exit(0);
  });  
} else if(appConfig.isIactive) {
  if(appConfig.rest.http.isEnabled) {
    appREST.listen().then(function(res) {
      utilex.tidyLog(res);
      appREPL.start();
    }, function(err) {
      utilex.tidyLog(err);
      process.exit(0);
    });
  } else {
    appREPL.start();
  }
} else if(appConfig.rest.http.isEnabled) {
  appREST.listen().then(function(res) {
    utilex.tidyLog(res);
  }, function(err) {
    utilex.tidyLog(err);
    process.exit(0);
  });
} else {
  cmdHelp();
}

// Displays help and exit.
function cmdHelp() {

  console.log("Usage: node memching.js [OPTION]...\n");

  console.log("Memcing is an application for simple memory caching.\n");

  console.log("  Options:");
  console.log("    -i              : Enable interactive mode.");
  console.log("    -load-file      : Load a command file.");
  console.log("    -cache-limit    : Cache size limit in bytes. Default (16MB); 16777216");
  console.log("    -entry-limit    : Entry size limit in bytes. Default (1KB); 1024");
  console.log("    -vacuum-delay   : Delay in seconds for vacuum. Default; 30");
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