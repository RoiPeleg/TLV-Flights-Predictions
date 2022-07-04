var express = require('express');
var app = require('express')();
var server = require('http').Server(app);
var redis = require('redis');
var redisClient = redis.createClient();

var sub = redis.createClient()

//for explanations : https://www.sitepoint.com/using-redis-node-js/

app.get('/test', function (req, res) {

    // Store string  
    redisClient.set('NumberOfCars', "390", function (err, reply) {
        console.log(reply);
    });

    //Store and get Hash i.e. object( as keyvalue pairs)
    redisClient.hSet('Sections',"one", 'Sorek',"two", 'Nesharim',"three", 'BenShemen', "four",'nashonim',"five", 'kesem');
    redisClient.hSet('Sections', "hi", 'bi');
    redisClient.hGetAll('Sections', function (err, object) {
        console.log(object);
    });

    redisClient.publish("test", "{\"message\":\"Hello from Redis\"}", function () {
    });

    res.send('תקשרתי עם רדיס....')
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

redisClient.on('connect', function () {
    console.log('Sender connected to Redis');    
});

server.listen(6062, function () {
    redisClient.connect();
    console.log('Sender is running on port 6062');
});

// redisClient.on('error', err => {
//     console.log('Error ' + err);
// });
