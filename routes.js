var express = require('express');
var app = express();

// Defining all the routes
var index = require('./routes/index');
var station = require('./routes/station');
var connector = require('./routes/connector');
var upload = require('./routes/upload');
var session = require('./routes/session');
var evpush = require('./routes/evpush');
var api = require('./routes/api');

// Linking all the routes
app.use('/', index);
app.use('/station', station);
app.use('/connector', connector);
app.use('/upload', upload);
app.use('/session', session);
app.use('/evpush', evpush);
app.use('/api', api);

module.exports = app;
