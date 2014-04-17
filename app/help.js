/*
 * Memcing
 * Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

// help module implements help related functions.

// Init reqs
/* jslint node: true */
'use strict';

// Init the module
exports = module.exports = function() {

  // Init vars
  var helpForShell // display help - function
  ;

  // Displays help and exit.
  helpForShell = function helpForShell() {

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
  };

  // Return
  return {
    helpForShell: helpForShell
  };
}();