## Memcing

[memcing](http://github.com/cmfatih/memcing) is an application for simple memory caching.  

memcing on [npm registry](http://npmjs.org/package/memcing)  

**memcing is developed for an interview exam so do not expect too much at the moment.**  

### Installation

For latest release
```
npm install memcing
```

For HEAD
```
git clone https://github.com/cmfatih/memcing.git
cd memcing/ && npm install
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
    -i             : Interactive mode.
    -load-file     : Load a command file.
    -cache-limit   : Cache limit in KB. Default; 16384 kilobytes
    -vacuum-ival   : Interval for vacuum. Default; 30 seconds
    -eviction      : Eviction mode. Default; false
    -listen-http   : Listen http requests. Example; hostname[:port]
    -help          : Display help and exit.

  Commands:
    get key
    set key value [expire = 0]
    add key value [expire = 0]
    increment key [amount = 1]
    decrement key [amount = 1]
    delete key
    vacuum
    stats
    dump
    exit
```

#### Examples

Interactive mode and RESTful can be used in same time.
```
node memcing.js -load-file ../test/cmds-lf.txt -i -listen-http localhost:12080
```
Reads commands from [cmds-lf.txt](https://github.com/cmfatih/memcing/blob/master/test/cmds-lf.txt)
then switch to interactive mode and listen http requests. The cached data will be available for 
interactive mode and RESTful (`http://localhost:12080/entries/KEY`) requests.  

For RESTful performance; `ab -n 10000 -c 100 http://localhost:12080/entries/hello`

-

Commands can be pass via stdin.
```
node memcing.js -i < ../test/cmds-im.txt
```
Reads commands from [cmds-im.txt](https://github.com/cmfatih/memcing/blob/master/test/cmds-im.txt)
and display result.

-

##### Postal Code Service Example

You can create a postal code service with two lines of command.
```
([ -f zip.zip ] || wget -qO zip.zip http://download.geonames.org/export/zip/US.zip) && unzip -p zip.zip US.txt | cat | awk -v sq="'" -F"\\t" '{ print "set \""$2"\" \"["sq$1sq","sq$3sq","sq$4sq","sq$5sq","sq$6sq","sq$10sq","sq$11sq"]\""}' > cmds-postal-codes.txt
node memcing.js -cache-limit 65536 -listen-http 0.0.0.0:12080 -load-file ./cmds-postal-codes.txt
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


### Notes

#### Implementations

* [x] Interactive mode
* [ ] RESTful
      - [x] GET
        - [x] Collection (`/entries`)
        - [x] Element (`/entries/KEY`)
      - [ ] PUT
      - [ ] POST
      - [ ] DELETE

### Changelog

For all notable changes see [CHANGELOG.md](https://github.com/cmfatih/memcing/blob/master/CHANGELOG.md)

### License

Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)  
Licensed under The MIT License (MIT)  
For the full copyright and license information, please view the LICENSE.txt file.