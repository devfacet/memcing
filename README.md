## Memcing

[memcing](http://github.com/cmfatih/memcing) is an in-memory key-value caching application 
with REST API feature.

memcing on [npm registry](http://npmjs.org/package/memcing)   

[![NPM][npm-image]][npm-url] | [![Build Status][travis-image]][travis-url] | [![Dependency Status][depstatus-image]][depstatus-url]
---------- | ---------- | ----------


### Installation

For latest release
```
npm install memcing
```

For HEAD
```
git clone https://github.com/cmfatih/memcing.git
```

### Usage

#### Test
```
npm test
```

#### Interactive mode
```
npm start
```
Add an entry (`add hello world`) and see `http://localhost:12080/entries/hello`

#### Help
```
node memcing.js -help
```
```
  Options:
    -i              : Enable interactive mode.
    -listen-http    : Listen HTTP requests for REST API.
                      Default; localhost:12080

    -load-file      : Load a command file.
    -cache-limit    : Cache size limit in bytes. Default (16MB); 16777216
    -entry-limit    : Entry size limit in bytes. Default (1KB); 1024
    -vacuum-delay   : Delay in seconds for vacuum. Default; 30
    -eviction       : Enable eviction mode.

    -debug          : Enable debug mode.
    -verbose        : Set verbose message level. Default; 1
    -help           : Display help and exit.

  Commands:
    get key
    set key value [expire = 0]
    add key value [expire = 0]
    increment key [amount = 1]
    decrement key [amount = 1]
    delete key
    drop
    dump
    stats
    vacuum
    exit
```

#### Examples

Interactive mode and RESTful can be used in same time.
```
node memcing.js -load-file ../test/cmds-lf.txt -i -listen-http localhost:12080
```
Reads commands from [cmds-lf.txt](https://github.com/cmfatih/memcing/blob/master/test/cmds-lf.txt)
then switch to interactive mode and listen http requests. The cached data will be available for 
REPL and REST API.  

For REST API performance tests;  
`ab -n 10000 http://localhost:12080/entries/hello`  
`ab -n 10000 -c 100 http://localhost:12080/entries/hello`

-

##### Postal Code Service Example

You can create a postal code service with;
```
([ -f zip.zip ] || wget -qO zip.zip http://download.geonames.org/export/zip/US.zip) && unzip -p zip.zip US.txt \
| cat | awk -v sq="'" -F"\\t" '{ print "set \""$2"\" \"["sq$1sq","sq$3sq","sq$4sq","sq$5sq","sq$6sq","sq$10sq","sq$11sq"]\""}' \
| node memcing.js -cache-limit 67108864 -listen-http 0.0.0.0:12080
```

See `http://localhost:12080/entries/78729`
```JSON
{
  "key": 78729,
  "val": "['US','Austin','Texas','TX','Williamson','30.4521','-97.7688']",
  "ts": 1397288286856,
  "expTS": 0
}
```

If you want to include other countries see http://download.geonames.org/export/zip/
and change the part (`US.zip` and `US.txt`) of the command at above. 

### REST API

*REST API is still under development. For the current implementations 
See [Implementations](#implementations)*  

**Notes**
* Use `application/x-www-form-urlencoded` for request method.
* Use `val` query parameter for value.
* Use `exp` query parameter for expiration.

**PUT**

```
/entries/{KEY}
```
PUT method represent the `set` command.

Examples:
```
curl -X PUT -d "val=world" http://localhost:12080/entries/hello
curl -X PUT -d "val=world&exp=10" http://localhost:12080/entries/bye
```

**POST**

```
/entries/{KEY}
```
POST method represent the `add` command.

Examples:
```
curl -X POST -d "val=1" http://localhost:12080/entries/counter
```

**GET**

```
/entries
/entries/{KEY}
```
GET method represent the `get` command.

Examples:
```
curl http://localhost:12080/entries
curl http://localhost:12080/entries/hello
```

**DELETE**

```
/entries
/entries/{KEY}
```
DELETE method represent the `delete` or the `drop` command.

Examples:
```
curl -X DELETE http://localhost:12080/entries/hello
curl -X DELETE http://localhost:12080/entries
```

### Notes

* For issues see [Issues](https://github.com/cmfatih/memcing/issues)
* For design goals and coding see [coding](https://github.com/cmfatih/coding)
* memcing is 'originally' developed for an interview exam. The requirements were; 
non-persistent, non-durable and supporting eviction. But later I have decided to continue...

#### Implementations

* [x] Interactive mode
* [ ] REST API
      - [x] GET
        - [x] Collection (`/entries`)
        - [x] Element (`/entries/{KEY}`)
      - [ ] PUT
        - [ ] Collection (`/entries`)
        - [x] Element (`/entries/{KEY}`)
      - [ ] POST
        - [ ] Collection (`/entries`)
        - [x] Element (`/entries/{KEY}`)
      - [x] DELETE
        - [x] Collection (`/entries`)
        - [x] Element (`/entries/{KEY}`)

### Changelog

For all notable changes see [CHANGELOG.md](https://github.com/cmfatih/memcing/blob/master/CHANGELOG.md)

### License

Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)  
Licensed under The MIT License (MIT)  
For the full copyright and license information, please view the LICENSE.txt file.

[npm-url]: http://npmjs.org/package/memcing
[npm-image]: https://nodei.co/npm/memcing.png?compact=true

[travis-url]: https://travis-ci.org/cmfatih/memcing
[travis-image]: https://travis-ci.org/cmfatih/memcing.svg?branch=master

[appveyor-url]: https://ci.appveyor.com/project/cmfatih/memcing
[appveyor-image]: https://ci.appveyor.com/api/projects/status/811fxhv7iok8x5u6

[depstatus-url]: https://david-dm.org/cmfatih/memcing
[depstatus-image]: https://david-dm.org/cmfatih/memcing.png