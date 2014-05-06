/*
 * Memcing
 * Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

// Init reqs
/* jslint node: true */
'use strict';

var utilex = require('utilex'),
    cache  = require('./cache'),
    pipe   = require('./pipe'),
    rest   = require('./rest'),
    repl   = require('./repl')
;

// Init vars
var appArgs   = utilex.tidyArgs(),
    appFlags  = {debug: false, verbose: 1, loadFile: null, listen: false, iactive: false},
    appConfig = {cache: {}, pipe: {stdin: {csv: {}}}, rest: {http: {}}, repl: {}},
    appCache, // cache instance
    appREST,  // rest instance
    appREPL   // repl instance
;

// Check for arguments
if(appArgs['help'] !== undefined)         cmdHelp();
if(appArgs['load-file'])                  appFlags.loadFile           = appArgs['load-file'];
if(appArgs['listen-http'] !== undefined)  appFlags.listen             = true;
if(appArgs['i'] !== undefined)            appFlags.iactive            = true;
if(appArgs['debug'] !== undefined)        appFlags.debug              = true;
if(appArgs['verbose'] !== undefined)      appFlags.verbose            = parseInt(appArgs['verbose'],  10);

if(appArgs['cache-limit'] !== undefined)  appConfig.cache.globLimit   = parseInt(appArgs['cache-limit'],  10);
if(appArgs['entry-limit'] !== undefined)  appConfig.cache.entryLimit  = parseInt(appArgs['entry-limit'],  10);
if(appArgs['vacuum-delay'] !== undefined) appConfig.cache.vacuumDelay = parseInt(appArgs['vacuum-delay'], 10);
if(appArgs['eviction'] !== undefined)     appConfig.cache.eviction    = true;

if(appArgs['cmd'] !== undefined) {
  appConfig.pipe.stdin.kind = 'cmd';
} else if(appArgs['csv'] !== undefined) {
  appConfig.pipe.stdin.kind = 'csv';
}
if(appArgs['csv-delimiter']) {
  appConfig.pipe.stdin.csv.delimiter = appArgs['csv-delimiter'];
}
if(appArgs['csv-field-key']) {
  appConfig.pipe.stdin.csv.fieldKey = parseInt(appArgs['csv-field-key'], 10);
}
if(appArgs['csv-field-filter']) {
  appConfig.pipe.stdin.csv.fieldFilter = appArgs['csv-field-filter'];
}

if(appFlags.debug === true) {
  appConfig.cache.isDebug = true;
  appConfig.pipe.isDebug  = true;
  appConfig.rest.isDebug  = true;
  appConfig.repl.isDebug  = true;
}

if(appFlags.verbose !== 1) {
  appConfig.cache.verbose = appFlags.verbose;
  appConfig.pipe.verbose  = appFlags.verbose;
  appConfig.rest.verbose  = appFlags.verbose;
  appConfig.repl.verbose  = appFlags.verbose;
}

if(appFlags.listen === true) {
  appConfig.rest.http.isEnabled = true;

  var httpAddr = ('' + appArgs['listen-http']).split(':', 2);
  if(httpAddr[0]) {
    appConfig.rest.http.hostname = httpAddr[0].trim();
    appConfig.rest.http.port     = (httpAddr[1] || null);
  }
}

if(appFlags.iactive === true) appConfig.repl.isEnabled = true;

if(!appFlags.loadFile && !appFlags.listen && !appFlags.iactive && process.stdin.isTTY === true) cmdHelp();

// Create instances
var appCache = cache(appConfig.cache),
    appPIPE  = pipe(appConfig.pipe, appCache),
    appREST  = rest(appConfig.rest, appCache),
    appREPL  = repl(appConfig.repl, appCache)
;

appCache.loadFile(appFlags.loadFile)
.then(appPIPE.start)
.then(appREST.listen)
.then(appREPL.start)
.then(function(res) {
  if(res) utilex.tidyLog(res);
})
.catch(function(err) {
  utilex.tidyLog(err);
  process.exit(0); 
})
.done(function() {
  if(!appFlags.listen && !appFlags.iactive) process.exit(0);
});

// Displays help and exit.
function cmdHelp() {

  console.log("Usage: node memching.js [OPTION]...\n");

  console.log("Memcing is an application for simple memory caching.\n");

  console.log("  Options:");
  console.log("    -i                 : Enable interactive mode.");
  console.log("    -listen-http       : Listen HTTP requests. Default; localhost:12080");
  console.log("    -load-file         : Load a command file.\n");

  console.log("    -cache-limit       : Cache size limit in bytes. Default (16MB); 16777216");
  console.log("    -entry-limit       : Entry size limit in bytes. Default (1KB); 1024");
  console.log("    -vacuum-delay      : Delay in seconds for vacuum. Default; 30");
  console.log("    -eviction          : Enable eviction mode.\n");

  console.log("    -debug             : Enable debug mode.");
  console.log("    -verbose           : Set verbose message level. Default; 1");
  console.log("    -help              : Display help and exit.\n");

  console.log("  stdin:");
  console.log("    -cmd               : Enable command mode for stdin.");
  console.log("    -csv               : Enable CSV mode for stdin.");
  console.log("    -csv-delimiter     : CSV delimiter (char or `tab`). Default; ,");
  console.log("    -csv-field-key     : Key field index on CSV. Default; 1");
  console.log("    -csv-field-filter  : Include fields on CSV. Default (all); null");
  console.log("                         Example; -csv-field-filter 1,2\n");

  console.log("  Interactive mode commands:");
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
  console.log("    node memcing.js -i -load-file /path/file -listen-http localhost:12080\n");

  console.log("  Please report issues to https://github.com/cmfatih/memcing/issues\n");

  process.exit(0);
}