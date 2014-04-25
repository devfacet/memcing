/*
 * Memcing
 * Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

// cache module implements caching.

// Init reqs
/* jslint node: true */
'use strict';

var utilex    = require('utilex'),
    q         = require('q'),
    fs        = require('fs'),
    readline  = require('readline')
;

// Init the module
exports = module.exports = function(options) {

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
      incdec,         // increment or decrement value - function 
      increment,      // increment value - function
      decrement,      // decrement value - function
      drop,           // drop data set - function
      execCmd,        // execute command - function
      loadFile        // load file - function
  ;

  // Check params
  if(options) {
    if(options.isDebug === true)    config.isDebug            = true;
    if(!isNaN(options.limitInKB))   cacheOpt.limitInKB        = options.limitInKB;
    if(!isNaN(options.vacuumIval))  cacheOpt.vacuum.ival      = options.vacuumIval;
    if(options.eviction === true)   cacheOpt.eviction.enabled = true;
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
  entries = function entries() {
    // This is not an export function.
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
      options:            cacheOpt,
      numberOfEntry:      numOfEntry(),
      numberOfAvlbEntry:  numOfAvlbEntry(),
      usageInPercent:     Math.floor((cacheData.len*100)/cacheOpt.limitInEntry)
    };
  };

  // Vacuum the data.
  vacuum = function vacuum(options) {

    cacheOpt.vacuum.running = true;

    // Init vars
    var result      = {},

        optAll      = (options && options.all === true)       ? true            : false,
        optExp      = (options && options.exp === true)       ? true            : false,
        optExpLIE   = (options && !isNaN(options.expLIE))     ? options.expLIE  : 0,
        optEvict    = (options && options.eviction === true)  ? true            : false,
        optEvictLIE = (options && options.evictionLIE && !isNaN(options.evictionLIE)) ? options.evictionLIE : 0,

        tsList      = {total: 0, exp: 0, eviction: 0},  // timestamp list
        tsBegin     = new Date().getTime(),             // begin timestamp
        tsTemp,     // temporary timestamp
        entryCntr   // entry counter
    ;

    // Check vars
    if(optAll === true) {
      optExp    = true;
      optEvict  = (cacheOpt.eviction.enabled === true) ? true : false;
    }

    // Check the data for expired entries
    if(optExp === true) {

      tsTemp    = new Date().getTime();
      entryCntr = 0;
      for(var key in cacheData.entries) {
        if(cacheData.entries[key].expTS > 0 && cacheData.entries[key].expTS < (new Date().getTime())) {
          del(key);
          entryCntr++;
          if(optExpLIE > 0 && entryCntr >= optExpLIE) break;
        }
      }
      tsList.exp = (new Date().getTime())-tsTemp;
      if(config.isDebug) utilex.tidyLog('[cache.vacuum]: Vacuuming for expired entries is done. (' + entryCntr + ' entry / ' + tsList.exp + 'ms)');
    }

    // Check the data for eviction
    if(optEvict === true) {

      tsTemp    = new Date().getTime();
      entryCntr = 0;

      if(optEvictLIE === 0) {
        optEvictLIE = (numOfAvlbEntry() < cacheOpt.eviction.limitInEntry) ? (cacheOpt.eviction.limitInEntry-numOfAvlbEntry()) : 0;
      }

      if(optEvictLIE > 0) {
        var entryList     = [],
            entryListLen  = 0,
            sortCB        = function(a, b) { return a[1] - b[1]; } // sort by timestamp
        ;

        for(var key2 in cacheData.entries) entryList.push([key2, cacheData.entries[key2].ts]);
        entryList.sort(sortCB);
        entryListLen = entryList.length;
        for(var i = 0; i < entryListLen; i++) {
          del(entryList[i][0]);
          entryCntr++;

          if(entryCntr >= optEvictLIE) break;
        }
        cacheOpt.ts.eviction = tsTemp;
      }

      tsList.eviction = (new Date().getTime())-tsTemp;
      if(config.isDebug) utilex.tidyLog('[cache.vacuum]: Vacuuming for eviction is done. (' + entryCntr + ' entry / ' +  tsList.eviction + 'ms)');
    }

    tsList.total  = (new Date().getTime())-tsBegin;
    result.timeMS = {total: tsList.total, exp: tsList.exp, eviction: tsList.eviction};

    cacheOpt.vacuum.running = false;

    return result;
  };

  // Returns the value of the given key.
  get = function get(key) {
    var cData = cacheData.entries[key];

    if(cData && (cData.expTS === 0 || cData.expTS > (new Date().getTime()))) {
      return cData;
    }
    // NOTE: Do not delete the data here if it is expired. Let vacuum function do it.

    return;
  };

  // Sets the value of the given key.
  set = function set(key, val, exp) {

    // Init vars
    var result = {},
        valF   = (typeof val != 'undefined') ? val : null,
        expF   = (typeof exp != 'undefined') ? exp : 0
    ;

    // NOTE: Length checking is only for strings.

    // Check vars
    if(!key) {
      return {error: 'Missing key.'};
    } else if(key.length > cacheOpt.keyLIC) {
      return {error: 'Key is so long. (' + key.length + '/' + cacheOpt.keyLIC + ')'};
    } else if(valF && valF.length > cacheOpt.valLIC) {
      return {error: 'Value is so long. (' + valF.length + '/' + cacheOpt.valLIC + ')'};
    } else if(isNaN(expF)) {
      return {error: 'Invalid expire value. (' + expF + ')'};
    }

    // Get data
    var cData = get(key);

    // Check the memory
    if(!cData && numOfAvlbEntry() < 1) {
      // no more available space

      var curTS = new Date().getTime();

      if(config.isDebug) utilex.tidyLog('[cache.set]: Out of entry limit. (' + cacheData.len + ')');

      // Cleanup expired entries
      vacuum({exp: true});

      if(cacheOpt.eviction.enabled === true && numOfAvlbEntry() < 2) { // last space
        // Cleanup for enough space
        var tLIE = cacheOpt.eviction.limitInEntry;

        // Overwrite the limit for preventing bottlenecks.
        // NOTE: This rule should be base on memory size.
        // Also consider an entry / per minute calculation.
        if(cacheOpt.ts.outOfLimit && cacheOpt.ts.outOfLimit+5000 > curTS) {
          tLIE = tLIE*(5-(Math.ceil((curTS-cacheOpt.ts.outOfLimit)/1000)));
        }

        // Evict entries
        vacuum({eviction: true, evictionLIE: tLIE});
      }

      cacheOpt.ts.outOfLimit = curTS;

      if(cacheData.len >= cacheOpt.limitInEntry) {
        result.error = 'Out of entry limit. (' + cacheData.len + '/' + cacheOpt.limitInEntry + ')';
        return result;
      }
    }

    // Set data
    if(!cData) cacheData.len++;

    var ts    = new Date().getTime(),
        tsExp = (expF) ? (ts+(expF*1000)) : 0
    ;
    
    cacheData.entries[key] = {key: key, val: valF, ts: ts, expTS: tsExp};

    result = cacheData.entries[key];

    return result;
  };

  // Adds an entry.
  add = function add(key, val, exp) {
    var cg = get(key);
    if(cg) {
      return {error: 'Key already exists. (' + key + ')', entry: cg};
    }

    return set(key, val, exp);
  };

  // Deletes an entry.
  del = function del(key) {
    if(key && cacheData.entries[key] && delete cacheData.entries[key]) {
      cacheData.len--;
      return true;
    }

    return false;
  };

  // Checks and increments or decrements the value of the given key.
  incdec = function incdec(key, amount, flag) {

    // Init vars
    var result  = {},
        amntF   = (typeof amount != 'undefined') ? amount : 1,
        cData   = get(key)
    ;

    // Check vars
    if(!cData) {
      return {error: 'The key does not exist. (' + key + ')'};
    } else if(typeof cData.val !== 'number' || cData.val % 1 !== 0) {
      return {error: 'The value is not an integer. (' + cData.val + ')'};
    } else if(isNaN(amntF)) {
      return {error: 'Invalid amount. (' + amntF + ')'};
    }

    // Set data
    if(flag == 1) {
      cData.val = (cData.val+amntF);
    } else if(flag == 2) {
      cData.val = (cData.val-amntF);
    }

    result = set(cData.key, cData.val, cData.exp);

    return result;
  };

  // Increments the value of the entry.
  increment = function increment(key, amount) {
    return incdec(key, amount, 1);
  };

  // Decrements the value of the entry.
  decrement = function decrement(key, amount) {
    return incdec(key, amount, 2);
  };

  // Drops the data set.
  drop = function delAll() {
    cacheData.entries = {};
    cacheData.len = 0;

    return true;
  };

  // Executes the given command.
  execCmd = function execCmd(command) {

    // Init vars
    var result  = {cmd: null, cmdArgs: null, cmdRes: null},
        cmdF    = ('' + command).trim()
    ;

    // Check vars
    if(!cmdF) return result;

    // Parse the command
    var cmdMatch  = cmdF.match(regex.command),
        cmdArgs   = cmdF.match(regex.args)
    ;

    result.cmd = (cmdMatch instanceof Array && cmdMatch[0]) ? cmdMatch[0].toLowerCase() : null;
    if(cmdArgs instanceof Array) cmdArgs.shift();
    result.cmdArgs = (cmdArgs instanceof Array) ? cmdArgs : null;

    // Cleanup args
    if(result.cmdArgs) {
      for(var i = 0; i < result.cmdArgs.length; i++) {
        result.cmdArgs[i] = result.cmdArgs[i].replace(regex.trimQuotes, ''); // quotes
        if(regex.number.test(result.cmdArgs[i]) && !isNaN(result.cmdArgs[i]/1)) {
          result.cmdArgs[i] = result.cmdArgs[i]/1; // number
        }
      }
    }

    // Execute the command
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
        result.cmdRes = {error: 'Invalid command! Possible commands: ' + cacheCmds.join(', ')};
    }

    return result;
  };

  // Loads the given file.
  loadFile = function loadFile(filePath) {

    // Init vars
    var deferred  = q.defer(),
        filePathF = ('' + filePath),
        pathSS    = (filePathF && fs.existsSync(filePathF)) ? fs.statSync(filePathF) : null,
        lineCntr  = 0,
        lineErr   = null
    ;

    // Check the file
    if(!pathSS || !pathSS.isFile()) {
      deferred.reject('Invalid file! (' + filePathF + ')');
      return deferred.promise;
    }

    // Init the pipe
    var rl = readline.createInterface({input: fs.createReadStream(filePathF), terminal: false});
    rl.setPrompt('');

    // line event
    rl.on('line', function(iLine) {
      lineCntr++;

      // Check the line
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
    increment: increment,
    decrement: decrement,
    drop: drop,

    execCmd: execCmd,
    loadFile: loadFile
  };
};