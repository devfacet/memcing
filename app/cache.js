/*
 * Memcing
 * Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

// cache module implements caching.

// Init reqs
/* jslint node: true */
'use strict';

var mUtilex = require('utilex');

// Init the module
exports = module.exports = function(iParam) {

  // Init vars
  var gConfig       = {isDebug: false},

      gDataSet      = {},
      gDataLen      = 0,

      gCacheOpt     = {
        limitInKB: 16384,   // cache limit in kilobytes
        limitInEntry: 0,    // cache limit in number of entry
        keyLIC: 64,         // key limit in char
        valLIC: 256,        // val limit in char
        entryLIB: 0,        // per entry limit in byte
        vacuum: {
          ival: 30,         // vacuum interval in seconds
          running: false    // whether vacuum running or not
        },
        eviction: {
          enabled: false,   // eviction enabled or not
          limitInEntry: 0,  // limit in number of entry
        },
        ts: {
          outOfLimit: 0,    // time stamp for last out of limit
          eviction: 0       // eviction process
        }
      },
      gTimers       = {
        vacuum: null        // timer for vacuum
      },

      dataSet,        // data - function
      numOfEntry,     // number of entry - function
      numOfAvlbEntry, // number of available entry - function
      sizeOfPerEntry, // size of per entry - function

      stats,          // stats - function
      vacuum,         // vacuum - function

      get,            // get - function
      set,            // set - function
      add,            // add - function
      del,            // delete - function
      drop,           // drop data set - function
      incdec,         // increment or decrement value - function 
      increment,      // increment value - function
      decrement       // decrement value - function
  ;

  // Check params
  if(iParam && iParam.isDebug === true)   gConfig.isDebug             = true;
  if(iParam && !isNaN(iParam.limitInKB))  gCacheOpt.limitInKB         = iParam.limitInKB;
  if(iParam && !isNaN(iParam.vacuumIval)) gCacheOpt.vacuum.ival       = iParam.vacuumIval;
  if(iParam && iParam.eviction === true)  gCacheOpt.eviction.enabled  = true;

  // Calculate the entry limits.
  // Empty space should be guaranteed for each key. Otherwise will fail on updates.
  // This calculation might be important for eviction policies.
  // Also UTF-8 considered for the calculation. (4 bytes for each char.)
  gCacheOpt.entryLIB      = ((gCacheOpt.keyLIC+gCacheOpt.valLIC)*4);
  gCacheOpt.limitInEntry  = Math.floor((gCacheOpt.limitInKB*1024)/gCacheOpt.entryLIB);

  // Calculate the eviction limit.
  gCacheOpt.eviction.limitInEntry = Math.floor((gCacheOpt.limitInEntry*2)/100); // 2%
  if(gCacheOpt.eviction.limitInEntry < 1) gCacheOpt.eviction.limitInEntry = 1;

  // Check and init the vacuum timer.
  if(gCacheOpt.vacuum.ival < 1) gCacheOpt.vacuum.ival = 30; // Do not allowed <= 0
  gTimers.vacuum = setInterval(function() {
    if(!gCacheOpt.vacuum.running) vacuum({all: true});
  }, gCacheOpt.vacuum.ival*1000);

  // Returns the cached data var.
  // This is not an export function.
  dataSet = function dataSet() {
    return gDataSet;
  };

  // Returns number of entry.
  numOfEntry = function numOfEntry() {
    return gDataLen;
  };

  // Returns available space in entry.
  numOfAvlbEntry = function numOfAvlbEntry() {
    return (gCacheOpt.limitInEntry-gDataLen);
  };

  // Returns size of an entry.
  sizeOfPerEntry = function sizeOfPerEntry() {
    return gCacheOpt.entryLIB;
  };

  // Returns the stats.
  stats = function stats() {
    return {
      options: gCacheOpt,
      numberOfEntry: numOfEntry(),
      numberOfAvlbEntry: numOfAvlbEntry(),
      usageInPercent: Math.floor((gDataLen*100)/gCacheOpt.limitInEntry)
    };
  };

  // Vacuum the data by the given options.
  vacuum = function vacuum(iParam) {

    gCacheOpt.vacuum.running = true;

    // Init vars
    var result    = {},
        pAll      = (iParam && iParam.all === true)                     ? true                : false,
        pExp      = (iParam && iParam.exp === true)                     ? true                : false,
        pExpLIE   = (iParam && !isNaN(iParam.expLIE))                   ? iParam.expLIE       : 0,
        pEvict    = (iParam && iParam.eviction === true)                ? true                : false,
        pEvictLIE = (iParam.evictionLIE && !isNaN(iParam.evictionLIE))  ? iParam.evictionLIE  : 0,
        tsList    = {total: 0, exp: 0, eviction: 0},
        tsVarT    = new Date().getTime(),
        tsVarI,
        tCntr
    ;

    // Check vars
    if(pAll === true) {
      pExp    = true;
      pEvict  = (gCacheOpt.eviction.enabled === true) ? true : false;
    }

    // Check the data for expired entries
    if(pExp === true) {
      tsVarI  = new Date().getTime();
      tCntr   = 0;

      for(var key in gDataSet) {
        if(gDataSet[key].expTS > 0 && gDataSet[key].expTS < (new Date().getTime())) {
          del(key);
          tCntr++;

          if(pExpLIE > 0 && tCntr >= pExpLIE) break;
        }
      }

      tsList.exp = (new Date().getTime())-tsVarI;
      if(gConfig.isDebug) mUtilex.tidyLog('[cache.vacuum]: Vacuuming for expired entries is done. (' + tCntr + ' entry / ' + tsList.exp + 'ms)');
    }

    // Check the data for eviction
    if(pEvict === true) {
      tsVarI  = new Date().getTime();
      tCntr   = 0;

      if(pEvictLIE === 0) {
        pEvictLIE = (numOfAvlbEntry() < gCacheOpt.eviction.limitInEntry) ? (gCacheOpt.eviction.limitInEntry-numOfAvlbEntry()) : 0;
      }

      if(pEvictLIE > 0) {
        var tAry      = [],
            tAryLen   = 0,
            tArySort  = function(a, b) { return a[1] - b[1]; }
        ;

        for(var key2 in gDataSet) tAry.push([key2, gDataSet[key2].ts]);
        tAry.sort(tArySort);
        tAryLen = tAry.length;
        for(var i = 0; i < tAryLen; i++) {
          del(tAry[i][0]);
          tCntr++;

          if(tCntr >= pEvictLIE) break;
        }

        gCacheOpt.ts.eviction = tsVarI;
      }

      tsList.eviction = (new Date().getTime())-tsVarI;
      if(gConfig.isDebug) mUtilex.tidyLog('[cache.vacuum]: Vacuuming for eviction is done. (' + tCntr + ' entry / ' +  tsList.eviction + 'ms)');
    }

    tsList.total  = (new Date().getTime())-tsVarT;
    result.timeMS = {total: tsList.total, exp: tsList.exp, eviction: tsList.eviction};

    gCacheOpt.vacuum.running = false;

    return result;
  };

  // Returns the value of the given key.
  get = function get(iKey) {
    
    // Init vars
    var cData = gDataSet[iKey];

    // Check the data
    if(cData && (cData.expTS === 0 || cData.expTS > (new Date().getTime()))) {
      return cData;

      // Note: Do not delete the data here if it is expired. Let vacuum function do it.
    }

    return;
  };

  // Sets the value of the given key.
  set = function set(iKey, iVal, iExp) {

    // Init vars
    var result = {},
        pKey   = iKey,
        pVal   = (typeof iVal != 'undefined') ? iVal : null,
        pExp   = (typeof iExp != 'undefined') ? iExp : 0
    ;

    // Note: Length checking is only for strings.

    // Check vars
    if(!pKey) {
      return {error: 'Missing key.'};
    } else if(pKey.length > gCacheOpt.keyLIC) {
      return {error: 'Key is so long. (' + pKey.length + '/' + gCacheOpt.keyLIC + ')'};
    } else if(pVal && pVal.length > gCacheOpt.valLIC) {
      return {error: 'Value is so long. (' + pVal.length + '/' + gCacheOpt.valLIC + ')'};
    } else if(isNaN(pExp)) {
      return {error: 'Invalid expire value. (' + pExp + ')'};
    }

    // Check data
    var cData = get(pKey);

    // Check the memory
    if(!cData && numOfAvlbEntry() < 1) { // no more available space

      if(gConfig.isDebug) mUtilex.tidyLog('[cache.set]: Out of entry limit. (' + gDataLen + ')');

      var tDGT = new Date().getTime();

      // Cleanup expired entries
      vacuum({exp: true});

      if(gCacheOpt.eviction.enabled === true && numOfAvlbEntry() < 2) { // last space
        // Cleanup for enough space
        var tLIE = gCacheOpt.eviction.limitInEntry;

        // Overwrite the limit for preventing bottlenecks.
        // Note: This rule should be base on memory size.
        // Also consider an entry / per minute calculation.
        if(gCacheOpt.ts.outOfLimit && gCacheOpt.ts.outOfLimit+5000 > tDGT) {
          tLIE = tLIE*(5-(Math.ceil((tDGT-gCacheOpt.ts.outOfLimit)/1000)));
        }

        // Evict entries
        vacuum({eviction: true, evictionLIE: tLIE});
      }

      gCacheOpt.ts.outOfLimit = tDGT;

      if(gDataLen >= gCacheOpt.limitInEntry) {
        result.error = 'Out of entry limit. (' + gDataLen + '/' + gCacheOpt.limitInEntry + ')';
        return result;
      }
    }

    // Set data
    if(!cData) gDataLen++;

    var ts    = new Date().getTime(),
        tsExp = (pExp) ? (ts+(pExp*1000)) : 0
    ;
    
    gDataSet[pKey] = {key: pKey, val: pVal, ts: ts, expTS: tsExp};

    result = gDataSet[pKey];

    return result;
  };

  // Adds a data by the given key.
  add = function add(iKey, iVal, iExp) {
    if(get(iKey)) {
      return {error: 'Key already exists. (' + iKey + ')'};
    }

    return set(iKey, iVal, iExp);
  };

  // Deletes the given key.
  del = function del(iKey) {
    if(iKey && gDataSet[iKey] && delete gDataSet[iKey]) {
      gDataLen--;
      return true;
    }

    return false;
  };

  // Drops the data set.
  drop = function delAll() {
    gDataSet = {};
    gDataLen = 0;

    return true;
  };

  // Checks and increments or decrements the value of the given key.
  incdec = function incdec(iKey, iAmnt, iFlag) {

    // Init vars
    var result = {},
        pKey   = iKey,
        pAmnt  = (typeof iAmnt != 'undefined') ? iAmnt : 1,
        pFlag  = iFlag,
        cData  = get(pKey)
    ;

    // Check vars
    if(!cData) {
      return {error: 'The key does not exist. (' + pKey + ')'};
    } else if(typeof cData.val !== 'number' || cData.val % 1 !== 0) {
      return {error: 'The value is not an integer. (' + cData.val + ')'};
    } else if(isNaN(pAmnt)) {
      return {error: 'Invalid amount. (' + pAmnt + ')'};
    }

    // Set data
    if(pFlag == 'inc') {
      cData.val = (cData.val+pAmnt);
    } else if(pFlag == 'dec') {
      cData.val = (cData.val-pAmnt);
    }

    result = set(cData.key, cData.val, cData.exp);

    return result;
  };

  // Increments the value of the given key.
  increment = function increment(iKey, iAmnt) {
    return incdec(iKey, iAmnt, 'inc');
  };

  // Decrements the value of the given key.
  decrement = function decrement(iKey, iAmnt) {
    return incdec(iKey, iAmnt, 'dec');
  };

  // Return
  return {
    dataSet: dataSet,
    numOfEntry: numOfEntry,
    numOfAvlbEntry: numOfAvlbEntry,
    sizeOfPerEntry: sizeOfPerEntry,

    stats: stats,
    vacuum: vacuum,

    set: set,
    add: add,
    get: get,
    del: del,
    drop: drop,
    increment: increment,
    decrement: decrement
  };
};