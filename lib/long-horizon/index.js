'use strict';

const contracts = require('./contracts.js');
const attention = require('./attention.js');
const lifecycle = require('./lifecycle.js');
const fingerprint = require('./fingerprint.js');
const store = require('./store.js');
const projection = require('./projection.js');
const paperclip = require('./adapters/paperclip.js');
const github = require('./adapters/github.js');

module.exports = {
    ...contracts,
    ...attention,
    ...lifecycle,
    ...fingerprint,
    ...store,
    ...projection,
    paperclip,
    github,
};
