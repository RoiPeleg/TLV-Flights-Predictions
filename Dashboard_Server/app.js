const express = require('express')
const app = express();
const socketIO = require('socket.io');
const redis = require('redis');
const client = redis.createClient();
const subscriber = redis.createClient();

const port = 3000;

app.use(express.static('public'))

app.set('view engine', 'ejs')

subscriber.connect();
client.connect();

var NumlandingFlights = 0;
var NumtakeOffFlights = 0;
var landingFlights = [];
var weather = {};
var mezeg = "-";
var dt = new Date();
var td = (("0" + dt.getDate()).slice(-2)) + "." + (("0" + (dt.getMonth() + 1)).slice(-2)) + "." + (dt.getFullYear()) + " " + (("0" + dt.getHours()).slice(-2)) + ":" + (("0" + dt.getMinutes()).slice(-2));


subscriber.subscribe('message', (message) => { //when recieve flights information from redis do:
  client.hLen('landingFlights').then(function (result) { // get number of landing flights from redis
    NumlandingFlights = result;
    io.emit('newdata', { districtId: "landing", value: NumlandingFlights }) // send number of landing flights to the dashboard
  })
  client.hLen('takeOffFlights').then(function (result) { // get number of takeOff flights from redis
    NumtakeOffFlights = result;
    io.emit('newdata', { districtId: "takeOff", value: NumtakeOffFlights }) // send number of takeOff flights to the dashboard
  })

  client.hGetAll('landingFlights').then(function (result) { // get the list of landing flights from redis
    landingFlights = [];
    for (r in result) {
      landingFlights.push(JSON.parse(result[r]))
    }
    io.emit('flightsIn', landingFlights); // send landing flights list to the dashboard
  })

  client.hGetAll('takeOffFlights').then(function (result) { // get the list of takeOff flights from redis
    takeOffFlights = [];
    for (r in result) {
      takeOffFlights.push(JSON.parse(result[r]))
    }
    io.emit('flightsOut', takeOffFlights); // send takeOff flights list to the dashboard
  })
});

subscriber.subscribe('Wmessage', (m) => { //when recieve weahter information from redis do:
  client.get('Weather').then(function (result) {
    weather = JSON.parse(result);
    mezeg = weather['TD'].toString();
    if (weather['WS'] > 17 && weather['Rain'] > 8) {
      mezeg = mezeg + " Storm";
    }
    else if (weather['WS'] > 17) {
      mezeg = mezeg +" Heavy Wind"
    }
    else if (weather['WS'] <= 17) {
      mezeg = mezeg +" Light Wind"
    }
    else if (weather['Rain'] > 8) {
      mezeg = mezeg +" Heavy Rain"
    }
    else if (weather['Rain'] <= 8 && weather['Rain'] > 0) {
      mezeg = mezeg +" Light Rain"
    }
    else {
      mezeg = mezeg +" Sunny"
    }

    console.log(weather);
    //console.log(temp);
    console.log(mezeg)
    io.emit('mezegAvir', { districtId: "weather", value: mezeg}) // send weather to the dashboard
  })
});


app.get('/', (req, res) => { // main page
  var data = { // enter data for cards
    cards: [
      { districtId: "landing", title: "טיסות הממתינות לנחיתה", value: NumlandingFlights, fotterText: "צפה בטיסות", icon: "flight" },
      { districtId: "takeOff", title: "טיסות הממתינות להמראה", value: NumtakeOffFlights, fotterText: "צפה בטיסות", icon: "flight" },
      { districtId: "weather", title: "מזג האוויר", value: mezeg, fotterText: " ", icon: "cloud" },
      { districtId: "time", title: "תאריך ושעה", value: td, fotterText: " ", icon: "watch" }
    ]
  }
  res.render("pages/dashboard", data) // send the cards to the dashboards
})

app.get('/landingFlightsTable', (req, res) => { // landing flights table page
  var data = {
    flights: landingFlights
  }
  res.render("pages/landingFlightsTable", data)
})

app.get('/takeOffFlightsTable', (req, res) => { // takeOff flights table page
  var data = {
    flights: landingFlights
  }
  res.render("pages/takeOffFlightsTable", data)
})

app.get('/setData/:districtId/:value', function (req, res) {
  io.emit('newdata', { districtId: req.params.districtId, value: req.params.value })
  res.send(req.params.value)
})

const server = express()
  .use(app)
  .listen(3000, () => console.log(`Listening Socket on http://localhost:3000`));

const io = socketIO(server);

io.on('connection', (socket) => {
  console.log('a user connected');
});
io.on('error', (socket) => {
  console.log(socket);
});