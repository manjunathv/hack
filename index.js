var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var xmlparser = require('express-xml-bodyparser');
var db = require('mongodb');


app.get('/',function( req,res) {

	res.sendFile(__dirname +'/index.html');
});

app.post('/receive-xml', xmlparser({trim: false, explicitArray: false}), function(req, res, next) {
    // check req.body  
    //next(req.body.body.data);
    var data= req.body.body;
    console.log(data);
    res.send(data);
});

//write to db
function next(data)
{
    console.log(data[0].name);
}
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

http.listen(3000, function(req, res) {

	console.log("listenig to port 3000");
});
