// Init reqs
/* jslint node: true */
'use strict';

var mUtilex = require('utilex'),
    mCache  = require('../app/cache')
;

// Init vars
var gTestList = {
      SET: true
    }
;

// Tests
mUtilex.tidyLog('test-all.js');

// Test for set command
if(gTestList.SET === true) {

  mUtilex.tidyLog('SET:');

  // Init vars
  var lineStr     = new Array(40).join('-'),

      setAry      = [],
      setLimit    = 115000,
      noeForExp1  = 2500,
      noeForExp2  = 30000,

      rndKey,
      rndVal,
      rndNum
  ;

  mUtilex.tidyLog('Preparing ' + setLimit + ' entries...');

  for(var i = 0; i < setLimit; i++) {
    rndKey = (Math.random() + 1).toString(36).substring(2);
    rndVal = (Math.random() + 1).toString(36).substring(2) + (Math.random() + 1).toString(36).substring(2);
    rndNum = (i < noeForExp1 || i > noeForExp2) ? Math.floor((Math.random()*3)) : null;

    setAry.push([rndKey, rndVal, rndNum]);
  }

  var cache     = mCache({isDebug: true, limitInKB: 131072, eviction: true}), // 128MB
      setAryLen = setAry.length
  ;

  mUtilex.tidyLog('Caching ' + setAryLen + ' entries with eviction mode...');
  for(var i = 0; i < setAryLen; i++) {
    cache.set(setAry[i][0], setAry[i][1], setAry[i][2]);
  }
  mUtilex.tidyLog('Caching is DONE!');
  mUtilex.tidyLog(cache.stats(), 'JSONT');

  mUtilex.tidyLog('Waiting 3 seconds for entries which will be expired...');
  setTimeout(function() {
    mUtilex.tidyLog('Vacuuming expired entries...');
    mUtilex.tidyLog(cache.vacuum({exp: true}));
    mUtilex.tidyLog(cache.stats(), 'JSONT');
    process.exit(0);
  }, 3000);
}