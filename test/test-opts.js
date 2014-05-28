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

  var child      = spawn('node', ['app/memcing.js', '-load-file', 'test/cmds-lf.txt', '-listen-http', ':12082', '-verbose'], {stdio: 'inherit', env: process.env}),
      restUrl    = 'http://127.0.0.1:12082',
      urlEntries = restUrl + '/entries';

  // load-file
  describe('`memcing.js -load-file`', function() {
    it('should load commands from the given file', function(done) {
      request(urlEntries, function (err, res, body) {
        if(!err) {
          var resData = JSON.parse(body);
          expect(res.statusCode).to.equal(200);

          expect(resData).to.be.a('array');
          expect(resData).to.have.property('length').to.be.equal(3);

          for(var key in resData) {
            if(resData.hasOwnProperty(key)) {
              if(resData[key].key === 'hello') {
                expect(resData[key]).to.have.property('val', 'world');
                expect(resData[key]).to.have.property('ts').to.be.above(0);
              } else if(resData[key].key === 'counter') {
                expect(resData[key]).to.have.property('val').to.be.equal(1);
              } else if(resData[key].key === 'bye') {
                expect(resData[key]).to.have.property('val', 'bye');
                expect(resData[key]).to.have.property('expTS').to.be.above(new Date().getTime());
              }
            }
          }

          done();
        } else {
          done(err);
        }
      });
    });
  });

  // listen-http
  describe('`memcing.js -listen-http`', function() {
    it('should listen HTTP requests', function(done) {
      request(restUrl, function (err, res, body) {
        if(!err) {
          expect(res.statusCode).to.equal(200);
          expect(body).to.equal('');
          done();
        } else {
          done(err);
        }
        child.kill();
      });
    });
  });
});