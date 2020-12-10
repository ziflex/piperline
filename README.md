# piperline

> Split your async code into small tasks.

Simple task pipeline runner which allows you to split you async code into small tasks.

[![npm version](https://badge.fury.io/js/piperline.svg)](https://www.npmjs.com/package/piperline)
[![Actions Status](https://github.com/ziflex/piperline/workflows/Node%20CI/badge.svg)](https://github.com/ziflex/piperline/actions)

## Installation

npm

```sh

$ npm install --save piperline

```


## Features
* async tasks
* re-usage
* interruption
* extensibility
* event-based control

## Usage

### Basic

```javascript

var Piperline = require('piperline');

Piperline.create()
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

### Passing initial data

```javascript

var Piperline = require('piperline');

Piperline.create()
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

### Passing callback

```javascript

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

### Pipeline interruption

```javascript

var Piperline = require('piperline');

Piperline.create()
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

```javascript

var pipeline = require('piperline').create();

pipeline
    .pipe(function(data, next, done) {
        // do stuff
        next();
    })
    .pipe(function(data, next, done) {
        // do stuff
        next();
    })
    .on('finish', () => {
        // everything is completed
    });

[1, 2, 3, 4].forEach(data => pipeline.run(data));

```

### Manual error emitting

Emitting error via callback (``done`` or ``next``) by passing ``Error`` object.

```javascript

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

### .isRunning()   

Detects whether the pipeline is executing.   

### .on('run', function())   

Fired every time when execution started and there are no already running in background.  

### .on('finish', function())   

Fired every time when execution completed and there are no already running in background.  

### .on('done', function(result))   

Fired for each successful execution.   

### .on('error', function(error))   

Fired for each failed execution.   
