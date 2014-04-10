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
npm install
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
```
node memcing.js -i < ../test/cmds-im.txt
```
Reads commands from [cmds-im.txt](https://github.com/cmfatih/memcing/blob/master/test/cmds-im.txt)
and display result.

-

```
node memcing.js -i -load-file ../test/cmds-lf.txt
```
Reads commands from [cmds-lf.txt](https://github.com/cmfatih/memcing/blob/master/test/cmds-lf.txt)
and switch to interactive mode. The cached data will be available in interactive mode.
It stops running while loading the file if there is an error.

### Notes

#### Implementations

* [x] Interactive mode
* [ ] HTTP back-end
      - [ ] get

### Changelog

For all notable changes see [CHANGELOG.md](https://github.com/cmfatih/memcing/blob/master/CHANGELOG.md)

### License

Copyright (c) 2014 Fatih Cetinkaya (http://github.com/cmfatih/memcing)  
Licensed under The MIT License (MIT)  
For the full copyright and license information, please view the LICENSE.txt file.