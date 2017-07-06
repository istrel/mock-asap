'use strict';

const proxy = require('./lib/proxy');
const stub = require('./lib/stub');
const match = require('./lib/match');
const respondWith = require('./lib/respondWith');

module.exports = {
    start() {
        return proxy.start();
    },

    stop() {
        return proxy.stop();
    },

    match,
    respondWith,
    stub
};
