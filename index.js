
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var xmlparser = require('express-xml-bodyparser');
//var db = require('mongodb');
const PORT = process.env.PORT || 5000

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var metricSchema = new Schema( 
{
    Cadence: String,
    DisplayName: String,
    IsEvent: Boolean,
    Enabled : Boolean,
    Name: String,
    RangeMax:  Schema.Types.Decimal128,
    RangeMin :  Schema.Types.Decimal128,
    Transactional: Boolean,
    Type: String,
    Units: String,
    Version: String
});

var measurementSchema = new Schema( 
{
    Comment: String,
    DateTime: Date,
    Flag: String,
    MetricName: String,
    Text: String,
    Type: String,
    Value: Number,
    Version: String
});

var eventSchema = new Schema(
{
    Category: String,
    Code: String,
    DateTime: Date,
    Description: String,
    DisplayFlag: Buffer.alloc(0),
    Effect: String,
    MetricName: String,
    Name: String,
    Severity: String,
    Type: String,
    Version: String
});

var componentSchema = new Schema(
{
    SerialNumber: String,
    Category: String,
    CatSpecificData: String,
    Instance: String,
    IsDevice: Boolean,
    LotNumber: String,
    Model: String,
    name: String,
    PartNumber: String,
    Revision: String,
    Type: String,
    Version: String,
    componentMetric : metricSchema,
    measurements: [measurementSchema],
    events: [eventSchema]
});

var DeviceComponent = mongoose.model('DeviceComponent', componentSchema);
var MetricComponent = mongoose.model('MetricComponent', metricSchema);
var Measurement = mongoose.model('Measurement', measurementSchema);
var Event = mongoose.model('Event', eventSchema);

mongoose.connect('mongodb://heroku_x60fnssm:dqmi6t7i589bl0933cleo16o29@ds157742.mlab.com:57742/heroku_x60fnssm');

io.on('connection', function (socket)
{
    socket.on('chat message',function(msg)
    {
        console.log('message: '+msg);
        io.emit('chat message',msg);
    });
    socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});


app.get('/',function( req,res) {

	res.sendFile(__dirname +'/index.html');
});

app.post('/receive-xml', xmlparser({trim: false, explicitArray: false}), function(req, res, next) {
  
    var data = req.body.body;
    var jsonComponent  = JSON.parse( data.data[0]._);

    var jsonComponentMetric = JSON.parse( data.data[1]._);

    var resultRes ;
    
    DeviceComponent.findOne({SerialNumber:jsonComponent.SerialNumber }, function(err, component)
    {
        if (err) return handleError(err);
        
        if( component)
        {
            console.log('data exist');
            component = populateJson(component,data);

            io.emit('chat message',JSON.stringify( component));

            component.save(function(err, result) {
                if (err) throw err;
        
                if(result) {
                    resultRes = result;
                }
                console.log('data updated');
            });
        }
        else{

            var component = new DeviceComponent(
                JSON.parse( data.data[0]._)
            );
            component.componentMetric = new MetricComponent(
            {
                Cadence: jsonComponentMetric.Cadence,
                DisplayName: jsonComponentMetric.DisplayName,
                IsEvent: jsonComponentMetric.IsEvent,
                Enabled : jsonComponentMetric.Enabled,
                Name: jsonComponentMetric.Name,
                RangeMax:  jsonComponentMetric.RangeMax,
                RangeMin :  jsonComponentMetric.RangeMin,
                Transactional: jsonComponentMetric.Transactional,
                Type: jsonComponentMetric.Type,
                Units: jsonComponentMetric.Units,
                Version: jsonComponentMetric.Version
            });

            component = populateJson(component,data);
            component.save(function(err, result) {
                if (err) throw err;
        
                if(result) {
                    resultRes = result;
                }
                console.log('data saved');
            });
        }
            //push data to connected clients
        io.emit('chat message',JSON.stringify( component));

    });
    
    res.send(data);
});

app.get('/data', function(req, res) {
    DeviceComponent.find({}, function(err, component) {
       res.send( {component: component});
    });
});


io.on('connection', function (socket)
{
    socket.on('chat message',function(msg)
    {
        console.log('message: '+msg);
        io.emit('chat message',msg);
    });
    socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

http.listen(PORT, function(req, res) {

	console.log("listenig to port "+PORT);
});

function populateJson(component,data)
    {
        data.data.forEach(element => {
        
            if( element.$.Type == 'Measurement')
            {
                var mjson =  JSON.parse( element._ );
                component.measurements.push(
                {
                    DateTime : mjson.DateTime.DateTimeUtc,
                    MetricName : mjson.MetricName,
                    Value : mjson.Value,
                    Type : mjson.Type,
                    Text: mjson.Text
                });

            }
    
            if( element.$.Type == 'Event')
            {
                var ejson =  JSON.parse( element._ );
                component.events.push(
                {
                    DateTime : ejson.DateTime.DateTimeUtc,
                    Category : ejson.Category,
                    Code : ejson.Code,
                    Type : ejson.Type,
                    Severity : ejson.Severity
                });
            }
        });
        return component;
}