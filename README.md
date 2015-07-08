# piperline

Simple task pipeline runner.

[![npm version](https://badge.fury.io/js/piperline.svg)](https://www.npmjs.com/package/piperline)
[![Dependency Status](https://david-dm.org/ziflex/piperline.svg)](https://david-dm.org/ziflex/piperline)

## Features
* async tasks
* re-usage
* interruption
* extensibility
* event-based control

## Usage

### Basic

```

    var piperline = require('piperline');
    
    piperline.create()
        .pipe(function(data, next, done) {
            next('foo');
        })
        .pipe(function(data, next, done) {
            next(data + ' bar');
        })
        .on('error', function(err) {
            console.error(err);
        })
        .on('done', function(result) {
            console.log(result); // foo bar
        })
        .run();
```

with initial data

```

    var piperline = require('piperline');
    
    piperline.create()
        .pipe(function(data, next, done) {
            next(data + 1);
        })
        .pipe(function(data, next, done) {
            next(data + 2);
        })
        .on('error', function(err) {
            console.error(err);
        })
        .on('done', function(result) {
            console.log(result); // 4
        })
        .run(1);
```

with run callback

```

    var pipeline = require('piperline').create();
    
    pipeline
        .pipe(function(data, next, done) {
            next(data + 1);
        })
        .pipe(function(data, next, done) {
            next(data + 2);
        })
        .on('error', function(err) {
            console.error(err);
        })
        .on('done', function(result) {
            console.log(result); // 3
        })
        .run(0, function(err, data) {
            if (err) {
                // do stuff
            }
        });
```

**Note: The difference between events and callback is, that this callback passed to ``run`` 
method is called only once when the execution is completed.**

### With interruption

```

    var piperline = require('piperline');
    
    piperline.create()
        .pipe(function(data, next, done) {
            next(data + 1);
        })
        .pipe(function(data, next, done) {
            if (data === 1) {
                done(data);
            }
            
            next(data + 2);
        })
        .pipe(function(data, next, done) {
            next(data + 3);
        })
        .on('error', function(err) {
            console.error(err);
        })
        .on('done', function(result) {
            console.log(result); // 1
        })
        .run(0);
```

### Re-usage

```

    var piperline = require('piperline');
    
    var pipeline = piperline.create();
    
    pipeline
        .pipe(function(data, next, done) {
            // do stuff
            next();
        })
        .pipe(function(data, next, done) {
            // do stuff
            next();
        })
        .run(function(err, result) {
            if (err) {
                pipeline.run(data);
            }
        });

```

**Note: In order to execute the pipeline second time you must wait for the completion of the previous execution.** 

### Manual error emitting

Emitting error via callback (``done`` or ``next``) by passing ``Error`` object.

```
  
    var pipeline = require('piperline').create();
    
    pipeline
        .pipe(function(data, next) {
            next(data);
        })
        .pipe(function(data, next, done) {
            done(new Error());
        })
        .on('error', function(err) {
          console.log(err); // Error
        })
        .run(0);
      

```


## API

### piperline.create()

Creates a new pipeline runner.

### .pipe(function(data, next, done))

Adds pipe for execution.
Can be invoked only before or after execution.

`data` - any data passed from top pipes or `run` method.

`next` - callback which invokes next pipe or completes the execution. 
Any passed data to this callback will be transferred to the next pipe.

`done` - callback which terminates the execution of the whole pipeline.


**Note: If `Error` object will be passed to one of these callbacks it will be treated as termination of execution
and `error` event will be emitted with this object.**

### .run([data],[function(error, result)])

Builds and runs the execution.

`data` - any initial data which will be passed to the first pipe.

`callback` - callback which will be called when the execution is completed.


**Note: This method can be invoked multiple times, but only when the previous execution is completed.**

### .isRunning

Detects whether the execution is running.

### .on('done', function(result))

On execution complete.

### .on('error', function(error))

On error occur.

**Note: The difference between events and `run` callback is that `run` callback invoked only once when the particular execution is completed.**




