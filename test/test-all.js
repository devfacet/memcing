// Init reqs
/* jslint node: true */
'use strict';

var mUtilex = require('utilex'),
    mCache  = require('../app/cache')
;

// Init vars
var gConfig   = {isHeapdump: false},
    gArgs     = mUtilex.tidyArgs(),
    gTestList = {
      SET: true
    }
;

// Check args
if(typeof gArgs['heapdump'] !== 'undefined') gConfig.isHeapdump = true;

// Check config
if(gConfig.isHeapdump === true) {
  var mHeapdump = require('heapdump');
}

// Tests
mUtilex.tidyLog('test-all.js');

// Test for set command
if(gTestList.SET === true) {

  mUtilex.tidyLog('SET:');

  // Init vars
  var setAry    = [],
      setLimit  = 115000,
      expLimit1 = 90000,

      rndKey,
      rndVal,
      rndNum
  ;

  mUtilex.tidyLog('Preparing ' + setLimit + ' entries...');

  for(var i = 0; i < setLimit; i++) {
    rndKey = (Math.random() + 1).toString(36).substring(2);
    rndVal = (Math.random() + 1).toString(36).substring(2) + (Math.random() + 1).toString(36).substring(2);
    rndNum = (i > expLimit1) ? Math.floor((Math.random()*3)) : null;

    setAry.push([rndKey, rndVal, rndNum]);
  }

  var cache     = mCache({isDebug: true, limitInKB: 131072, eviction: true}), // 128MB
      setAryLen = setAry.length,
      tsS       = new Date().getTime()
  ;

  mUtilex.tidyLog('Caching ' + setAryLen + ' entries with eviction mode...');
  for(var i = 0; i < setAryLen; i++) {
    cache.set(setAry[i][0], setAry[i][1], setAry[i][2]);
  }
  mUtilex.tidyLog('Caching ' + setAryLen + ' entries with expiration and eviction is DONE! (' + ((new Date().getTime())-tsS) + 'ms)');
  mUtilex.tidyLog('Vacuuming expired entries...');
  mUtilex.tidyLog(cache.vacuum({exp: true}));
  mUtilex.tidyLog('Stats:');
  mUtilex.tidyLog(cache.stats(), 'JSONT');

  if(gConfig.isHeapdump === true) {
    mHeapdump.writeSnapshot(__dirname + '/dump-' + Date.now() + '.heapsnapshot');
  }

  process.exit(0);
}