var axios = require('axios');
const express = require('express');
const app = express();
const fs = require('fs');
var API_key = "4f2c4a4098566e5adaee3aca35896191"//"5b5738e97d3d10f0736a4e601c25882c"
const bodyParser = require('body-parser');
const resultBuffer = fs.readFileSync('codesToLoc.txt');
const IataToLoc = JSON.parse(resultBuffer.toString().trim());
const mysql = require('mysql2');
var convert = require('xml-js');
const con = mysql.createConnection({//MySQL connection etails
    host: "localhost",
    user: "root",
    password: "12345",
    database: "logs"
});
var sql = "INSERT INTO logs (last_update) VALUES (NOW())"; //query to send


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

axios.interceptors.request.use(config => {
    // log a message before any HTTP request is sent
    console.log('Request was sent');

    return config;
});


// https://www.cloudkarafka.com/ הפעלת קפקא במסגרת ספק זה

const uuid = require("uuid");
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
const topic_weather = `${prefix}weather`;
const producer = new Kafka.Producer(kafkaConf);
var numberOfMessages = 0
const genMessage = m => new Buffer.alloc(m.length, m);

// transforms iata code to lat and lon
function getLocationByCode(code) {
    return IataToLoc.filter(
        function (IataToLoc) { return IataToLoc.code == code }
    );
}


// JavaScript program to calculate Distance Between
// Two Points on Earth
function distance(lat1, lat2, lon1, lon2) {

    // The math module contains a function
    // named toRadians which converts from
    // degrees to radians.
    lon1 = lon1 * Math.PI / 180;
    lon2 = lon2 * Math.PI / 180;
    lat1 = lat1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;

    // Haversine formula
    let dlon = lon2 - lon1;
    let dlat = lat2 - lat1;
    let a = Math.pow(Math.sin(dlat / 2), 2)
        + Math.cos(lat1) * Math.cos(lat2)
        * Math.pow(Math.sin(dlon / 2), 2);

    let c = 2 * Math.asin(Math.sqrt(a));

    // Radius of earth in kilometers. Use 3956
    // for miles
    let r = 6371;

    // calculate the result
    return (c * r);
}

// returns the type of today's date holyday summer vacation or normal day
async function get_Date_type() {
    const holiydays = ['Pesach', 'Chanukah', 'Purim', 'Rosh Hashana', 'Shavuot', 'Sukkot', 'Yom Kippur', "Yom HaAtzma'ut"];
    let today = new Date().toISOString().slice(0, 10)
    var type = await axios.get(`https://www.hebcal.com/converter?cfg=json&date=${today}&g2h=1&strict=1`)
        .then(response => {
            if([7,8].includes(response['data']['gm'])){
                return "summer";
            }
            for (var key in response['data']['events']) {
                for (var day in holiydays) {
                    if (response['data']['events'][key].includes(day)) {
                        return "holyday";
                    }
                }
            }
            return "normal";
        });
    return type;
}




var part = 'minutely,alerts,daily,hourly'
// runs every 60 sec and runs on init.
con.connect(function (err) {
    if (err) throw err;
    console.log("Connected! to MySQL");
});

