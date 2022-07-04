const express = require('express')
const app = express();
const socketIO = require('socket.io');

const port=3000;

app.use(express.static('public'))

app.set('view engine', 'ejs')

app.get('/', (req, res) => {
  var data = {
    cards: [
      {districtId:"landing", title: "טיסות ממתינות לנחיתה", value: 14, fotterText: "צפה בטיסות", icon: "flight" },
      {districtId:"takeOff", title: "טיסות הממתינות להמראה", value: 12, fotterText: "צפה בטיסות", icon: "flight" },
      {districtId:"weather", title: "מזג האוויר", value: 22, fotterText: "צפה בפרטים", icon: "cloud" }
    ]
  }
  res.render("pages/dashboard", data)
})

app.get('/setData/:districtId/:value', function (req, res) {
  io.emit('newdata',{districtId:req.params.districtId,value:req.params.value})
  res.send(req.params.value)
})


const server = express()
  .use(app)
  .listen(3000, () => console.log(`Listening Socket on http://localhost:3000`));
const io = socketIO(server);

//------------
// io.on('connection', (socket) => {  
//   socket.on('newdata', (msg) => {
//     console.log(msg);
//     io.emit('newdata', msg);
//   });
// });
//-----------

