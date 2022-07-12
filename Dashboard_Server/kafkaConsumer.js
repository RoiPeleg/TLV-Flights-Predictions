// https://www.cloudkarafka.com/ הפעלת קפקא במסגרת ספק זה

const uuid = require("uuid");
const Kafka = require("node-rdkafka");
var app = require('express')();
var server = require('http').Server(app);
var redis = require('redis');
var bigml = require('bigml');
var connection = new bigml.BigML();
const { json } = require("body-parser");
var redisClient = redis.createClient();

const kafkaConf = {
  "group.id": "moped.srvs.cloudkafka.com",
  "metadata.broker.list": "moped-01.srvs.cloudkafka.com:9094,moped-02.srvs.cloudkafka.com:9094,moped-03.srvs.cloudkafka.com:9094".split(","),
  "socket.keepalive.enable": true,
  "security.protocol": "SASL_SSL",
  "sasl.mechanisms": "SCRAM-SHA-256",
  "sasl.username": "rzwju3vs",
  "sasl.password": "jofuI3Fq_jnaNtb2A7zMX211BOPpy7J-",
  "debug": "generic,broker,security"
};
var localModel = new bigml.LocalModel("model/62cd5bc235f2d050f600ec52");
const prefix = "rzwju3vs-";
const topic = `${prefix}new`;
const topic_weather = `${prefix}weather`;
//const producer = new Kafka.Producer(kafkaConf);

const genMessage = m => new Buffer.alloc(m.length,m);
//const prefix = process.env.CLOUDKARAFKA_USERNAME;

const topics = [topic, topic_weather];
const consumer = new Kafka.KafkaConsumer(kafkaConf, {
  "auto.offset.reset": "beginning"
});

consumer.on("error", function(err) {
  //console.error(err);
});
consumer.on("ready", function(arg) {
  console.log(`Consumer ${arg.name} ready`);
  consumer.subscribe(topics);
  consumer.consume();
});

consumer.on("data", function(m) {
  //console.log("got message");
  var data = JSON.parse(m.value.toString());
  console.log(data);
  if (Array.isArray(data)){
    
    redisClient.del('landingFlights');
    redisClient.del('takeOffFlights');
    console.log("in if");
    var flights = data;
    var numberOfLandingFlights = 0;
    var numberOfTakeOffFlights = 0;
    //console.log(flights)
    flights.forEach(f => {
      if (f['dest'] == 'TLV') {
        var p = localModel.predict(f, function(error, prediction) {return console.log(prediction)});
        console.log(p);
        f['prediction'] = p['prediction'];
        redisClient.hSet('landingFlights', f['id'], JSON.stringify(f));
        numberOfLandingFlights++;
      }
      else {
        var p = localModel.predict(f, function(error, prediction) {return console.log(prediction)});
        console.log(p);
        f['prediction'] = p['prediction'];
        redisClient.hSet('takeOffFlights', f['id'], JSON.stringify(f));
        numberOfTakeOffFlights++;
      }
    });
    redisClient.set('NumberOfLandingFlights', numberOfLandingFlights);
    redisClient.set('NumberOftakeOffFlights', numberOfTakeOffFlights);
    redisClient.publish("message", "{\"message\":\"Hello from Redis\"}", function () {
    });
  }
  else {
    redisClient.set('Weather', JSON.stringify(data));
    redisClient.publish("Wmessage", "{\"message\":\"Weather from Redis\"}", function () {
    });
  }
});

redisClient.on('connect', function () {
  console.log('Sender connected to Redis');    
});

server.listen(6062, function () {
  redisClient.connect();
  console.log('Sender is running on port 6062');
});

consumer.on("disconnected", function(arg) {
  process.exit();
});
consumer.on('event.error', function(err) {
  console.error(err);
  process.exit(1);
});
consumer.on('event.log', function(log) {
  //console.log(log);
});
consumer.connect();