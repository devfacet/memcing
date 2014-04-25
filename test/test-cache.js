// Init reqs
/* jslint node: true */
/* global describe: false */
/* global it: false */
'use strict';

var cache   = require('../app/cache'),
    expect  = require('chai').expect
;

// Tests

// Test for cache instance
describe('appCache', function() {

  // Init vars
  var appCache = cache({isDebug: false, limitInKB: 16384}),
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
    it('should set `hello` entry', function(done) {

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
      expect(result.val).to.be.a('number');
      done();
    });
  });

  // add
  describe("add('counter', 1)", function() {
    it('should fail to add `counter` entry', function(done) {

      result = appCache.add('counter', 1);
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

  // stats
  describe("stats()", function() {
    it('should run without any error', function(done) {

      result = appCache.stats();
      if(result.error) {
        done(result.error);
        return;
      }

      expect(result).to.have.property('options');
      expect(result.options).to.be.a('object');
      expect(result).to.have.property('numberOfEntry');
      expect(result.numberOfEntry).to.be.a('number');
      expect(result).to.have.property('numberOfAvlbEntry');
      expect(result.numberOfAvlbEntry).to.be.a('number');
      expect(result).to.have.property('usageInPercent');
      expect(result.usageInPercent).to.be.a('number');
      done();
    });
  });

  // vacuum
  describe("vacuum()", function() {
    it('should run without any error', function(done) {

      result = appCache.vacuum();
      if(result.error) {
        done(result.error);
        return;
      }

      expect(result).to.have.property('timeMS');
      expect(result.timeMS).to.be.a('object');
      expect(result.timeMS).to.have.property('total');
      expect(result.timeMS.total).to.be.a('number');
      expect(result.timeMS).to.have.property('exp');
      expect(result.timeMS.exp).to.be.a('number');
      expect(result.timeMS).to.have.property('eviction');
      expect(result.timeMS.eviction).to.be.a('number');
      done();
    });
  });

  // numOfEntry
  describe("numOfEntry()", function() {
    it('should run without any error', function(done) {

      result = appCache.numOfEntry();
      if(result.error) {
        done(result.error);
        return;
      }

      expect(result).to.be.a('number');
      done();
    });
  });

  // numOfAvlbEntry
  describe("numOfAvlbEntry()", function() {
    it('should run without any error', function(done) {

      result = appCache.numOfAvlbEntry();
      if(result.error) {
        done(result.error);
        return;
      }

      expect(result).to.be.a('number');
      done();
    });
  });

  // sizeOfPerEntry
  describe("sizeOfPerEntry()", function() {
    it('should run without any error', function(done) {

      result = appCache.sizeOfPerEntry();
      if(result.error) {
        done(result.error);
        return;
      }

      expect(result).to.be.a('number');
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