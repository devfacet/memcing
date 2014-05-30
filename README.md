## Memcing

[memcing](http://github.com/cmfatih/memcing) is an in-memory key-value caching application with RESTful API.  

[![Build Status][travis-image]][travis-url] | [![NPM][npm-image]][npm-url]
---------- | ----------

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
    -i                 : Enable interactive mode.
    -listen-http       : Listen HTTP requests. Default; 0.0.0.0:12080
    -load-file         : Load a command file.

    -cache-limit       : Cache size limit in bytes. Default (128MB); 134217728
    -entry-limit       : Entry size limit in bytes. Default (1KB); 1024
    -vacuum-delay      : Delay in seconds for vacuum. Default; 30
    -eviction          : Enable eviction mode.

    -debug             : Enable debug mode.
    -verbose           : Set verbose message level. Default; 1
    -help              : Display help and exit.

  stdin:
    -cmd               : Enable command mode for stdin.
    -csv               : Enable CSV mode for stdin.
    -csv-delimiter     : CSV delimiter (char or `tab`). Default; ,
    -csv-field-key     : Key field index on CSV. Default; 1
    -csv-field-filter  : Include fields on CSV. Default (all); null
                         Example; -csv-field-filter 1,2

  Interactive mode commands:
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
node memcing.js -load-file ../test/cmds-lf.txt -i -listen-http
```
Reads commands from [cmds-lf.txt](https://github.com/cmfatih/memcing/blob/master/test/cmds-lf.txt)
then switch to interactive mode and listen http requests. The cached data will be available for 
REPL and RESTful API.  

For RESTful API performance tests;  
`ab -n 10000 http://localhost:12080/entries/hello`  
`ab -n 10000 -c 100 http://localhost:12080/entries/hello`

-

##### Postal Code Service Example

You can easily create a postal code service;
```
wget -qO zip-codes.zip http://download.geonames.org/export/zip/US.zip && unzip -p zip-codes.zip US.txt | cat \
| node memcing.js -listen-http -csv -csv-delimiter tab -csv-field-key 2 -csv-field-filter 1,3,4,5,6,10,11
```

See `http://localhost:12080/entries/78729`
```JSON
{
  "key":"78729",
  "val":"[\"US\",\"Austin\",\"Texas\",\"TX\",\"Williamson\",\"30.4521\",\"-97.7688\"]",
  "ts":1401417873489,
  "expTS":0
}
```

If you want to include other countries see http://download.geonames.org/export/zip/
and change the part (`US.zip` and `US.txt`) of the command at above. 

### RESTful API

*RESTful API is still under development. For the current implementations 
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
* memcing is 'originally' developed for an interview code exercise. The requirements were; 
non-persistent, non-durable and supporting eviction.

#### Implementations

- [x] Interactive mode
- [ ] RESTful API
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
[npm-image]: https://badge.fury.io/js/memcing.png

[travis-url]: https://travis-ci.org/cmfatih/memcing
[travis-image]: https://travis-ci.org/cmfatih/memcing.svg?branch=master