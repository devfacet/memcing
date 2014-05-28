// Init reqs
/* jslint node: true */
/* global describe: false */
/* global it: false */
'use strict';

var spawn   = require('child_process').spawn,
    request = require('request'),
    expect  = require('chai').expect;

// Tests

// Test for stdin
describe('stdin', function() {

  var echoCmd,
      mingCmd,
      restUrl;

  //stream
  describe('`echo hello world | memcing.js`', function() {
    it('should add an entry', function(done) {

      echoCmd = spawn('echo', ['hello', 'world']);
      mingCmd = spawn('node', ['app/memcing.js', '-listen-http', ':12083', '-verbose']);
      restUrl = 'http://127.0.0.1:12083';

      echoCmd.stdout.on('data', function(data) {
        mingCmd.stdin.write(data);
      });

      echoCmd.on('close', function() {
        mingCmd.stdin.end();

        request(restUrl + '/entries/hello', function(err, res, body) {
          if(!err) {
            var resData = JSON.parse(body);
            expect(res.statusCode).to.equal(200);
            expect(resData).to.be.a('object');
            expect(resData).to.have.property('key', 'hello');
            expect(resData).to.have.property('val', 'world');
            expect(resData).to.have.property('ts').to.be.above(0);
            expect(resData).to.have.property('expTS', 0);
            done();
          } else {
            done(err);
          }
          echoCmd.kill();
          mingCmd.kill();
        });
      });
    });
  });

  //csv
  describe('`cat test/csv-sample.csv | memcing.js -csv`', function() {
    it('should load entries from the given CSV stream', function(done) {

      echoCmd = spawn('cat', ['test/csv-sample.csv']);
      mingCmd = spawn('node', ['app/memcing.js', '-listen-http', ':12084', '-csv', '-verbose']);
      restUrl = 'http://127.0.0.1:12084';

      echoCmd.stdout.on('data', function(data) {
        mingCmd.stdin.write(data);
      });

      echoCmd.on('close', function() {
        mingCmd.stdin.end();

        request(restUrl + '/entries', function(err, res, body) {
          if(!err) {
            var resData = JSON.parse(body);
            expect(res.statusCode).to.equal(200);

            expect(resData).to.be.a('array');
            expect(resData).to.have.property('length').to.be.equal(4);

            for(var key in resData) {
              if(resData.hasOwnProperty(key)) {
                if(resData[key].key === 'hello') {
                  expect(JSON.parse(resData[key].val)).to.be.a('array').with.deep.equal(['hello', 'world']);
                } else if(resData[key].key === 'counter') {
                  expect(JSON.parse(resData[key].val)).to.be.a('array').with.deep.equal(['counter', '1']);
                } else if(resData[key].key === 'foo') {
                  expect(JSON.parse(resData[key].val)).to.be.a('array').with.deep.equal(['  foo', ' bar', '1 ']);
                } else if(resData[key].key === 'test key') {
                  expect(JSON.parse(resData[key].val)).to.be.a('array').with.deep.equal(['test key', 'hello world', '3rd']);
                }
              }
            }

            done();
          } else {
            done(err);
          }
          echoCmd.kill();
          mingCmd.kill();
        });
      });
    });

    // csv - fields
    it('should apply CSV field options', function(done) {

      echoCmd = spawn('cat', ['test/csv-sample.csv']);
      mingCmd = spawn('node', ['app/memcing.js', '-listen-http', ':12084', '-csv', '-csv-delimiter', ',', '-csv-field-key', '2', '-csv-field-filter', '1,2', 'verbose']);
      restUrl = 'http://127.0.0.1:12084';

      echoCmd.stdout.on('data', function(data) {
        mingCmd.stdin.write(data);
      });

      echoCmd.on('close', function() {
        mingCmd.stdin.end();

        request(restUrl + '/entries', function(err, res, body) {
          if(!err) {
            var resData = JSON.parse(body);
            expect(res.statusCode).to.equal(200);

            expect(resData).to.be.a('array');
            expect(resData).to.have.property('length').to.be.equal(4);

            for(var key in resData) {
              if(resData.hasOwnProperty(key)) {
                if(resData[key].key === 'world') {
                  expect(JSON.parse(resData[key].val)).to.be.a('array').with.deep.equal(['hello', 'world']);
                } else if(resData[key].key === 1) {
                  expect(JSON.parse(resData[key].val)).to.be.a('array').with.deep.equal(['counter', '1']);
                } else if(resData[key].key === 'bar') {
                  expect(JSON.parse(resData[key].val)).to.be.a('array').with.deep.equal(['  foo', ' bar']);
                } else if(resData[key].key === 'hello world') {
                  expect(JSON.parse(resData[key].val)).to.be.a('array').with.deep.equal(['test key', 'hello world']);
                }
              }
            }

            done();
          } else {
            done(err);
          }
          echoCmd.kill();
          mingCmd.kill();
        });
      });
    });
  });

  // cmd
  describe('`cat test/cmds-dup.txt | memcing.js -cmd`', function() {
    it('should load entries from the given command stream', function(done) {

      echoCmd = spawn('cat', ['test/cmds-dup.txt']);
      mingCmd = spawn('node', ['app/memcing.js', '-listen-http', ':12085', '-cmd', '-verbose']);
      restUrl = 'http://127.0.0.1:12085';

      echoCmd.stdout.on('data', function(data) {
        mingCmd.stdin.write(data);
      });

      echoCmd.on('close', function() {
        mingCmd.stdin.end();

        request(restUrl + '/entries/counter', function(err, res, body) {
          if(!err) {
            var resData = JSON.parse(body);
            expect(res.statusCode).to.equal(200);
            expect(resData).to.be.a('object');
            expect(resData).to.have.property('key', 'counter');
            expect(resData).to.have.property('val', 2);
            expect(resData).to.have.property('ts').to.be.above(0);
            expect(resData).to.have.property('expTS', 0);
            done();
          } else {
            done(err);
          }
          echoCmd.kill();
          mingCmd.kill();
        });
      });
    });
  });
});