async function collect_flights_data() {
    // sent a GET request
    var myData = []
    var filteredData = await axios.get('https://data-cloud.flightradar24.com/zones/fcgi/feed.js?faa=1&bounds=32.315,31.755,33.724,36.36&satellite=1&mlat=1&flarm=1&adsb=1&gnd=1&air=1&vehicles=1&estimated=1&maxage=14400&gliders=1&selected=2c70d17f&ems=1&airport=TLV&stats=1')
        .then(response => {
            var temp = []
            for (var k in response.data) {
                if (response.data[k].hasOwnProperty(11) && response.data[k].hasOwnProperty(12)) {
                    var current_flight = response.data[k]
                    temp.push(current_flight)
                }
            }
            return temp;
        });

    for (var i in filteredData) {
        current_flight = filteredData[i]
        locdest = getLocationByCode(current_flight[11])
        locsrc = getLocationByCode(current_flight[12])
        if (locdest.length == 0) {
            var lon = 0
            var lat = 0
        }
        else {
            var lon = locdest[0]['lon'] * 1
            var lat = locdest[0]['lat'] * 1
        }
        if (locsrc.length == 0) {
            var lons = 0
            var lats = 0
        }
        else {
            var lons = locsrc[0]['lon'] * 1
            var lats = locsrc[0]['lat'] * 1
        }

        var flightDistance = distance(lat, lats, lon, lons)
        var flightType = 'short'
        if (flightDistance < 3500 && flightDistance > 1500) {
            flightType = 'medium'
        }
        else if (flightDistance > 3500) {
            flightType = 'long'
        }
        // console.log(`https://api.openweathermap.org/data/2.5/onecall?lat=${lats}&lon=${lons}&exclude=${part}&appid=${API_key}`);
        // console.log(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=${part}&appid=${API_key}`);
        // var dest_weather = await axios.get(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=${part}&appid=${API_key}`).then(response => { return response.data }).catch(function (error) {
        //     if (error.response) {
        //       // Request made and server responded
        //       console.log(error.response.data);
        //       console.log(error.response.status);
        //       console.log(error.response.headers);
        //     } else if (error.request) {
        //       // The request was made but no response was received
        //       console.log(error.request);
        //     } else {
        //       // Something happened in setting up the request that triggered an Error
        //       console.log('Error', error.message);
        //     }

        //   });
        // var src_weather = await axios.get(`https://api.openweathermap.org/data/2.5/onecall?lat=${lats}&lon=${lons}&exclude=${part}&appid=${API_key}`).then(response => { return response.data }).catch(function (error) {
        //     if (error.response) {
        //       // Request made and server responded
        //       console.log(error.response.data);
        //       console.log(error.response.status);
        //       console.log(error.response.headers);
        //     } else if (error.request) {
        //       // The request was made but no response was received
        //       console.log(error.request);
        //     } else {
        //       // Something happened in setting up the request that triggered an Error
        //       console.log('Error', error.message);
        //     }

        //   });;


        var time_data = await axios.get('https://data-live.flightradar24.com/clickhandler/?version=1.5&flight=' + filteredData[i][19]).then(response => {
            return response.data['time']
        });

        var date_type = await get_Date_type();
        var obj = {
            id: current_flight[13],
            LON: current_flight[1],
            LAT: current_flight[2],
            status: current_flight[7],
            dest: current_flight[11],
            src: current_flight[12],
            type: flightType,
            onground: current_flight[14],
            company: current_flight[18],
            date_type: date_type,
            //dest_weather: dest_weather,
            //src_weather: src_weather
            times: time_data
        };
        //console.log(obj);
        myData.push(obj);
    }
    producer.produce(topic, -1, genMessage(JSON.stringify(myData)), numberOfMessages++);

    con.query(sql, function (err, result) {//log the update
        if (err) throw err;
        console.log("1 record inserted");
    });
    console.log("sent data");
}

async function collect_weather_data() {
    var current_weather = await axios.get('https://ims.data.gov.il/sites/default/files/xml/imslasthour.xml')
        .then(response => {

            var result = JSON.parse(convert.xml2json(response.data, { compact: true, spaces: 4 }));
            var first_data_point = {};
            for (const key in result["RealTimeData"]["Observation"]) {

                if (result["RealTimeData"]["Observation"][key]["stn_name"]["_text"] == "TEL AVIV COAST") {
                    first_data_point = result["RealTimeData"]["Observation"][key];
                    break;
                }
            }
            var to_send = {};
            for (const key in first_data_point) {
                to_send[key] = first_data_point[key]["_text"];
            }
           return to_send;
        });
        
    producer.produce(topic_weather, -1, genMessage(JSON.stringify(current_weather)), numberOfMessages++);
}

producer.on("ready", function (arg) {
    console.log(`producer ariel ready.`);
    collect_data();
    setInterval(collect_flights_data, 60 * 1000 * 5);
    collect_weather_data();
    setInterval(collect_weather_data, 60 * 1000 * 6);
});

producer.connect();
