/*
 * Memcing
 * Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

// Init reqs
/* jslint node: true */
'use strict';

var mUtilex   = require('utilex'),
    mCache    = require('./cache'),
    mHelp     = require('./help'),
    mConfig   = require('./config'),
    mREST     = require('./rest'),
    mREPL     = require('./repl')
;

// Init vars
var gConfig   = mConfig(),
    gCache    = mCache(gConfig.cache),
    gREST     = mREST(gConfig.listen, gCache),
    gREPL     = mREPL(gConfig, gCache)
;

// Check whether help or not
if(gConfig.isHelp || (!gConfig.isIactive && !gConfig.loadFile)) mHelp.helpForShell();

if(gConfig.loadFile) {
  gCache.loadFile(gConfig.loadFile).then(function() { // load file
    if(gConfig.listen.http.isEnabled) {
      gREST.listen().then(function(res) { // listen
        mUtilex.tidyLog(res);
        if(gConfig.isIactive) gREPL.start(); // interactive mode
      }, function(err) {
        mUtilex.tidyLog(err);
        process.exit(0);
      });
    } else if(gConfig.isIactive) {
      gREPL.start(); // interactive mode
    } else {
      process.exit(0); // nothing else to do
    }
  }, function(err) {
    mUtilex.tidyLog(err);
    process.exit(0);
  });
} else if(gConfig.isIactive) {
  if(gConfig.listen.http.isEnabled) {
    gREST.listen().then(function(res) { // listen
      mUtilex.tidyLog(res);
      gREPL.start(); // interactive mode
    }, function(err) {
      mUtilex.tidyLog(err);
      process.exit(0);
    });
  } else {
    gREPL.start(); // interactive mode
  }
} else {
  process.exit(0); // nothing else to do
}