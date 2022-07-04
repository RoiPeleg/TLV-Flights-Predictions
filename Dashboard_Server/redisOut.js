var express = require('express');
var app = require('express')();
var server = require('http').Server(app);
var redis = require('redis');
var redisClient = redis.createClient();
var sub = redis.createClient()

redisClient.subscribe('test');

app.get('/', (req, res) => res.send('hello world!'))

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

redisClient.on("message", function (channel, data) {
    var data = JSON.parse(data);
    console.log("in test")
    // var cars = redisClient.get('NumberOfCars', function (err, object) {
    //     console.log(object);
    // });
    // do things with the data
    data.variable1 = 3;
    data.variable2 = "hello";
    console.log(data.message);
});

redisClient.on('connect', function() {
    console.log('Reciver connected to Redis');
});

server.listen(6061, function() {
    redisClient.connect();
    console.log('reciver is running on port 6061');
});

