/* eslint no-console: ["error", { allow: ["warn", "error", "log"] }] */
'use strict';

const mockAsap = require('../..');
const sinon = require('sinon');
const match = sinon.match;
const http = require('http');
const zlib = require('zlib');
const Nightmare = require('nightmare');

function getNightmare() {
    return Nightmare({
        switches: {
            'proxy-server': '127.0.0.1:8889',
            'ignore-certificate-errors': true
        }
    });
}

function testAsync(fnThatReturnsPromise) {
    return function(done) {
        fnThatReturnsPromise.call(this)
            .then(done)
            .catch(done.fail);
    };
}

describe('Mock ASAP', function() {
    beforeAll(function(done) {
        mockAsap.start().then(done, done.fail);
    });

    afterAll(function(done) {
        mockAsap.stop().then(done, done.fail);
    });

    beforeEach(function() {
        mockAsap.stub.reset();
    });

    afterEach(function(done) {
        if (this.nightmare) {
            this.nightmare.end().then(done, done.fail);
        } else {
            done();
        }
    });

    describe('respondWith.jsonTransformer', function() {
        beforeEach(testAsync(async function() {
            this.response = {
                val: 'abc',
                items: [
                    { name: 'a' },
                    { name: 'b' }
                ]
            };
            this.transform = function(response) {
                response.val = response.val + 'def';
                response.items.length = 1;

                return response;
            };
            this.expected = JSON.stringify(this.transform(clone(this.response)));

            function clone(obj) {
                return JSON.parse(JSON.stringify(obj));
            }

            this.startServer = () => {
                return new Promise(resolve => {
                    this.jsonServer = http.createServer(this.requestCallback);

                    this.jsonServer.listen(8080, resolve);
                });
            };
            this.stopServer = () => {
                return new Promise(resolve => this.jsonServer.close(resolve));
            };

            this.setInterceptor = () => {
                mockAsap.stub.http.withArgs(
                    mockAsap.match.url('secret.json')
                ).returns(
                    mockAsap.respondWith.jsonTransformer(this.transform)
                );
            };

            mockAsap.stub.http.withArgs(
                mockAsap.match.url('respondWith.html')
            ).returns(
                mockAsap.respondWith.file(__dirname + '/respondWith.html')
            );

            this.performTest = async () => {
                await this.startServer();
                await this.setInterceptor();

                this.nightmare = getNightmare();

                await this.nightmare
                    .goto('http://127.0.0.1:8080/respondWith.html')
                    .wait('#result');

                const text = await this.nightmare.evaluate(() => document.querySelector('#result').textContent);

                expect(text).toBe(this.expected);

                return this.stopServer();
            };
        }));

        it('properly handles gzipped responses', function(done) {
            this.requestCallback = (req, res) => {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Encoding', 'gzip');
                res.writeHead(200);
                res.end(zlib.gzipSync(JSON.stringify(this.response)));
            };

            this.performTest()
                .then(done, done.fail);
        });

        it('properly handles chunked responses', function(done) {
            this.requestCallback = (req, res) => {
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(200);

                let responseStr = JSON.stringify(this.response);
                res.write(responseStr.substring(0, 10));
                setTimeout(function() {
                    res.end(responseStr.substring(10));
                }, 1000);
            };

            this.performTest()
                .then(done, done.fail);
        });
    });

    describe('respondWith.file', function() {
        it('properly determines mime type and sends files', testAsync(async function() {
            mockAsap.stub.http.withArgs(
                match.has('url', match('inline.html'))
            ).returns(
                mockAsap.respondWith.file(__dirname + '/inline.html')
            );

            this.nightmare = getNightmare();

            await this.nightmare
                .goto('http://avito.ru/inline.html')
                .wait('#invisible');

            const isInvisibleVisible = await this.nightmare.visible('#invisible');

            expect(isInvisibleVisible).toBe(false);

            const isVisibleVisible = await this.nightmare.visible('#visible');

            expect(isVisibleVisible).toBe(true);

            return this.nightmare.end();
        }));
    });
});
