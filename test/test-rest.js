// Init reqs
/* jslint node: true */
/* global describe: false */
/* global it: false */
'use strict';

var cache   = require('../app/cache'),
    rest    = require('../app/rest'),
    request = require('request'),
    expect  = require('chai').expect
;

var appCache   = cache({debug: false, globLimit: 16384, eviction: true}),
    appREST    = rest({debug: false, verbose: 0, http: {isEnabled: true, hostname: '127.0.0.1', port: 12081}}, appCache),
    appRESTUrl = 'http://' + appREST.addrOf('http')
;

// Tests

// Test for REST API
describe('appREST', function() {

  // listen
  describe('listen()', function() {
    it('should run without any error', function(done) {
      appREST.listen().then(function() {
        done();
      }, function(err) {
        done(err);
      });
    });
  });

  // addrOf
  describe("addrOf('http')", function() {
    it('should return the correct HTTP address (' + appREST.addrOf('http') + ')', function(done) {
      expect(appREST.addrOf('http')).to.equal('127.0.0.1:12081');
      done();
    });
  });

  var reqHeaders = {'Content-Type': 'application/x-www-form-urlencoded'};

  // GET
  describe('GET ' + appRESTUrl, function() {
    it('should respond HTTP 200 and return empty body', function(done) {
      request(appRESTUrl, function (err, res, body) {
        if(!err) {
          expect(res.statusCode).to.equal(200);
          expect(body).to.equal('');
          done();
        } else {
          done(err);
        }
      });
    });
  });

  // PUT entry
  var urlHello = appRESTUrl + '/entries/hello';

  describe('PUT ' + urlHello, function() {
    it('should set `hello` entry', function(done) {
      request({method: 'PUT', uri: urlHello, headers: reqHeaders, body: 'val=world'}, function (err, res, body) {
        if(!err) {
          var resData = JSON.parse(body);
          expect(res.statusCode).to.equal(200);
          expect(resData).to.have.property('key', 'hello');
          expect(resData).to.have.property('val', 'world');
          expect(resData).to.have.property('ts').to.be.above(0);
          expect(resData).to.have.property('expTS', 0);
          done();
        } else {
          done(err);
        }
      });
    });
  });

  // PUT entry with expiration
  var urlBye = appRESTUrl + '/entries/bye';

  describe('PUT ' + urlBye, function() {
    it('should set `bye` entry with expiration time', function(done) {
      request({method: 'PUT', uri: urlBye, headers: reqHeaders, body: 'val=world&exp=60'}, function (err, res, body) {
        if(!err) {
          var resData = JSON.parse(body);
          expect(res.statusCode).to.equal(200);
          expect(resData).to.have.property('key', 'bye');
          expect(resData).to.have.property('val', 'world');
          expect(resData).to.have.property('ts').to.be.above(0);
          expect(resData).to.have.property('expTS').to.be.above(new Date().getTime());
          done();
        } else {
          done(err);
        }
      });
    });
  });

  // POST entry
  var urlCounter = appRESTUrl + '/entries/counter';

  describe('POST ' + urlCounter, function() {
    it('should add `counter` entry', function(done) {
      request({method: 'POST', uri: urlCounter, headers: reqHeaders, body: 'val=1'}, function (err, res, body) {
        if(!err) {
          var resData = JSON.parse(body);
          expect(res.statusCode).to.equal(200);
          expect(resData).to.have.property('key', 'counter');
          expect(resData).to.have.property('val', 1);
          expect(resData).to.have.property('ts').to.be.above(0);
          expect(resData).to.have.property('expTS', 0);
          done();
        } else {
          done(err);
        }
      });
    });
  });

  // POST entry
  describe('POST ' + urlCounter, function() {
    it('should fail, respond HTTP 409 and return current entry', function(done) {
      request({
        method: 'POST', uri: urlCounter, headers: reqHeaders, body: 'val=2'}, function (err, res, body) {
        if(!err) {
          var resData = JSON.parse(body);
          expect(res.statusCode).to.equal(409);
          expect(resData.entry).to.have.property('key', 'counter');
          expect(resData.entry).to.have.property('val', 1);
          done();
        } else {
          done('No error!');
        }
      });
    });
  });

  // DELETE entry
  describe('DELETE ' + urlCounter, function() {
    it('should delete `counter` entry and return empty body', function(done) {
      request({method: 'DELETE', uri: urlCounter}, function (err, res, body) {
        if(!err) {
          expect(res.statusCode).to.equal(200);
          expect(body).to.equal('');
          done();
        } else {
          done(err);
        }
      });
    });
  });

  // GET entries
  var urlEntries = appRESTUrl + '/entries';

  describe('GET ' + urlEntries, function() {
    it('should get all entries', function(done) {
      request(urlEntries, function (err, res, body) {
        if(!err) {
          var resData = JSON.parse(body);
          expect(res.statusCode).to.equal(200);
          expect(resData).to.be.a('array');
          expect(resData).to.have.length(2); // entry `bye` should exists
          done();
        } else {
          done(err);
        }
      });
    });
  });

  // DELETE entries
  describe('DELETE ' + urlEntries, function() {
    it('should delete all entries and return empty body', function(done) {
      request({method: 'DELETE', uri: urlEntries}, function (err, res, body) {
        if(!err) {
          expect(res.statusCode).to.equal(200);
          expect(body).to.equal('');
          done();
        } else {
          done(err);
        }
      });
    });
  });
});