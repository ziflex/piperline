# piperline

> Split your async code into small tasks.

Simple task pipeline runner which allows you to split you async code into small tasks.

[![npm version](https://badge.fury.io/js/piperline.svg)](https://www.npmjs.com/package/piperline)
[![Actions Status](https://github.com/ziflex/piperline/workflows/Node%20CI/badge.svg)](https://github.com/ziflex/piperline/actions)

## Table of Contents

- [Installation](#installation)
- [Features](#features)
- [Usage](#usage)
  - [Basic Usage](#basic-usage)
  - [Passing Initial Data](#passing-initial-data)
  - [Using Callbacks](#using-callbacks)
  - [Pipeline Interruption](#pipeline-interruption)
  - [Pipeline Reusability](#pipeline-reusability)
  - [Error Handling](#error-handling)
- [API Reference](#api-reference)
  - [piperline.create()](#piperlinecreate)
  - [.pipe()](#pipe)
  - [.run()](#run)
  - [.isRunning()](#isrunning)
  - [.clone()](#clone)
  - [Event Methods](#event-methods)
  - [Events](#events)
- [Advanced Usage](#advanced-usage)
- [Best Practices](#best-practices)
- [FAQ & Troubleshooting](#faq--troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
npm install piperline
```


## Features

- **Async task execution** - Handle asynchronous operations with ease
- **Pipeline reusability** - Create once, run multiple times with different data
- **Early termination** - Stop pipeline execution when needed
- **Extensible architecture** - Easy to extend and customize
- **Event-driven control** - Listen to pipeline lifecycle events
- **Parallel execution** - Run multiple pipeline instances simultaneously
- **Error handling** - Comprehensive error propagation and handling

## Usage

### Basic Usage

Create a simple pipeline that processes data through multiple steps:

```javascript
var Piperline = require('piperline');

Piperline.create()
    .pipe(function(data, next, done) {
        // Process data and pass to next pipe
        next('foo');
    })
    .pipe(function(data, next, done) {
        // Combine with previous result
        next(data + ' bar');
    })
    .on('error', function(err) {
        console.error('Pipeline error:', err);
    })
    .on('done', function(result) {
        console.log(result); // Output: "foo bar"
    })
    .run();
```

### Passing Initial Data

You can pass initial data to the pipeline when calling `run()`:

```javascript
var Piperline = require('piperline');

Piperline.create()
    .pipe(function(data, next, done) {
        // Add 1 to the input data
        next(data + 1);
    })
    .pipe(function(data, next, done) {
        // Add 2 to the result from previous pipe
        next(data + 2);
    })
    .on('error', function(err) {
        console.error('Pipeline error:', err);
    })
    .on('done', function(result) {
        console.log(result); // Output: 4 (1 + 1 + 2)
    })
    .run(1); // Start with initial data: 1
```

### Using Callbacks

Use a callback function to handle the final result or errors:

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
        console.error('Pipeline error:', err);
    })
    .on('done', function(result) {
        console.log('Event result:', result); // Output: 3
    })
    .run(0, function(err, data) {
        if (err) {
            console.error('Callback error:', err);
            return;
        }
        console.log('Callback result:', data); // Output: 3
    });
```

### Pipeline Interruption

You can terminate pipeline execution early using the `done` callback:

```javascript
var Piperline = require('piperline');

Piperline.create()
    .pipe(function(data, next, done) {
        next(data + 1);
    })
    .pipe(function(data, next, done) {
        if (data === 1) {
            // Terminate pipeline early and return current result
            done(data);
            return;
        }
        // Continue to next pipe
        next(data + 2);
    })
    .pipe(function(data, next, done) {
        // This pipe won't be executed when pipeline is terminated early
        next(data + 3);
    })
    .on('error', function(err) {
        console.error('Pipeline error:', err);
    })
    .on('done', function(result) {
        console.log(result); // Output: 1 (terminated early)
    })
    .run(0);
```

### Pipeline Reusability

Create a pipeline once and reuse it with different data inputs:

```javascript
var pipeline = require('piperline').create();

pipeline
    .pipe(function(data, next, done) {
        // Simulate async operation
        setTimeout(function() {
            console.log('Processing:', data);
            next(data * 2);
        }, 100);
    })
    .pipe(function(data, next, done) {
        next(data + 10);
    })
    .on('finish', function() {
        console.log('All executions completed');
    })
    .on('done', function(result) {
        console.log('Result:', result);
    });

// Run the same pipeline with different inputs
[1, 2, 3, 4].forEach(function(data) {
    pipeline.run(data);
});
// Output: 
// Processing: 1, Result: 12
// Processing: 2, Result: 14  
// Processing: 3, Result: 16
// Processing: 4, Result: 18
// All executions completed
```

### Error Handling

Handle errors by passing `Error` objects to the `done` or `next` callbacks:

```javascript
var pipeline = require('piperline').create();

pipeline
    .pipe(function(data, next) {
        // This pipe processes normally
        next(data);
    })
    .pipe(function(data, next, done) {
        // This pipe triggers an error
        done(new Error('Something went wrong'));
    })
    .on('error', function(err) {
        console.error('Pipeline error:', err.message); // Output: "Something went wrong"
    })
    .on('done', function(result) {
        // This won't be called when an error occurs
        console.log('Success:', result);
    })
    .run(0);
```

## API Reference

### piperline.create([pipes]) {#piperlinecreate}

Creates a new pipeline runner.

**Parameters:**
- `pipes` (Array, optional) - Array of pipe functions to initialize the pipeline with

**Returns:** Pipeline instance

**Example:**
```javascript
// Create empty pipeline
var pipeline1 = require('piperline').create();

// Create pipeline with predefined pipes
var pipeline2 = require('piperline').create([
    function(data, next) { next(data + 1); },
    function(data, next) { next(data * 2); }
]);
```

### .pipe(handler) {#pipe}

Adds a pipe function to the pipeline for execution. Can only be called when the pipeline is not running.

**Parameters:**
- `handler` (Function) - The pipe function to add

**Handler function signature:**
```javascript
function(data, next, done) {
    // data - Input data from previous pipe or run() method
    // next(result) - Call to pass data to the next pipe
    // done(result) - Call to terminate pipeline and emit 'done' event
}
```

**Returns:** Pipeline instance (for method chaining)

**Note:** If an `Error` object is passed to `next()` or `done()`, the pipeline will terminate and emit an 'error' event.

### .run([data], [callback]) {#run}

Builds and executes the pipeline.

**Parameters:**
- `data` (any, optional) - Initial data to pass to the first pipe
- `callback` (Function, optional) - Callback function called when execution completes

**Callback signature:**
```javascript
function(error, result) {
    // error - Error object if pipeline failed, null if successful
    // result - Final result from pipeline if successful, null if failed
}
```

**Returns:** Pipeline instance

### .isRunning() {#isrunning}

Checks whether the pipeline is currently executing.

**Returns:** Boolean - `true` if pipeline is running, `false` otherwise

### .clone() {#clone}

Creates a new pipeline instance with the same pipe functions as the current pipeline.

**Returns:** New Pipeline instance

**Example:**
```javascript
var original = require('piperline').create()
    .pipe(function(data, next) { next(data + 1); });

var cloned = original.clone();
// Both pipelines have the same pipes but are independent instances
```

### Event Methods

#### .on(event, listener)

Registers an event listener for the specified event.

**Parameters:**
- `event` (String) - Event name
- `listener` (Function) - Event handler function  

**Returns:** Pipeline instance

#### .once(event, listener)

Registers a one-time event listener for the specified event.

**Parameters:**
- `event` (String) - Event name
- `listener` (Function) - Event handler function

**Returns:** Pipeline instance

#### .off(event, listener)

Removes an event listener for the specified event.

**Parameters:**
- `event` (String) - Event name
- `listener` (Function) - Event handler function to remove

**Returns:** Pipeline instance

### Events

#### 'run'

Fired every time when execution starts and there are no other executions running in the background.

```javascript
pipeline.on('run', function() {
    console.log('Pipeline execution started');
});
```

#### 'done'

Fired for each successful execution with the final result.

```javascript
pipeline.on('done', function(result) {
    console.log('Pipeline completed successfully:', result);
});
```

#### 'error'

Fired for each failed execution with the error object.

```javascript
pipeline.on('error', function(error) {
    console.error('Pipeline failed:', error);
});
```

#### 'finish'

Fired every time when execution completes and there are no other executions running in the background.

```javascript
pipeline.on('finish', function() {
    console.log('All pipeline executions completed');
});
```

## Advanced Usage

### Asynchronous Operations

Handle asynchronous operations within pipes:

```javascript
var pipeline = require('piperline').create();

pipeline
    .pipe(function(data, next, done) {
        // Simulate async API call
        setTimeout(function() {
            if (data < 0) {
                done(new Error('Invalid input'));
                return;
            }
            next(data * 2);
        }, 100);
    })
    .pipe(function(data, next, done) {
        // Another async operation
        process.nextTick(function() {
            next(data + 10);
        });
    })
    .on('done', function(result) {
        console.log('Final result:', result);
    })
    .on('error', function(err) {
        console.error('Error:', err.message);
    });

pipeline.run(5); // Output: Final result: 20
pipeline.run(-1); // Output: Error: Invalid input
```

### Parallel Execution

Run multiple pipeline instances simultaneously:

```javascript
var pipeline = require('piperline').create()
    .pipe(function(data, next) {
        setTimeout(function() {
            next(data.toUpperCase());
        }, Math.random() * 1000);
    })
    .on('done', function(result) {
        console.log('Processed:', result);
    })
    .on('finish', function() {
        console.log('All processing complete');
    });

// All executions run in parallel
['hello', 'world', 'test'].forEach(function(word) {
    pipeline.run(word);
});
```

### Conditional Pipeline Flow

Control pipeline flow based on data conditions:

```javascript
var pipeline = require('piperline').create()
    .pipe(function(data, next, done) {
        if (typeof data !== 'number') {
            done(new Error('Input must be a number'));
            return;
        }
        next(data);
    })
    .pipe(function(data, next, done) {
        if (data === 0) {
            done('Zero detected - stopping pipeline');
            return;
        }
        next(data * data);
    })
    .pipe(function(data, next, done) {
        next('Result: ' + data);
    })
    .on('done', function(result) {
        console.log(result);
    })
    .on('error', function(err) {
        console.error(err.message);
    });

pipeline.run(4);     // Output: Result: 16
pipeline.run(0);     // Output: Zero detected - stopping pipeline  
pipeline.run('abc'); // Output: Input must be a number
```

## Best Practices

### Error Handling
- Always handle errors in your pipes to prevent uncaught exceptions
- Use meaningful error messages to aid debugging
- Consider using custom error types for different error conditions

### Performance
- Keep pipe functions lightweight and focused on single responsibilities
- Use asynchronous operations to avoid blocking the event loop
- Consider the overhead of creating many short-lived pipelines vs reusing fewer pipelines

### Code Organization
- Use descriptive names for your pipe functions
- Consider extracting complex pipe logic into separate modules
- Group related pipes into reusable pipeline templates

### Testing
- Test individual pipe functions separately from the pipeline
- Test error conditions and edge cases
- Verify that events are emitted correctly

```javascript
// Example of testable pipe function
function validateNumber(data, next, done) {
    if (typeof data !== 'number') {
        done(new Error('Expected number, got ' + typeof data));
        return;
    }
    next(data);
}

// Can be tested independently and reused in multiple pipelines
var pipeline = require('piperline').create()
    .pipe(validateNumber)
    .pipe(function(data, next) { next(data * 2); });
```

## FAQ & Troubleshooting

### Common Issues

**Q: Why is my pipeline not executing?**

A: Make sure you call the `run()` method after setting up your pipes:
```javascript
// ❌ Wrong - pipeline won't execute
var pipeline = require('piperline').create()
    .pipe(function(data, next) { next(data); });

// ✅ Correct - don't forget to call run()
pipeline.run(initialData);
```

**Q: Why am I getting "Pipeline can not be changed during execution" error?**

A: You cannot add pipes while the pipeline is running. Either wait for execution to complete or create a new pipeline:
```javascript
var pipeline = require('piperline').create()
    .pipe(function(data, next) {
        setTimeout(function() { next(data); }, 1000);
    });

pipeline.run(1);

// ❌ This will fail if called immediately
// pipeline.pipe(function(data, next) { next(data); });

// ✅ Wait for completion or use events
pipeline.on('finish', function() {
    pipeline.pipe(function(data, next) { next(data); });
});
```

**Q: How do I handle multiple asynchronous operations in a single pipe?**

A: Use Promise.all() or similar patterns, but remember to call next/done only once:
```javascript
pipeline.pipe(function(data, next, done) {
    Promise.all([
        asyncOperation1(data),
        asyncOperation2(data)
    ]).then(function(results) {
        next(results);
    }).catch(function(error) {
        done(error);
    });
});
```

**Q: What's the difference between events and callbacks?**

A: Events are fired for every execution, while the callback passed to `run()` is called only once for that specific execution:
```javascript
// Event handler - called for every run()
pipeline.on('done', function(result) {
    console.log('Event:', result);
});

// Callback - called only for this specific run()
pipeline.run(data, function(err, result) {
    console.log('Callback:', result);  
});
```

### Performance Tips

- **Reuse pipelines**: Create pipelines once and reuse them with different data
- **Avoid blocking operations**: Use asynchronous operations in pipes to prevent blocking
- **Handle errors early**: Validate input data in early pipes to avoid unnecessary processing
- **Monitor memory usage**: For long-running applications, ensure you're not creating excessive pipeline instances

### Migration from older versions

If you're upgrading from an older version:

- `isRunning` is now a method, not a property (call `isRunning()` instead of `isRunning`)
- Pipeline no longer inherits from EventEmitter directly - use `on()`, `once()`, `off()` methods
- Browser builds are no longer included - use a bundler if you need browser support

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm test`)
4. Commit your changes (`git commit -am 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

MIT - see [LICENSE](LICENSE) file for details.

Registers an event listener for the specified event.

**Parameters:**
- `event` (String) - Event name
- `listener` (Function) - Event handler function  

**Returns:** Pipeline instance

#### .once(event, listener)

Registers a one-time event listener for the specified event.

**Parameters:**
- `event` (String) - Event name
- `listener` (Function) - Event handler function

**Returns:** Pipeline instance

#### .off(event, listener)

Removes an event listener for the specified event.

**Parameters:**
- `event` (String) - Event name
- `listener` (Function) - Event handler function to remove

**Returns:** Pipeline instance

### Events

#### 'run'

Fired every time when execution starts and there are no other executions running in the background.

```javascript
pipeline.on('run', function() {
    console.log('Pipeline execution started');
});
```

#### 'done'

Fired for each successful execution with the final result.

```javascript
pipeline.on('done', function(result) {
    console.log('Pipeline completed successfully:', result);
});
```

#### 'error'

Fired for each failed execution with the error object.

```javascript
pipeline.on('error', function(error) {
    console.error('Pipeline failed:', error);
});
```

#### 'finish'

Fired every time when execution completes and there are no other executions running in the background.

```javascript
pipeline.on('finish', function() {
    console.log('All pipeline executions completed');
});
```
