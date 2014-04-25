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

// Init vars
var appCache    = cache({isDebug: false, limitInKB: 16384, eviction: true}), // 16MB
    appREST     = rest({http: {isEnabled: true}}, appCache),
    appRESTUrl  = 'http://' + appREST.addrOf('http')
;

// Tests

// Test for REST API instance
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
  describe('addrOf(\'http\')', function() {
    it('should run without any error', function(done) {
      appREST.addrOf('http');
      done();
    });
  });
});

// Test for HTTP requests
describe('request', function() {

  // Init vars
  var reqHeaders = {'Content-Type': 'application/x-www-form-urlencoded'};

  // GET
  describe('GET ' + appRESTUrl, function() {
    it('should respond HTTP status code 200', function(done) {
      request(appRESTUrl, function (err, res) {
        if(!err) {
          expect(res.statusCode).to.equal(200);
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
      request({
        method: 'PUT',
        uri : urlHello,
        headers: reqHeaders,
        body: 'val=world'
      }, function (err, res, body) {
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
      var ts = new Date().getTime();
      request({
        method: 'PUT',
        uri : urlBye,
        headers: reqHeaders,
        body: 'val=world&exp=10'
      }, function (err, res, body) {
        if(!err) {
          var resData = JSON.parse(body);
          expect(res.statusCode).to.equal(200);
          expect(resData).to.have.property('key', 'bye');
          expect(resData).to.have.property('val', 'world');
          expect(resData).to.have.property('ts').to.be.above(0);
          expect(resData).to.have.property('expTS').to.be.above(ts);
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
      request({
        method: 'POST',
        uri : urlCounter,
        headers: reqHeaders,
        body: 'val=1'
      }, function (err, res, body) {
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
    it('should fail and respond HTTP status code 409', function(done) {
      request({
        method: 'POST',
        uri : urlCounter,
        headers: reqHeaders,
        body: 'val=1'
      }, function (err, res, body) {
        if(!err) {
          var resData = JSON.parse(body);
          expect(res.statusCode).to.equal(409);
          expect(resData.entry).to.have.property('key', 'counter');
          expect(resData.entry).to.have.property('val', 1);
          expect(resData.entry).to.have.property('ts').to.be.above(0);
          expect(resData.entry).to.have.property('expTS', 0);
          done();
        } else {
          done(err);
        }
      });
    });
  });

  // DELETE entry
  describe('DELETE ' + urlCounter, function() {
    it('should delete `counter` entry', function(done) {
      request({
        method: 'DELETE',
        uri : urlCounter
      }, function (err, res, body) {
        if(!err) {
          expect(res.statusCode).to.equal(200);
          done();
        } else {
          done(err);
        }
      });
    });
  });

  // DELETE entries
  var urlEntries = appRESTUrl + '/entries';

  describe('DELETE ' + urlEntries, function() {
    it('should delete all entries', function(done) {
      request({
        method: 'DELETE',
        uri : urlEntries
      }, function (err, res) {
        if(!err) {
          expect(res.statusCode).to.equal(200);
          done();
        } else {
          done(err);
        }
      });
    });
  });
});