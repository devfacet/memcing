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
  var pLimitInKB    = (iParam && !isNaN(iParam.limitInKB))  ? iParam.limitInKB  : 16384,  // cache limit in kilobytes
      pVacuumIval   = (iParam && !isNaN(iParam.vacuumIval)) ? iParam.vacuumIval : 30,     // vacuum interval in seconds
      pEviction     = (iParam && iParam.eviction === true)  ? true              : false,  // eviction
      pDebug        = (iParam && iParam.debug === true)     ? true              : false,  // debug

      gDataSet      = {},
      gDataLen      = 0,

      gCacheOpt     = {
        limitInKB: pLimitInKB,
        limitInEntry: 0,
        keyLIC: 64,
        valLIC: 256,
        vacuumIval: pVacuumIval,
        eviction: pEviction,
        evictionNOE: Math.ceil((pLimitInKB*2)/100),
        evictionLTM: 0,
        debug: pDebug
      },

      stats,        // stats - function
      dump,         // dump - function
      vacuum,       // vacuum - function
      vacuumTimer,  // timer for vacuum

      get,          // get - function
      set,          // set - function
      add,          // add - function
      del,          // delete - function
      incdec,       // increment or decrement value - function 
      increment,    // increment value - function
      decrement     // decrement value - function
  ;

  // Calculate the entry limit.
  // Empty space should be guaranteed for each key. Otherwise will fail on updates.
  // This calculation might be important for eviction policies.
  // Also UTF-8 considered for the calculation. (4 bytes for each char.)
  gCacheOpt.limitInEntry = Math.floor((gCacheOpt.limitInKB*1024)/((gCacheOpt.keyLIC+gCacheOpt.valLIC)*4));

  // Check the vacuum interval
  if(gCacheOpt.vacuumIval < 1) gCacheOpt.vacuumIval = 30;

  // Timer for expired entries
  vacuumTimer = setInterval(function() { vacuum({all: true}); }, gCacheOpt.vacuumIval*1000);

  // Returns the stats.
  stats = function stats() {
    return {
      options: gCacheOpt,
      numberOfEntry: gDataLen,
      usageInPercent: Math.floor((gDataLen*100)/gCacheOpt.limitInEntry)
    };
  };

  // Dump the cached data.
  // This is not an export process. It is for small data sets.
  dump = function stats() {
    return gDataSet;
  };

  // Vacuum the data by the given options.
  vacuum = function vacuum(iParam) {

    // Init vars
    var result    = {},
        pAll      = (iParam && iParam.all === true)       ? true  : false,
        pExp      = (iParam && iParam.exp === true)       ? true  : false,
        pEviction = (iParam && iParam.eviction === true)  ? true  : false,
        tsList    = {total: 0, exp: 0, eviction: 0},
        tsVarT    = new Date().getTime(),
        tsVarI
    ;

    // Check vars
    if(pAll === true) {
      pExp    = true;
      pEviction  = true;
    }
    // Overwrite eviction process
    if(gCacheOpt.eviction !== true) pEviction = false;

    // Check the data for expired entries
    if(pExp === true) {
      var tCntr = 0;
      tsVarI = new Date().getTime();

      for(var key in gDataSet) {
        if(gDataSet[key].expTS > 0 && gDataSet[key].expTS < (new Date().getTime())) {
          del(key);
          tCntr++;
        }
      }

      tsList.exp = (new Date().getTime())-tsVarI;
      if(gCacheOpt.debug) mUtilex.tidyLog('[cache.vacuum]: Vacuuming for expired entries is done. (' + tCntr + ' entry / ' + tsList.exp + 'ms)');
    }

    // Check the data for eviction
    if(pEviction === true) {
      var calcEvictEntry = ((gCacheOpt.limitInEntry-gDataLen) < gCacheOpt.evictionNOE) ? (gCacheOpt.evictionNOE-(gCacheOpt.limitInEntry-gDataLen)) : 0;

      tsVarI = new Date().getTime();

      // Note: This rule should be base on memory size...
      if(gCacheOpt.evictionLTM+3000 > tsVarI) calcEvictEntry = calcEvictEntry*(Math.ceil(3-((tsVarI-gCacheOpt.evictionLTM)/1000)));
      gCacheOpt.evictionLTM = tsVarI;

      if(calcEvictEntry > 0) {
        var tAry      = [],
            tArySort  = function(a, b) { return a[1] - b[1]; }
        ;

        for(var key2 in gDataSet) tAry.push([key2, gDataSet[key2].ts]);
        tAry.sort(tArySort);
        for (var i = 0; i < calcEvictEntry; i++) {
          del(tAry[i][0]);
        }
      }

      tsList.eviction = (new Date().getTime())-tsVarI;
      if(gCacheOpt.debug) mUtilex.tidyLog('[cache.vacuum]: Vacuuming for eviction is done. (' + calcEvictEntry + ' entry / ' +  tsList.eviction + 'ms)');
    }

    tsList.total = (new Date().getTime())-tsVarT;
    result.timeMS = {total: tsList.total, exp: tsList.exp, eviction: tsList.eviction};

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
    if(!cData && gDataLen >= gCacheOpt.limitInEntry) {

      // Do not mess with entries which will be expired. Just try eviction if it is enable.
      if(gCacheOpt.eviction === true) {
        vacuum({eviction: true});
      }

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
    stats: stats,
    dump: dump,
    vacuum: vacuum,
    set: set,
    add: add,
    get: get,
    del: del,
    increment: increment,
    decrement: decrement
  };
};