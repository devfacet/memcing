// Init reqs
/* jslint node: true */
'use strict';

var utilex = require('utilex'),
    cache  = require('../app/cache')
;

// Init vars
var appArgs   = utilex.tidyArgs(),
    appConfig = {isHeapdump: false},
    appCache  = cache({isDebug: true, limitInKB: 131072, eviction: true}), // 128MB
    testList  = {SET: true}
;

// config
if(typeof appArgs['heapdump'] !== 'undefined') appConfig.isHeapdump = true;

// heapdump
if(appConfig.isHeapdump === true) var heapdump = require('heapdump');

// Tests
utilex.tidyLog('test-all.js');

// Test for set command
if(testList.SET === true) {
  utilex.tidyLog('SET:');

  // Init vars
  var setAry    = [],
      setLimit  = 115000,
      expLimit1 = 90000,
      rndKey,   // random key
      rndVal,   // random val
      rndNum    // random number
  ;

  utilex.tidyLog('Preparing ' + setLimit + ' entries...');

  for(var i = 0; i < setLimit; i++) {
    rndKey = (Math.random() + 1).toString(36).substring(2);
    rndVal = (Math.random() + 1).toString(36).substring(2) + (Math.random() + 1).toString(36).substring(2);
    rndNum = (i > expLimit1) ? Math.floor((Math.random()*3)) : null;

    setAry.push([rndKey, rndVal, rndNum]);
  }

  var setAryLen = setAry.length,
      tsS       = new Date().getTime()
  ;

  utilex.tidyLog('Caching ' + setAryLen + ' entries with eviction mode...');
  for(var i = 0; i < setAryLen; i++) {
    appCache.set(setAry[i][0], setAry[i][1], setAry[i][2]);
  }
  utilex.tidyLog('Caching ' + setAryLen + ' entries with expiration and eviction is DONE! (' + ((new Date().getTime())-tsS) + 'ms)');
  utilex.tidyLog('Vacuuming expired entries...');
  utilex.tidyLog(appCache.vacuum({exp: true}));
  utilex.tidyLog('Stats:');
  utilex.tidyLog(appCache.stats(), 'JSONT');

  // heapdump
  if(appConfig.isHeapdump === true) heapdump.writeSnapshot(__dirname + '/dump-' + Date.now() + '.heapsnapshot');

  process.exit(0);
}