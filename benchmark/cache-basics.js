// Init reqs
/* jslint node: true */
'use strict';

var utilex = require('utilex'),
    cache  = require('../app/cache');

var appArgs   = utilex.appArgs(),
    appConfig = {isHeapdump: false},
    appCache  = cache({debug: false, globLimit: 134217728, eviction: false});

// config
if(typeof appArgs['heapdump'] !== 'undefined') {
  var heapdump = require('heapdump');
  appConfig.isHeapdump = true;
}

// Tests

// Init vars
var entries      = [],
    entryLimit   = 100000,
    checklist    = [],
    checklistLen = 0,
    randKey,
    randVal,
    hrtime,
    hrtimeGlob,
    hrtimeDiff = function(hrtime) {
      hrtime = process.hrtime(hrtime);
      return ((hrtime[0]*1000)+(hrtime[1]*1.0e-6)).toFixed(4);
    },
    i;

hrtimeGlob = process.hrtime();
utilex.conLog('Benchmark process is starting...');

// Create entries
utilex.conLog('Preparing ' + entryLimit + ' entries...');
hrtime = process.hrtime();
for(i = 0; i < entryLimit; i++) {
  randKey = (Math.random() + 1).toString(36).substring(2) + (Math.random() + 1).toString(36).substring(2);
  randVal = (Math.random() + 1).toString(36).substring(2) + (Math.random() + 1).toString(36).substring(2) + (Math.random() + 1).toString(36).substring(2);

  if(Math.random() > 0.5) checklist.push(randKey);

  entries.push([randKey, randVal]);
}
utilex.conLog('Done! ' + hrtimeDiff(hrtime) + 'ms');
checklistLen = checklist.length;

// Add entries
utilex.conLog('Caching ' + entryLimit + ' entries...');
hrtime = process.hrtime();
for(i = 0; i < entryLimit; i++) {
  appCache.set(entries[i][0], entries[i][1]);
}
utilex.conLog('Done! ' + hrtimeDiff(hrtime) + 'ms');

// Get entries
utilex.conLog('Checking ' + checklistLen + ' randomly selected entries...');
hrtime = process.hrtime();
for(i = 0; i < checklistLen; i++) {
  appCache.get(checklist[i]);
}
utilex.conLog('Done! ' + hrtimeDiff(hrtime) + 'ms');

// Delete entries
utilex.conLog('Deleting ' + checklistLen + ' randomly selected entries...');
hrtime = process.hrtime();
for(i = 0; i < checklistLen; i++) {
  appCache.del(checklist[i]);
}
utilex.conLog('Done! ' + hrtimeDiff(hrtime) + 'ms');

// Stats
utilex.conLog('Stats for entries:' + JSON.stringify(appCache.stats().entries));
console.log(appCache.stats().entries);

utilex.conLog('Benchmark process is done! ' + hrtimeDiff(hrtimeGlob) + 'ms');

// heapdump
if(appConfig.isHeapdump === true) {
  heapdump.writeSnapshot(__dirname + '/dump-' + Date.now() + '.heapsnapshot');
}

process.exit(0);