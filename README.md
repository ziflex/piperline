# piperline

Simple task pipeline.

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
        .run(0);
```

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