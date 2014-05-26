// Init reqs
/* jslint node: true */
/* global describe: false */
/* global it: false */
'use strict';

var spawn   = require('child_process').spawn,
    request = require('request'),
    expect  = require('chai').expect;

// Tests

// Test for options
describe('options', function() {

  var child      = spawn('node', ['./app/memcing.js', '-load-file', 'test/cmds-lf.txt', '-listen-http', ':12082', '-verbose'], {stdio: 'inherit', env: process.env}),
      restUrl    = 'http://127.0.0.1:12082',
      urlEntries = restUrl + '/entries';

  // listen-http
  describe('-listen-http', function() {
    it('should listen on 0.0.0.0:12082', function(done) {
      request(restUrl, function (err, res, body) {
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

  // load-file
  describe('-load-file', function() {
    it('should load all entries in test/cmds-lf.txt', function(done) {
      request(urlEntries, function (err, res, body) {
        if(!err) {
          var resData = JSON.parse(body);
          expect(res.statusCode).to.equal(200);
          expect(resData).to.be.a('array');
          expect(resData).to.have.length(3);
          expect(resData[0]).to.be.a('object');
          expect(resData[0]).to.have.property('key');
          expect(resData[0]).to.have.property('val');
          expect(resData[0]).to.have.property('ts').to.be.above(0);
          expect(resData[0]).to.have.property('expTS');
          done();
        } else {
          done(err);
        }
        child.kill();
      });
    });
  });
});