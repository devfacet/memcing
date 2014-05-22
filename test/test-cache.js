// Init reqs
/* jslint node: true */
/* global describe: false */
/* global it: false */
'use strict';

var cache  = require('../app/cache'),
    expect = require('chai').expect
;

// Tests

// Test for cache instance
describe('appCache', function() {

  var appCache = cache({debug: false, globLimit: 16384, entryLimit: 256, eviction: true}),
      result
  ;

  // set
  describe("set('hello', 'world')", function() {
    it('should set `hello` entry', function(done) {

      result = appCache.set('hello', 'world');
      if(result.error) {
        done(result.error);
        return;
      }

      expect(result).to.have.property('key', 'hello');
      expect(result).to.have.property('val', 'world');
      expect(result).to.have.property('ts').to.be.above(0);
      expect(result).to.have.property('expTS', 0);
      done();
    });
  });

  // set with expiration
  describe("set('hello', 'world', 10)", function() {
    it('should set `hello` entry with expiration time', function(done) {

      result = appCache.set('hello', 'world', 10);
      if(result.error) {
        done(result.error);
        return;
      }

      expect(result).to.have.property('key', 'hello');
      expect(result).to.have.property('val', 'world');
      expect(result).to.have.property('ts').to.be.above(0);
      expect(result).to.have.property('expTS').to.be.above(new Date().getTime());
      done();
    });
  });

  // add
  describe("add('counter', 1)", function() {
    it('should add `counter` entry', function(done) {

      result = appCache.add('counter', 1);
      if(result.error) {
        done(result.error);
        return;
      }

      expect(result).to.have.property('key', 'counter');
      expect(result).to.have.property('val', 1);
      done();
    });
  });

  // add
  describe("add('counter', 2)", function() {
    it('should fail and return current entry', function(done) {

      result = appCache.add('counter', 2);
      if(!result.error) {
        done('No error!');
        return;
      }

      expect(result.entry).to.have.property('key', 'counter');
      expect(result.entry).to.have.property('val', 1);
      done();
    });
  });

  // get
  describe("get('counter')", function() {
    it('should get `counter` entry', function(done) {

      result = appCache.get('counter', 1);
      if(result.error) {
        done(result.error);
        return;
      }

      expect(result).to.have.property('key', 'counter');
      expect(result).to.have.property('val', 1);
      done();
    });
  });

  // increment
  describe("increment('counter')", function() {
    it('should increment value of the `counter` entry', function(done) {

      result = appCache.increment('counter');
      if(result.error) {
        done(result.error);
        return;
      }

      expect(result).to.have.property('key', 'counter');
      expect(result).to.have.property('val', 2);
      done();
    });
  });

  // decrement
  describe("decrement('counter')", function() {
    it('should decrement value of the `counter` entry', function(done) {

      result = appCache.decrement('counter');
      if(result.error) {
        done(result.error);
        return;
      }

      expect(result).to.have.property('key', 'counter');
      expect(result).to.have.property('val', 1);
      done();
    });
  });

  // del
  describe("del('counter')", function() {
    it('should delete `counter` entry', function(done) {

      result = appCache.del('counter');
      if(result.error) {
        done(result.error);
        return;
      }

      expect(result).to.equal(true);
      done();
    });
  });

  // vacuum
  describe("vacuum()", function() {
    it('should run without any error and return exec times', function(done) {

      result = appCache.vacuum({all: true});
      if(result.error) {
        done(result.error);
        return;
      }

      expect(result).to.have.property('timeMs');
      expect(result.timeMs).to.be.a('object');
      expect(result.timeMs).to.have.property('total');
      expect(result.timeMs.total).to.be.a('number');
      expect(result.timeMs).to.have.property('exp');
      expect(result.timeMs.exp).to.be.a('number');
      expect(result.timeMs).to.have.property('eviction');
      expect(result.timeMs.eviction).to.be.a('number');
      done();
    });
  });

  // stats
  describe("stats()", function() {
    it('should return stats', function(done) {

      result = appCache.stats();
      if(result.error) {
        done(result.error);
        return;
      }

      expect(result).to.have.property('options');
      expect(result.options).to.be.a('object');

      expect(result.options).to.have.property('limit');
      expect(result.options.limit).to.be.a('object');
      expect(result.options.limit.glob).to.be.a('object');
      expect(result.options.limit.glob).to.have.property('inByte', 16384);
      expect(result.options.limit.glob).to.have.property('inEntry', 16384/256);
      expect(result.options.limit.entry).to.be.a('object');
      expect(result.options.limit.entry).to.have.property('inByte', 256);
      expect(result.options.limit.entry).to.have.property('inChar', 256/4);

      expect(result.options.vacuum).to.be.a('object');
      expect(result.options.vacuum).to.have.property('delay');
      expect(result.options.vacuum.delay).to.be.a('number');
      expect(result.options.vacuum).to.have.property('running');
      expect(result.options.vacuum.running).to.be.a('boolean');

      expect(result.options.eviction).to.be.a('object');
      expect(result.options.eviction).to.have.property('enabled');
      expect(result.options.eviction.enabled).to.be.a('boolean');
      expect(result.options.eviction).to.have.property('numOfEntry');
      expect(result.options.eviction.numOfEntry).to.be.a('number');

      expect(result).to.have.property('entries');
      expect(result.entries).to.be.a('object');
      expect(result.entries).to.have.property('current', 1);
      expect(result.entries).to.have.property('available', ((16384/256)-1));
      expect(result.entries).to.have.property('evictable', 1);

      expect(result).to.have.property('usage');
      expect(result.usage).to.have.property('totalInP', 1);

      expect(result).to.have.property('operations');
      expect(result.operations).to.be.a('object');
      expect(result.operations).to.have.property('ts');
      expect(result.operations.ts).to.be.a('object');
      expect(result.operations.ts).to.have.property('vacuum');
      expect(result.operations.ts.vacuum).to.be.above(0);
      expect(result.operations.ts).to.have.property('expiration');
      expect(result.operations.ts.expiration).to.be.above(0);
      expect(result.operations.ts).to.have.property('eviction', 0);
      expect(result.operations.ts).to.have.property('outOfLimit', 0);
      done();
    });
  });

  // numOfEntry
  describe("numOfEntry()", function() {
    it('should return number of entry', function(done) {

      result = appCache.numOfEntry();
      if(result.error) {
        done(result.error);
        return;
      }

      expect(result).to.be.equal(1);
      done();
    });
  });

  // numOfAvlbEntry
  describe("numOfAvlbEntry()", function() {
    it('should return number of available entry', function(done) {

      result = appCache.numOfAvlbEntry();
      if(result.error) {
        done(result.error);
        return;
      }

      expect(result).to.be.equal(((16384/256)-1));
      done();
    });
  });

  // entries
  describe("entries()", function() {
    it('should get all entries', function(done) {

      result = appCache.entries();
      if(result.error) {
        done(result.error);
        return;
      }

      expect(result).to.have.property('hello');
      expect(result.hello).to.be.a('object');
      expect(result.hello).to.have.property('key', 'hello');
      expect(result.hello).to.have.property('val', 'world');
      done();
    });
  });

  // drop
  describe("drop()", function() {
    it('should delete all entries', function(done) {

      result = appCache.drop();
      if(result.error) {
        done(result.error);
        return;
      }

      expect(result).to.equal(true);
      done();
    });
  });
});