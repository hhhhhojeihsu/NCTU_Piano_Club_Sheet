function start() {
    var express = require('express');
    var bodyParser = require('body-parser');
    var fs = require('fs');
    var formidable = require("formidable");
    var util = require('util');
    var server = express();

    server.use(bodyParser.urlencoded({ extended: true }));


    server.post('/process', function(req, res) {
        processFormFieldsIndividual(req, res);
    });

    function processFormFieldsIndividual(req, res) {
        //Store the data from the fields in your data store.
        //The data store could be a file or database or any other store based
        //on your application.
        var fields = [];
        var form = new formidable.IncomingForm();
        form.on('field', function (field, value) {
            fields[field] = value;
        });

        form.on('end', function () {
            res.writeHead(200, {
                'content-type': 'text/plain'
            });
            res.write('received the data:\n\n');
            res.end(util.inspect({
                fields: fields
            }));
        });
        form.parse(req);
    }

    server.listen(8888, function() {
        console.log('Server running at http://localhost:8888/');
    });
}

exports.start = start;