// https://www.cloudkarafka.com/ הפעלת קפקא במסגרת ספק זה

const Kafka = require("node-rdkafka");
var redis = require('redis');
const axios = require('axios');
const { json } = require("body-parser");
const { response } = require("express");
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

const prefix = "rzwju3vs-";
const topic = `${prefix}new`;
const topic_weather = `${prefix}weather`;

const genMessage = m => new Buffer.alloc(m.length, m);

const topics = [topic, topic_weather];
const consumer = new Kafka.KafkaConsumer(kafkaConf, {
  "auto.offset.reset": "beginning"
});

consumer.on("error", function (err) {
  //console.error(err);
});
consumer.on("ready", function (arg) {
  console.log(`Consumer ${arg.name} ready`);
  consumer.subscribe(topics);
  consumer.consume();
});

// Get delay prediction for each flight and put it in a list
function getDataPromise(flightsList, modelID) {
  var ls = [];
  var flights = [];
  for (const key in flightsList) { //process flights in dataset format
    const flight = flightsList[key];
    console.log(flight['flight_id']);
    //console.log("valid flight");
    var to_insert = {};
    to_insert['dest'] = flight['dest'];
    to_insert['src'] = flight['src'];
    to_insert['type'] = flight['type'];
    to_insert['company'] = flight['company'];
    to_insert['date_type'] = flight['date_type'];
    to_insert['day'] = new Date().getDay();
    to_insert['month'] = new Date().getMonth();

    if (flight['src_weather']['stn_name'] != undefined) {
      to_insert['t_src'] = Number(flight['src_weather']['TD']);
      to_insert['wd_src'] = Number(flight['src_weather']['WS']);
      to_insert['t_dest'] = flight['dest_weather']['current']['temp'] - 273.15; //kelvin to celsius
      to_insert['wd_dest'] = flight['dest_weather']['current']['wind_speed'];
    }
    else {
      to_insert['t_src'] = flight['src_weather']['current']['temp'] - 273.15; //kelvin to celsius
      to_insert['wd_src'] = flight['src_weather']['current']['wind_speed'];
      to_insert['t_dest'] = Number(flight['dest_weather']['TD']);
      to_insert['wd_dest'] = Number(flight['dest_weather']['WS']);
    }
    //console.log(to_insert);
    flights.push(to_insert);
  }
  //console.log(flights);

  flights.forEach(f => {
    ls.push(axios.post(
      'https://bigml.io/andromeda/prediction?username=RoiPeleg;api_key=a98ff87df6a9338e80787730e7776f78f1c54857',
      {
        'model': modelID,
        'input_data': {
          dest: f.dest,
          src: f.src,
          type: f.type,
          company: f.company,
          date_type: f.date_type,
          t_dest: f.t_dest,
          t_src: f.t_src,
          wd_src: f.wd_src,
          wd_dest: f.wd_dest,
          Month: new Date().getMonth(),
          Day: new Date().getDay()
        }
      },
      {
        headers: {
          'content-type': 'application/json'
        }
      }
    ))
  })
  return ls;
}

// When getting data do:
consumer.on("data", function (m) {
  var data = JSON.parse(m.value.toString());
  //console.log(data);
  if (Array.isArray(data)) { //if the data is array it means we got flights information
    redisClient.del('landingFlights'); // delete all informatin on redis
    redisClient.del('takeOffFlights'); // delete all informatin on redis

    var flights = data;
    var numberOfLandingFlights = 0;
    var numberOfTakeOffFlights = 0;
    axios.get('https://bigml.io/andromeda/model?username=RoiPeleg;api_key=a98ff87df6a9338e80787730e7776f78f1c54857').then(res => {
      //console.log(res['data']['objects'][0]['resource']);
      axios.all(getDataPromise(flights, res['data']['objects'][0]['resource'])).then(res => {
        var counter = 0;
        flights.forEach(f => {
          //console.log(res);
          f['prediction'] = res[counter]['data']['output']; //add delay prediction to each flight JSON 
          if (f['dest'] == 'TLV') { // add flights to landing flights
            redisClient.hSet('landingFlights', f['id'], JSON.stringify(f)); // send the flights information to redis
            numberOfLandingFlights++;
          }
          else { //add flights to takeoff flights
            redisClient.hSet('takeOffFlights', f['id'], JSON.stringify(f)); // send the flights information to redis
            numberOfTakeOffFlights++;
          }
          counter++;
        });
        redisClient.set('NumberOfLandingFlights', numberOfLandingFlights); // send number of landing flights to redis
        redisClient.set('NumberOftakeOffFlights', numberOfTakeOffFlights); // send number of takeOff flights to redis
        redisClient.publish("message", "{\"message\":\"Hello from Redis\"}", function () {
        });
      });
    });
  }
  else { // if the data is not array - we got weahter information
    redisClient.set('Weather', JSON.stringify(data)); // add the information to redis
    redisClient.publish("Wmessage", "{\"message\":\"Weather from Redis\"}", function () {
    });
  }
});

redisClient.on('connect', function () {
  console.log('Sender connected to Redis');
});

consumer.on("disconnected", function (arg) {
  process.exit();
});

consumer.on('event.error', function (err) {
  console.error(err);
  process.exit(1);
});

consumer.on('event.log', function (log) {
  //console.log(log);
});

consumer.connect();
redisClient.connect();