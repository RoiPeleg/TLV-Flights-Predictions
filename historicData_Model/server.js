const json2csv = require('json2csv').parse;
const fs = require('fs');
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://admin:zntrNP6Rva9UY1jg@mongoapp.9e973.mongodb.net/?retryWrites=true&w=majority";
var bigml = require('bigml');

//site imports
const express = require('express')
const app = express();
const socketIO = require('socket.io');
const port = 2626;
app.use(express.static('public'))
app.set('view engine', 'ejs')

app.get('/', (req, res) => {
  res.render("pages/predict_dashboard");
})

const server = express()
  .use(app)
  .listen(port, () => console.log(`Listening Socket on http://localhost:${port}`));

const io = socketIO(server);

function create_new_model(start, end) {
  let csv;
  MongoClient.connect(uri, async function (err, db) {
    if (err) throw err;
    console.log("Connected to mongo");

    //For unique file name
    const dateTime = new Date().toISOString().slice(-24).replace(/\D/g, '').slice(0, 14);
    const filePath = "public/" + dateTime + ".csv";
    var dbo = db.db("hist");
    var query = { month: { $gt :  start, $lt : end}};
    const data = await dbo.collection('flights').find(query).toArray();

    data.forEach(element => {
      if(element['src_weather']['stn_name'] != undefined){
        element['t_src'] = Number(element['src_weather']['TD']); 
        element['wd_src'] = Number(element['src_weather']['WS']); 
        element['t_dest'] = element['dest_weather']['current']['temp'] - 273.15; //kelvin to celsius
        element['wd_dest'] = element['dest_weather']['current']['wind_speed']; 
      }
      else{
        element['t_src'] = element['src_weather']['current']['temp'] - 273.15; //kelvin to celsius
        element['wd_src'] = element['src_weather']['current']['wind_speed']; 
        element['t_dest'] = Number(element['dest_weather']['TD']); 
        element['wd_dest'] = Number(element['dest_weather']['WS']);
      }
    });

    const fields = ['dest', 'src', 'type', 'company', 'date_type', 't_dest', 'wd_dest','t_src', 'wd_src', 'day', 'month', 'Timing'];

    try {
      csv = json2csv(data, { fields });
    } catch (err) {
      console.log("error");
    }

    fs.writeFile(filePath, csv, function (err) {
      if (err) {
        console.log(err);
      }
      else {
        setTimeout(function () {
          fs.unlink(filePath, function (err) { // delete this file after 30 seconds
            if (err) {
              console.error(err);
            }
            console.log('File has been Deleted');
          });

        }, 30000);
        var source = new bigml.Source();
        source.create(filePath, function (error, sourceInfo) {
          if (!error && sourceInfo) {
            var dataset = new bigml.Dataset();
            dataset.create(sourceInfo, function (error, datasetInfo) {
              if (!error && datasetInfo) {
                var model = new bigml.Model();
                model.create(datasetInfo, { "objective_field": "00000b" }, function (error, modelInfo) {

                  if (!error && modelInfo) {
                    console.log(modelInfo);
                  }
                });
              }
            });
          }
        });
      }
    })
  });
}

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.emit('m', { 'data': 'hello' });
  socket.on('dates', function (msg) {
    create_new_model(Number(msg.start.split("-")[1]),Number(msg.end.split("-")[1]))
  });
});

io.on('error', (socket) => {
  console.log(socket);
});

