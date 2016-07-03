var endpoint = '/api';

function getEndpoint(path) {
    return endpoint + '/' + path;
}

fetch(endpoint);

fetch('//' + endpoint);

fetch(endpoint + '/users/1');

fetch([endpoint, 'users', '1'].join('/'));

fetch(getEndpoint('users'));
