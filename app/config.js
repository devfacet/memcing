/*
 * Memcing
 * Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

// config module implements config related functions.

// Init reqs
/* jslint node: true */
'use strict';

var mUtilex = require('utilex');

// Init the module
exports = module.exports = function() {

  // Init vars
  var argParse // parse arguments - function
  ;

  // Parses command line arguments and update the given config.
  argParse = function argParse(iConfig) {

    // Init vars
    var args = mUtilex.tidyArgs();

    // Check args
    
    // global config
    if(typeof args['debug'] !== 'undefined')        iConfig.isDebug           = true;
    if(typeof args['help'] !== 'undefined')         iConfig.isHelp            = true;
    if(typeof args['i'] !== 'undefined')            iConfig.isIactive         = true;
    if(args['load-file'])                           iConfig.loadFile          = args['load-file'];

    // cache
    if(typeof args['debug'] !== 'undefined')        iConfig.cache.isDebug     = true;
    if(typeof args['cache-limit'] !== 'undefined')  iConfig.cache.limitInKB   = parseInt(args['cache-limit'], 10);
    if(typeof args['vacuum-ival'] !== 'undefined')  iConfig.cache.vacuumIval  = parseInt(args['vacuum-ival'], 10);
    if(typeof args['eviction'] !== 'undefined')     iConfig.cache.eviction    = true;

    // listen-http
    if(typeof args['listen-http'] !== 'undefined') {
      var tAry = ('' + args['listen-http']).split(':', 2);

      if(tAry[0]) {
        iConfig.listen.http.isEnabled = true;
        iConfig.listen.http.hostname  = tAry[0].trim();
        iConfig.listen.http.port      = (tAry[1] || null);
      }
    }

    return true;
  };

  // Return
  return {
    argParse: argParse
  };
}();