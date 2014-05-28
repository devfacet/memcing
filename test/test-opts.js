// Init reqs
/* jslint node: true */
/* global describe: false */
/* global it: false */
'use strict';

var spawn   = require('child_process').spawn,
    exec    = require('child_process').exec,
    request = require('request'),
    expect  = require('chai').expect;

// Tests

// Test for options
describe('options', function() {

  if(process.env.NODE_TEST_LEVEL < 2) return;

  var mingCmd    = spawn('node', ['app/memcing.js', '-load-file', 'test/cmds-lf.txt', '-listen-http', ':12082', '-verbose'], {stdio: 'inherit', env: process.env}),
      restUrl    = 'http://127.0.0.1:12082',
      urlEntries = restUrl + '/entries',
      reqDelay   = 500;

  // load-file
  describe('`memcing.js -load-file`', function() {
    it('should load commands from the given file', function(done) {

      setTimeout(function() {
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
      }, reqDelay);
    });

    it('should fail to load commands from the given bad file', function(done) {

      exec('node app/memcing.js -load-file test/cmds-dup.txt -verbose 5 -debug', function(err, stdout, stderr) {
        
        if(err) {
          done(err);
          return;
        } else if(stderr) {
          done(stderr);
          return;
        }

        var resData = (''+stdout).replace(/\r?\n/g, '');
        expect(resData).to.contain('Key already exists. (hello) - line #4: add hello again');
        done();
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
        mingCmd.kill();
      });
    });
  });
});