/*
 * Memcing
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

/* jslint node: true */
'use strict';

var utilex = require('utilex'),
    fs     = require('fs'),
    path   = require('path'),
    init   = require('./lib/init'),
    cache  = require('./lib/cache'),
    pipe   = require('./lib/pipe'),
    rest   = require('./lib/rest'),
    repl   = require('./lib/repl');

var appConfig = {appPath: fs.realpathSync(path.join(__dirname, '..'))},
    appPIPE,  // pipe instance
    appCache, // cache instance
    appREST,  // rest instance
    appREPL;  // repl instance

// Init the app
init({appConfig: appConfig});

// Check for the help command
if(!appConfig.loadFile && !appConfig.listen && !appConfig.iactive && process.stdin.isTTY === true) cmdHelp();

// Create the instances
appCache = cache(appConfig.cache);
appPIPE  = pipe(appConfig.pipe, appCache);
appREST  = rest(appConfig.rest, appCache);
appREPL  = repl(appConfig.repl, appCache);

appCache.loadFile(appConfig.loadFile)
.then(appPIPE.start)
.then(appREST.listen)
.then(appREPL.start)
.then(function(res) {
  if(res) utilex.conLog(res);
})
.catch(function(err) {
  utilex.conLog(err);
  process.exit(0);
})
.done(function() {
  if(!appConfig.listen && !appConfig.iactive) {
    process.exit(0); // Nothing to do
  }
});

// Displays help and exit.
function cmdHelp() {

  console.log("Usage: node memching.js [OPTION]...\n");

  console.log("Memcing is an in-memory key-value caching application.\n");

  console.log("  Options:");
  console.log("    -i                 : Enable interactive mode.");
  console.log("    -listen-http       : Listen HTTP requests. Default; 0.0.0.0:12080");
  console.log("    -load-file         : Load a command file.\n");

  console.log("    -cache-limit       : Cache size limit in bytes. Default (128MB); 134217728");
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
  console.log("    node memcing.js -i -load-file /path/file -listen-http");
  console.log("    echo hello world | node memcing.js -listen-http");
  console.log("    cat file.csv | node memcing.js -listen-http -csv");
  console.log("    cat cmds.txt | node memcing.js -listen-http -cmd\n");

  process.exit(0);
}