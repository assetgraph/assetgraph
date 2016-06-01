var matchSourceExpression = require('../lib/matchSourceExpression');
var expect = require('./unexpected-with-plugins');

expect.addAssertion('<string> [not] to allow <string> <string?>', function (expect, sourceExpression, url, protectedResourceUrl) {
    expect(matchSourceExpression(url, sourceExpression, protectedResourceUrl || 'http://example.com/'), '[not] to be true');
});

describe('matchSourceExpression', function () {
    describe('*', function () {
        it('should allow an arbitrary http url', function () {
            expect('*', 'to allow', 'http://foo.com/bar/');
        });

        it('should not allow a data: url', function () {
            expect('*', 'not to allow', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWNQUFD4z6Crq/sfAAuYAuYl+7lfAAAAAElFTkSuQmCC');
        });
    });

    describe('scheme-source', function () {
        it('should match case insensitively', function () {
            expect('fOO:', 'to allow', 'foo://yadda.com/');
        });

        it('should disallow a different scheme', function () {
            expect('bar:', 'not to allow', 'foo://yadda.com/');
        });
    });

    describe('host-source', function () {
        describe('data:', function () {
            it('should allow a data: url', function () {
                expect('data:', 'to allow', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWNQUFD4z6Crq/sfAAuYAuYl+7lfAAAAAElFTkSuQmCC');
            });
        });

        it('should match a wildcard host', function () {
            expect('http://*', 'to allow', 'http://whatever.com/');
        });

        describe('with a non-wildcard host name', function () {
            it('should allow a url with that host name', function () {
                expect('http://foo.com/', 'to allow', 'http://foo.com/styles/myStyles.css');
            });

            it('should allow a url with that host name when the scheme is omitted', function () {
                expect('foo.com/', 'to allow', 'http://foo.com/styles/myStyles.css');
            });

            it('should allow a url with that host name when the scheme and the path are omitted', function () {
                expect('foo.com', 'to allow', 'http://foo.com/styles/myStyles.css');
            });
        });

        describe('with a wildcard subdomain', function () {
            it('should match a subdomain that has the correct suffix', function () {
                expect('http://*.foo.com/', 'to allow', 'http://bar.foo.com/');
            });

            it('should not match a host that does not have the correct suffix', function () {
                expect('http://*.foo.com/', 'not to allow', 'http://yadda.com/');
            });

            it('should not match a subdomain that has the correct suffix except for the dot', function () {
                expect('http://*.foo.com/', 'not to allow', 'http://bar.quuxfoo.com/');
            });
        });

        describe('without a scheme', function () {
            it('should allow a url with the correct host name', function () {
                expect('foo.com', 'to allow', 'http://foo.com/');
            });

            it('should disallow a url with the wrong host name', function () {
                expect('foo.com', 'not to allow', 'http://bar.com/');
            });

            it('should allow an http url when the protected resource has a file:// url', function () {
                expect('bar.com', 'to allow', 'http://bar.com/yadda.js', 'file:///var/www/index.html');
            });
        });

        describe('with a path', function () {
            it('should disregard differently cased percent-encoded characters', function () {
                expect('http://foo.com/%6a/', 'to allow', 'http://foo.com/%6A/');
            });

            it('should support percent-encoded characters that are not valid UTF-8 octet sequences', function () {
                expect('http://foo.com/%c9/', 'to allow', 'http://foo.com/%c9/');
            });

            describe('with a trailing slash', function () {
                it('should allow a url with that exact path', function () {
                    expect('http://foo.com/blah/', 'to allow', 'http://foo.com/blah/');
                });

                it('should allow a url with the given path as a prefix', function () {
                    expect('http://foo.com/blah/', 'to allow', 'http://foo.com/blah/baz');
                });

                it('should disallow a url with a different path', function () {
                    expect('http://foo.com/blah/', 'not to allow', 'http://foo.com/quux');
                });
            });

            describe('without a trailing slash', function () {
                it('should allow a url with that exact path', function () {
                    expect('http://foo.com/blah', 'to allow', 'http://foo.com/blah');
                });

                it('should disallow a url with the given path as a prefix', function () {
                    expect('http://foo.com/blah', 'not to allow', 'http://foo.com/blah/baz');
                });

                it('should disallow a url with a different path', function () {
                    expect('http://foo.com/blah', 'not to allow', 'http://foo.com/quux');
                });
            });
        });
    });

    describe('\'self\'', function () {
        it('should match if the url has the origin of the protected resource url as a prefix', function () {
            expect('\'self\'', 'to allow', 'http://example.com/', 'http://example.com/index.html');
        });

        it('should not match if the url has a different origin of than that of the protected resource url', function () {
            expect('\'self\'', 'not to allow', 'http://foo.com/', 'http://example.com/index.html');
        });

        it('should allow a file: url when the protected resource has a file: url', function () {
            expect('\'self\'', 'to allow', 'file:///home/andreas/work/webmail/http-pub/common/requireJsConfig.js', 'file:///home/andreas/work/webmail/http-pub/unsupported.html');
        });
    });
});
