var express = require('express');
var app = express();

// Defining all the routes
var index = require('./routes/index');
var station = require('./routes/station');
var connector = require('./routes/connector');

// Linking all the routes
app.use('/', index);
app.use('/station', station);
app.use('/connector', connector);

module.exports = app;
