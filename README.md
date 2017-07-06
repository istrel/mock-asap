# Mock ASAP (as soon as possible) [![Build Status](https://travis-ci.org/istrel/mock-asap.svg?branch=master)](https://travis-ci.org/istrel/mock-asap)

# Idea
Idea of this package is to get package ready to easily setup http stubs for  functional and integration testing.

This package consists of a proxy programmable via Sinon.JS stubs

# Install
```
npm install --save mock-asap
```
Note: you should have Node.js with support of ES6 (at least v4.0)

# Example
Here is an example how you can use `mock-asap` with Nightmare.js:
```javascript
const mockAsap = require('./index.js');
const Nightmare = require('nightmare');
const sinon = require('sinon');
const match = sinon.match;

const nightmare = Nightmare({
    show: true,
    switches: {
        'proxy-server': '127.0.0.1:8889',
        'ignore-certificate-errors': true
    }
});

mockAsap.start()
    .then(function() {
        mockAsap.stub.http.withArgs(
            match.has('url', match('custom-avito.html'))
        ).returns(
            mockAsap.respondWith.file(__dirname + '/custom-avito.html')
        );

        return nightmare
            .goto('http://avito.ru/custom-avito.html')
            .evaluate(() => document.body.innerHTML);
    })
    .then(bodyHtml => console.log(bodyHtml))
    .then(() => nightmare.end())
    .then(() => mockAsap.stop());
```

This package uses port 8889 for communication. In order to work properly it should be free before running. Later this package will have ability to configure occupied port

# Docs

## mockAsap.start()
`mockAsap.start` starts stubs proxy server. It returns promise which will be resolved when proxy will listen for incoming messages.

Note: for now system designed in the way that permits running only one instance of `mockAsap`. So you should not try to run `mockAsap.start()` several times.

## mockAsap.stop()
`mockAsap.start` stops stubs proxy server and browser. It returns promise which will be resolved when everything was stopped.

## mockAsap.stub
`mockAsap.stub` contains Sinon.JS stubs used for programming proxy server behavior. It contains `http` and `https` stubs used in this way:
```javascript
stub.https.withArgs(
    sinon.match.has('url', sinon.match('/rest/text/terms/'))
).returns(
    ({ proxyToClientResponse: res }) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(htmlText);
    }
);
```

Stub argument used for getting result function - is an incoming `ClientRequest` (see Node.js documentation). The result function will with [http-mitm-proxy Context object](https://github.com/joeferner/node-http-mitm-proxy/blob/master/README.md#context)

There is also `stubs.reset()` synchronous method which resets stubs to their default behavior (i.e. just proxying).

Note: you should not store `stubs.https` and `stubs.http` to variables because otherwise everything will be broken after `stubs.reset()`

## mockAsap.match
`mockAsap.match` contains helpers for simpler matching against often used rules.
### mockAsap.match.url(url)
Matches if request contains `url` as a substring
```javascript
mockAsap.stub.https.withArgs(
    mockAsap.match.url('logo-avito.svg')
).returns(
    mockAsap.respondWith.file(path.join(__dirname, 'avito/logo-avito.svg'))
);
```

## mockAsap.respondWith
`mockAsap.respondWith` contains helpers for simpler responding with popular type of responses.
### mockAsap.respondWith.text(text)
`mockAsap.respondWith.text(text)` responds with `text` as plain text
```javascript
mockAsap.stub.https.withArgs(
    sinon.match.any
).returns(
    mockAsap.respondWith.text('Hello world!')
);
```
### mockAsap.respondWith.html(html)
`mockAsap.respondWith.html(html)` responds with `html` as html document
```javascript
mockAsap.stub.https.withArgs(
    mockAsap.match.url('index.html')
).returns(
    mockAsap.respondWith.html('<h1>Hello world!</h1>')
);
```
### mockAsap.respondWith.json(jsObject)
`mockAsap.respondWith.json(jsObject)` stringifies `jsObject` and sends it as json
```javascript
mockAsap.stub.https.withArgs(
    mockAsap.match.url('/1.json')
).returns(
    mockAsap.respondWith.json({ hello: 'world' })
);
```

### mockAsap.respondWith.jsonTransformer(responseTransformer[, requestBodyTransformer])
`mockAsap.respondWith.jsonTransformer(responseTransformer)` firstly tries to get original response from server. After all data has been received, it parses response as JSON and passes it as first argument of `responseTransformer` function. After `responseTransformer` was called it passes modified data to browser (i.e. to Chrome). For example, the code below will transform request `/1.json` `{"foo": 1, "baz": 2}` to `{"foo": "bar", "baz": 2}`
```javascript
mockAsap.stub.https.withArgs(
    mockAsap.match.url('/1.json')
).returns(
    mockAsap.respondWith.jsonTransformer(json => {
        json.foo = 'bar';
    })
);
```

`requestBodyTransformer` works in the same way. The only difference is that it tries to transform request body as JSON. For example, you may want to suppress some fields which produce some pollution or computations you would like to avoid. You can do it in this way
```javascript
mockAsap.stub.https.withArgs(
    mockAsap.match.url('/2.json')
).returns(
    mockAsap.respondWith.jsonTransformer(null, json => {
        delete json.fieldIWantToHide;
    })
);
```

Note: transformer assumed to be a dirty function, not a pure one

### mockAsap.respondWith.file(absolutePathToFile)
`mockAsap.respondWith.file(absolutePathToFile)` responds with content of `absolutePathToFile`
```javascript
stub.https.withArgs(
    mockAsap.match.url('/res/7EiNlv7G_KCvanpivhp5XQ.jpg')
).returns(
    respondWith.file(path.join(__dirname, 'actiagent/meow.jpg'))
);
```

### mockAsap.respondWith.serveStatic(pathToCut, absolutePathToDir)
`mockAsap.respondWith.serveStatic(pathToCut, absolutePathToDir)` replaces drops `pathToCut` and prepends `absolutePathToDir` to the rest
```javascript
// Here /public/pics/1.jpeg will be answered with content of ../../pictures/1.jpeg
mockAsap.stub.https.withArgs(
    mockAsap.match.url('/public/pics')
).returns(
    mockAsap.respondWith.json('/public/pics', path.join(__dirname, '../../pictures'))
);
```

## License

MIT
