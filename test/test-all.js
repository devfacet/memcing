// Init reqs
/* jslint node: true */
'use strict';

var mCache  = require('../app/cache');

// Init vars
var gTestList = {
      SET: true
    }
;

// Tests
console.log('test-all.js');

// Test for set
if(gTestList.SET === true) {

  console.log('SET:');

  // Init vars
  var setAry    = [],
      setLimit  = 115000,
      rndKey,
      rndVal,
      rndNum
  ;

  console.log('Preparing ' + setLimit + ' entries...');

  for(var i = 0; i < setLimit; i++) {
    rndKey = (Math.random() + 1).toString(36).substring(2);
    rndVal = (Math.random() + 1).toString(36).substring(2) + (Math.random() + 1).toString(36).substring(2);
    rndNum = Math.floor((Math.random()*3));
    setAry.push([rndKey, rndVal, rndNum]);
  }

  var cache     = mCache({isDebug: true, limitInKB: 131072, eviction: true}),
      setAryLen = setAry.length
  ;

  console.log('Caching ' + setAryLen + ' entries with eviction mode...');
  for(var i = 0; i < setAryLen; i++) {
    cache.set(setAry[i][0], setAry[i][1], setAry[i][2]);
  }
  console.log('Caching is DONE!');
  console.log(cache.stats());

  console.log('Waiting 3 seconds for entries which will be expired...');
  setTimeout(function() {
    console.log('Vacuuming expired entries...');
    console.log(cache.vacuum({exp: true}));
    console.log(cache.stats());
    process.exit(0);
  }, 3000);
}