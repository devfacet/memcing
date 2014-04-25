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
var appCache    = cache({isDebug: true, limitInKB: 131072, eviction: true}), // 128MB
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

  // GET
  describe('get ' + appRESTUrl, function() {
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
  describe('put ' + appRESTUrl + '/entries/hello', function() {
    it('should set an entry', function(done) {
      request({
        method: 'PUT',
        uri : appRESTUrl + '/entries/hello',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
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
  describe('put ' + appRESTUrl + '/entries/bye', function() {
    it('should set an entry with expiration time', function(done) {
      var ts = new Date().getTime();
      request({
        method: 'PUT',
        uri : appRESTUrl + '/entries/bye',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
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

});