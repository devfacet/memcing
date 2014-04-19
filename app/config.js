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
exports = module.exports = function(iConfig) {

  // Init vars
  var args    = mUtilex.tidyArgs(),
      config  = {
        isDebug: false,
        isHelp: false,
        isIactive: false,
        loadFile: null,
        listen: {
          http: {
            isEnabled: false,
            hostname: null,
            port: null
          }
        },
        cache: {}
      },

      get     // get config - function
  ;

  // Merge configs
  for(var key in iConfig) {
    if(iConfig.hasOwnProperty(key) === true) config[key] = iConfig[key];
  }
  
  // global config
  if(typeof args['debug'] !== 'undefined')        config.isDebug          = true;
  if(typeof args['help'] !== 'undefined')         config.isHelp           = true;
  if(typeof args['i'] !== 'undefined')            config.isIactive        = true;
  if(args['load-file'])                           config.loadFile         = args['load-file'];

  // cache
  if(typeof args['debug'] !== 'undefined')        config.cache.isDebug    = true;
  if(typeof args['cache-limit'] !== 'undefined')  config.cache.limitInKB  = parseInt(args['cache-limit'], 10);
  if(typeof args['vacuum-ival'] !== 'undefined')  config.cache.vacuumIval = parseInt(args['vacuum-ival'], 10);
  if(typeof args['eviction'] !== 'undefined')     config.cache.eviction   = true;

  // listen-http
  if(typeof args['listen-http'] !== 'undefined') {
    var tAry = ('' + args['listen-http']).split(':', 2);

    if(tAry[0]) {
      config.listen.http.isEnabled = true;
      config.listen.http.hostname  = tAry[0].trim();
      config.listen.http.port      = (tAry[1] || null);
    }
  }

  // Returns the config
  get = function get() {
    return config;
  };

  // Return
  return {
    get: get
  };
};