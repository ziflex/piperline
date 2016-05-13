# Changelog

## 0.3.3
### Fixed
- Calling twice 'onComplete' callback when error occurs inside pipe.

## 0.3.1

### Fixed
- Failed when pipeline is empty.

## 0.3.0

### Added
- Parallel execution.
- ``run`` event. Fired every time when execution started and there are no already running in background.  
- ``finish`` event. Fired every time when execution finished and there are no running in background.
- ``clone`` method in order to create separate pipeline based on current one.
- Possibility to pass array of pipes during initialization.

### Changed
- Replaced Node EventEmitter with EventEmitter3.
- Removed dependency on ``lodash._basebind``. Native implementation is used.

### Removed
- [Breaking changes] Removed inheritance from EventEmitter. Exposed only methods ``on``, ``once``, ``off``.
- [Breaking changes] Removed packages from bower.
- [Breaking changes] isRunning property to method.

## 0.2.2

### Added

* Browser build

### Updated

* each ``pipe`` is executed asynchronously


## 0.2.1

### Fixed

* Didn't terminate the execution when ``Error`` object was passed into ``next`` callback.
* Didn't throw the exception when ``pipe`` was invoked during execution.

### Added

* Terminates the whole execution if the initial data is ``Error`` object.
* ``isRunning`` property.

## 0.2.0

### Added

* Emitting error via callback (``done`` or ``next``) by passing ``Error`` object.

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

* Added callback to run method

```

  var pipeline = require('piperline').create();

  pipeline
    .pipe(task1)
    .pipe(task2)
    .pipe(task3)
    .run(data, function(err, result) {
      if (err) {
        pipeline.run(1);
      }
    });

```

or

```

  var pipeline = require('piperline').create();

  pipeline
    .pipe(task1)
    .pipe(task2)
    .pipe(task3)
    .run(function(err, result) {
      if (err) {
        pipeline.run(1);
      }
    });

```

The difference between events and this callback is this callback passed to ``run`` method is called only once when the execution is completed.

## 0.1.1

### Fixed

* Invoking ``next()`` and ``done()`` at the same time.
* Invoking ``next()`` or ``done()`` more than once.
* Executes tasks before the previous execution completed.
