const express = require('express')
const app = express();
const socketIO = require('socket.io');
const redis = require('redis');
const client = redis.createClient();
const subscriber = redis.createClient();

const port=3000;

app.use(express.static('public'))

app.set('view engine', 'ejs')

subscriber.connect();
client.connect();

var NumlandingFlights = 0;
var NumtakeOffFlights = 0;
var landingFlights = [];

subscriber.subscribe('message', (message) => {
  client.hLen('landingFlights').then(function(result) {
    NumlandingFlights = result;
      io.emit('newdata',{districtId:"landing",value:NumlandingFlights})
  })
  client.hLen('takeOffFlights').then(function(result) {
    NumtakeOffFlights = result;
    io.emit('newdata',{districtId:"takeOff",value:NumtakeOffFlights})
  })

  client.hGetAll('landingFlights').then(function(result) {
    //console.log(result)
    landingFlights = [];
    for (r in result){
      landingFlights.push(JSON.parse(result[r]))
    }
    //console.log(landingFlights);
    io.emit('flightsIn', landingFlights);
  })

  client.hGetAll('takeOffFlights').then(function(result) {
    //console.log(result)
    takeOffFlights = [];
    for (r in result){
      takeOffFlights.push(JSON.parse(result[r]))
    }
    //console.log(landingFlights);
    io.emit('flightsOut', takeOffFlights);
  })
});

app.get('/', (req, res) => {
  var data = {
    cards: [
      {districtId:"landing", title: "טיסות ממתינות לנחיתה", value: NumlandingFlights, fotterText: "צפה בטיסות", icon: "flight" },
      {districtId:"takeOff", title: "טיסות הממתינות להמראה", value: NumtakeOffFlights, fotterText: "צפה בטיסות", icon: "flight" },
      {districtId:"weather", title: "מזג האוויר", value: 22, fotterText: "צפה בפרטים", icon: "cloud" }
    ]
  }
  res.render("pages/dashboard", data)
})

app.get('/landingFlightsTable', (req, res) => {
  var data = {
    flights: landingFlights 
  }
  //console.log(data);
  res.render("pages/landingFlightsTable", data)
})

app.get('/takeOffFlightsTable', (req, res) => {
  var data = {
    flights: landingFlights 
  }
  //console.log(data);
  res.render("pages/takeOffFlightsTable", data)
})

app.get('/setData/:districtId/:value', function (req, res) {
  io.emit('newdata',{districtId:req.params.districtId,value:req.params.value})
  res.send(req.params.value)
})

const server = express()
  .use(app)
  .listen(3000, () => console.log(`Listening Socket on http://localhost:3000`));

const io = socketIO(server);
//const io2 = socketIO(server);

io.on('connection', (socket) => {
  console.log('a user connected');
});
io.on('error', (socket) => {
  console.log(socket);
});


//------------
// io.on('connection', (socket) => {  
//   socket.on('newdata', (msg) => {
//     console.log(msg);
//     io.emit('newdata', msg);
//   });
// });
//-----------

