const json2csv = require('json2csv').parse;
const fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
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
  MongoClient.connect(url, async function (err, db) {
    if (err) throw err;
    console.log("Connected to mongo");

    //For unique file name
    const dateTime = new Date().toISOString().slice(-24).replace(/\D/g, '').slice(0, 14);
    const filePath = "public/" + dateTime + ".csv";
    var dbo = db.db("hist");
    var query = { month: { $gt :  start, $lt : end}};
    const data = await dbo.collection('flights').find(query).toArray();
    const fields = ['dest', 'src', 'type', 'company', 'date_type', 'dest_weather', 'src_weather', 'day', 'month', 'Timing'];

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
                model.create(datasetInfo, { "objective_field": "000009" }, function (error, modelInfo) {
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

