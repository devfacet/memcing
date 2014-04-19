/*
 * Memcing
 * Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

// regex module implements regex related functions.

// Init reqs
/* jslint node: true */
'use strict';

// Init the module
exports = module.exports = function() {

  // Init vars
  var commands    = ['get', 'set', 'add', 'delete', 'drop', 'increment', 'decrement', 'dump', 'stats', 'vacuum', 'exit'], // TODO: Move it to the cache module with cache command function
      command     = new RegExp('^\\b(' + commands.join('|') + ')\\b', 'i'),
      args        = new RegExp('("[^"]*")|([^\\s]+)', 'g'), // TODO: It should support escape chars. Currently \" doesn't work.
      number      = new RegExp('^(-*)[0-9]+(\\.[0-9]+)?$', 'g'),
      trimQuotes  = new RegExp('^"|"$', 'g')
  ;

  // Return
  return {
    command: command,
    args: args,
    number: number,
    trimQuotes: trimQuotes
  };
}();