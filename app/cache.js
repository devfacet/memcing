/*
 * Memcing
 * Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

// cache module implements caching.

// Init reqs
/* jslint node: true */
'use strict';

var mUtilex   = require('utilex'),
    mQ        = require('q'),
    mFS       = require('fs'),
    mReadline = require('readline')
;

// Init the module
exports = module.exports = function(iConfig) {

  // Init vars
  var config          = {isDebug: false},
      cacheData       = {entries: {}, len: 0},
      cacheOpt        = {
        limitInKB:    16384,  // cache limit in kilobytes
        limitInEntry: 0,      // cache limit in number of entry
        keyLIC:       64,     // key limit in char
        valLIC:       256,    // val limit in char
        entryLIB:     0,      // per entry limit in byte
        vacuum: {
          ival:       30,     // vacuum interval in seconds
          running:    false   // whether vacuum running or not
        },
        eviction: {
          enabled:    false,  // eviction enabled or not
          limitInEntry: 0,    // limit in number of entry
        },
        ts: {
          outOfLimit: 0,      // time stamp for last out of limit
          eviction:   0       // eviction process
        }
      },
      cacheCmds       = [
        'get', 
        'set', 
        'add', 
        'delete', 
        'drop', 
        'increment', 
        'decrement', 
        'dump', 
        'stats', 
        'vacuum', 
        'exit'
      ],

      timers          = {
        vacuum: null  // timer for vacuum
      },
      regex           = {
        number:       new RegExp('^(-*)[0-9]+(\\.[0-9]+)?$', 'g'),
        trimQuotes:   new RegExp('^"|"$', 'g'),
        command:      new RegExp('^\\b(' + cacheCmds.join('|') + ')\\b', 'i'),
        args:         new RegExp('("[^"]*")|([^\\s]+)', 'g') // TODO: It should support escape chars. Currently \" doesn't work.
      },

      entries,        // entries - function
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
      decrement,      // decrement value - function
      execCmd,        // execute command - function
      loadFile        // load file - function
  ;

  // Check params
  if(iConfig) {
    if(iConfig.isDebug === true)   config.isDebug            = true;
    if(!isNaN(iConfig.limitInKB))  cacheOpt.limitInKB        = iConfig.limitInKB;
    if(!isNaN(iConfig.vacuumIval)) cacheOpt.vacuum.ival      = iConfig.vacuumIval;
    if(iConfig.eviction === true)  cacheOpt.eviction.enabled = true;
  }

  // Calculate the entry limits.
  // Empty space should be guaranteed for each key. Otherwise will fail on updates.
  // This calculation might be important for eviction policies.
  // Also UTF-8 considered for the calculation. (4 bytes for each char.)
  cacheOpt.entryLIB     = ((cacheOpt.keyLIC+cacheOpt.valLIC)*4);
  cacheOpt.limitInEntry = Math.floor((cacheOpt.limitInKB*1024)/cacheOpt.entryLIB);

  // Calculate the eviction limit.
  cacheOpt.eviction.limitInEntry = Math.floor((cacheOpt.limitInEntry*2)/100); // 2%
  if(cacheOpt.eviction.limitInEntry < 1) cacheOpt.eviction.limitInEntry = 1;

  // Check and init the vacuum timer.
  if(cacheOpt.vacuum.ival < 1) cacheOpt.vacuum.ival = 30; // Do not allowed <= 0
  timers.vacuum = setInterval(function() {
    if(!cacheOpt.vacuum.running) vacuum({all: true});
  }, cacheOpt.vacuum.ival*1000);

  // Returns the entries.
  // This is not an export function.
  entries = function entries() {
    return cacheData.entries;
  };

  // Returns number of entry.
  numOfEntry = function numOfEntry() {
    return cacheData.len;
  };

  // Returns available space in entry.
  numOfAvlbEntry = function numOfAvlbEntry() {
    return (cacheOpt.limitInEntry-cacheData.len);
  };

  // Returns size of an entry.
  sizeOfPerEntry = function sizeOfPerEntry() {
    return cacheOpt.entryLIB;
  };

  // Returns the stats.
  stats = function stats() {
    return {
      options: cacheOpt,
      numberOfEntry: numOfEntry(),
      numberOfAvlbEntry: numOfAvlbEntry(),
      usageInPercent: Math.floor((cacheData.len*100)/cacheOpt.limitInEntry)
    };
  };

  // Vacuum the data by the given options.
  vacuum = function vacuum(iParam) {

    cacheOpt.vacuum.running = true;

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
      pEvict  = (cacheOpt.eviction.enabled === true) ? true : false;
    }

    // Check the data for expired entries
    if(pExp === true) {
      tsVarI  = new Date().getTime();
      tCntr   = 0;

      for(var key in cacheData.entries) {
        if(cacheData.entries[key].expTS > 0 && cacheData.entries[key].expTS < (new Date().getTime())) {
          del(key);
          tCntr++;

          if(pExpLIE > 0 && tCntr >= pExpLIE) break;
        }
      }

      tsList.exp = (new Date().getTime())-tsVarI;
      if(config.isDebug) mUtilex.tidyLog('[cache.vacuum]: Vacuuming for expired entries is done. (' + tCntr + ' entry / ' + tsList.exp + 'ms)');
    }

    // Check the data for eviction
    if(pEvict === true) {
      tsVarI  = new Date().getTime();
      tCntr   = 0;

      if(pEvictLIE === 0) {
        pEvictLIE = (numOfAvlbEntry() < cacheOpt.eviction.limitInEntry) ? (cacheOpt.eviction.limitInEntry-numOfAvlbEntry()) : 0;
      }

      if(pEvictLIE > 0) {
        var tAry      = [],
            tAryLen   = 0,
            tArySort  = function(a, b) { return a[1] - b[1]; }
        ;

        for(var key2 in cacheData.entries) tAry.push([key2, cacheData.entries[key2].ts]);
        tAry.sort(tArySort);
        tAryLen = tAry.length;
        for(var i = 0; i < tAryLen; i++) {
          del(tAry[i][0]);
          tCntr++;

          if(tCntr >= pEvictLIE) break;
        }

        cacheOpt.ts.eviction = tsVarI;
      }

      tsList.eviction = (new Date().getTime())-tsVarI;
      if(config.isDebug) mUtilex.tidyLog('[cache.vacuum]: Vacuuming for eviction is done. (' + tCntr + ' entry / ' +  tsList.eviction + 'ms)');
    }

    tsList.total  = (new Date().getTime())-tsVarT;
    result.timeMS = {total: tsList.total, exp: tsList.exp, eviction: tsList.eviction};

    cacheOpt.vacuum.running = false;

    return result;
  };

  // Returns the value of the given key.
  get = function get(iKey) {
    
    // Init vars
    var cData = cacheData.entries[iKey];

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
    } else if(pKey.length > cacheOpt.keyLIC) {
      return {error: 'Key is so long. (' + pKey.length + '/' + cacheOpt.keyLIC + ')'};
    } else if(pVal && pVal.length > cacheOpt.valLIC) {
      return {error: 'Value is so long. (' + pVal.length + '/' + cacheOpt.valLIC + ')'};
    } else if(isNaN(pExp)) {
      return {error: 'Invalid expire value. (' + pExp + ')'};
    }

    // Check data
    var cData = get(pKey);

    // Check the memory
    if(!cData && numOfAvlbEntry() < 1) { // no more available space

      if(config.isDebug) mUtilex.tidyLog('[cache.set]: Out of entry limit. (' + cacheData.len + ')');

      var tDGT = new Date().getTime();

      // Cleanup expired entries
      vacuum({exp: true});

      if(cacheOpt.eviction.enabled === true && numOfAvlbEntry() < 2) { // last space
        // Cleanup for enough space
        var tLIE = cacheOpt.eviction.limitInEntry;

        // Overwrite the limit for preventing bottlenecks.
        // Note: This rule should be base on memory size.
        // Also consider an entry / per minute calculation.
        if(cacheOpt.ts.outOfLimit && cacheOpt.ts.outOfLimit+5000 > tDGT) {
          tLIE = tLIE*(5-(Math.ceil((tDGT-cacheOpt.ts.outOfLimit)/1000)));
        }

        // Evict entries
        vacuum({eviction: true, evictionLIE: tLIE});
      }

      cacheOpt.ts.outOfLimit = tDGT;

      if(cacheData.len >= cacheOpt.limitInEntry) {
        result.error = 'Out of entry limit. (' + cacheData.len + '/' + cacheOpt.limitInEntry + ')';
        return result;
      }
    }

    // Set data
    if(!cData) cacheData.len++;

    var ts    = new Date().getTime(),
        tsExp = (pExp) ? (ts+(pExp*1000)) : 0
    ;
    
    cacheData.entries[pKey] = {key: pKey, val: pVal, ts: ts, expTS: tsExp};

    result = cacheData.entries[pKey];

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
    if(iKey && cacheData.entries[iKey] && delete cacheData.entries[iKey]) {
      cacheData.len--;
      return true;
    }

    return false;
  };

  // Drops the data set.
  drop = function delAll() {
    cacheData.entries = {};
    cacheData.len = 0;

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

  // Executes the given command.
  execCmd = function execCmd(iCmd) {

    // Init vars
    var result  = {cmd: null, cmdArgs: null, cmdRes: null},
        pCmd    = ('' + iCmd).trim()
    ;

    // Check vars
    if(!pCmd) return result;

    // Parse the command
    var cmdMatch    = pCmd.match(regex.command),
        cmdArgs     = pCmd.match(regex.args)
    ;

    result.cmd      = (cmdMatch instanceof Array && cmdMatch[0]) ? cmdMatch[0].toLowerCase() : null;
    if(cmdArgs instanceof Array) cmdArgs.shift();
    result.cmdArgs  = (cmdArgs instanceof Array) ? cmdArgs : null;

    // Cleanup args
    if(result.cmdArgs) {
      for(var i = 0; i < result.cmdArgs.length; i++) {
        result.cmdArgs[i] = result.cmdArgs[i].replace(regex.trimQuotes, ''); // quotes
        if(regex.number.test(result.cmdArgs[i]) && !isNaN(result.cmdArgs[i]/1)) {
          result.cmdArgs[i] = result.cmdArgs[i]/1; // number
        }
      }
    }

    // Execute command
    switch(result.cmd) {
      case 'get':
        result.cmdRes = get(result.cmdArgs[0]);
        break;
      case 'set':
        result.cmdRes = set(result.cmdArgs[0], result.cmdArgs[1], result.cmdArgs[2]);
        break;
      case 'add':
        result.cmdRes = add(result.cmdArgs[0], result.cmdArgs[1], result.cmdArgs[2]);
        break;
      case 'delete':
        result.cmdRes = del(result.cmdArgs[0]);
        break;
      case 'drop':
        result.cmdRes = drop();
        break;
      case 'increment':
        result.cmdRes = increment(result.cmdArgs[0], result.cmdArgs[1]);
        break;
      case 'decrement':
        result.cmdRes = decrement(result.cmdArgs[0], result.cmdArgs[1]);
        break;
      case 'dump':
        result.cmdRes = entries();
        break;
      case 'stats':
        result.cmdRes = stats();
        break;
      case 'vacuum':
        result.cmdRes = vacuum({all: true});
        break;
      case 'exit':
        result.cmdRes = {exit: true};
        break;
      default:
        result.cmdRes = {error: 'Invalid command: ' + result.cmd + ' (Possible commands: ' + cacheCmds.join(', ') + ')'};
    }

    return result;
  };

  // Loads the given file.
  loadFile = function loadFile(iPath) {

    // Init vars
    var deferred  = mQ.defer(),
        pPath     = ('' + iPath),
        pathSS    = (pPath && mFS.existsSync(pPath)) ? mFS.statSync(pPath) : null,
        lineCntr  = 0,
        lineErr   = null
    ;

    // Check the file
    if(!pathSS || !pathSS.isFile()) {
      deferred.reject('Invalid file! (' + pPath + ')');
      return deferred.promise;
    }

    // Init the pipe
    var rl = mReadline.createInterface({input: mFS.createReadStream(pPath), terminal: false});
    rl.setPrompt('');

    // line event
    rl.on('line', function(iLine) {

      // Check the line
      lineCntr++;
      if(!iLine.trim()) { return; }

      // Execute the command
      var cp = execCmd(iLine);
      if(cp.cmdRes && cp.cmdRes.error) {
        lineErr = cp.cmdRes.error + ' - line #' + lineCntr + ': ' + iLine;
        rl.close();
      }
    });

    // close event
    rl.on('close', function() {
      if(lineErr) {
        deferred.reject(lineErr);
      } else {
        deferred.resolve();
      }
    });

    return deferred.promise;
  };

  // Return
  return {
    entries: entries,
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
    decrement: decrement,

    execCmd: execCmd,
    loadFile: loadFile
  };
};