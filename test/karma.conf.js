'use strict';

module.exports = function config(config) {
    config.set({
        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,

        // base path, that will be used to resolve files and exclude
        //basePath: '<%= options["base-path"] %>',

        // testing framework to use (jasmine/mocha/qunit/...)
        frameworks: [
            'browserify',
            'mocha',
            'chai'
        ],

        reporters: ['mocha'],

        preprocessors: {
            './unit/**/*.js': ['browserify']
        },
        babelPreprocessor: {
            options: {
                sourceMap: 'inline'
            }
        },

        // list of files / patterns to load in the browser
        files: [
            './unit/**/*.js'
        ],

        // list of files / patterns to exclude
        //exclude: [<%= templateArray(options["exclude-files"]) %>],

        // web server port
        port: 9000,

        // Start these browsers, currently available:
        // - Chrome
        // - ChromeCanary
        // - Firefox
        // - Opera
        // - Safari (only Mac)
        // - PhantomJS
        // - IE (only Windows)
        browsers: [
            'Chrome'
        ],

        // Which plugins to enable
        plugins: [
            'karma-browserify',
            'karma-chrome-launcher',
            'karma-mocha',
            'karma-chai',
            'karma-mocha-reporter',
            'karma-html-reporter'
        ],

        // Continuous Integration mode
        // if true, it capture browsers, run tests and exit
        singleRun: true,

        colors: true,

        // level of logging
        // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
        logLevel: config.LOG_INFO,

        // If browser does not capture in given timeout [ms], kill it
        captureTimeout: 60000,

        // to avoid DISCONNECTED messages
        browserDisconnectTimeout: 10000, // default 2000
        browserDisconnectTolerance: 1, // default 0
        browserNoActivityTimeout: 60000, //default 10000

        browserify: {
            debug: true
        }
    });
};