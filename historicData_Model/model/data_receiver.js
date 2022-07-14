var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
const Kafka = require("node-rdkafka");
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

const topics = [topic];
const consumer = new Kafka.KafkaConsumer(kafkaConf, {
  "auto.offset.reset": "beginning"
});
var fdb;
consumer.on("ready", function (arg) {
  console.log(`Consumer ${arg.name} ready`);
  consumer.subscribe(topics);
  consumer.consume();
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    fdb = db;
    console.log("Connected to mongo");
  });
});

consumer.on("data", function (m) {
  var data = JSON.parse(m.value.toString());
  var flights = [];
  for (const key in data) { //process flights in dataset format
    const flight = data[key];
    console.log(flight['flight_id']);
    if (flight.real_arrival != null && flight.departure != null) {
      console.log("valid flight");
      var to_insert = {};
      to_insert['dest'] = flight['dest'];
      to_insert['src'] = flight['src'];
      to_insert['type'] = flight['type'];
      to_insert['company'] = flight['company'];
      to_insert['date_type'] = flight['date_type'];
      to_insert['dest_weather'] = flight['dest_weather'];
      to_insert['src_weather'] = flight['src_weather'];
      to_insert['day'] = new Date().getDay();
      to_insert['month'] = new Date().getMonth();

      if (flight['dest'] == 'TLV') {
        var diff = flight['real_arrival'] - flight['scheduled_arrival'];
      }
      else {
        var diff = flight['real_departure'] - flight['scheduled_departure'];
      }
      diff = Math.floor(diff / 60);
      var mins_diff = diff % 60;
      var time = "On Time";
      if (mins_diff < 15) {
        time = "On Time";
      }
      else if (mins_diff <= 60 && mins_diff > 15) {
        time = "Delay";
      }
      else {
        time = "Heavy Delay";
      }
      to_insert['Timing'] = time;
      flights.push(to_insert);
    }
  }
  if (flights.length != 0) {
    //insert data to mongo
    var dbo = fdb.db("hist");
    dbo.collection("flights").insertMany(flights, function (err, res) {
      if (err) throw err;
      console.log(res);
      console.log("inserted");
      //db.close();
    });
  }

});

consumer.on("disconnected", function (arg) {
  fdb.close();
  process.exit();
});
consumer.on('event.error', function (err) {
  console.error(err);
  process.exit(1);
});
consumer.connect();