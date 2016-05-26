function start() {
    var express = require('express');
    var bodyParser = require('body-parser');
    var fs = require('fs');
    var formidable = require("formidable");
    var util = require('util');
    var server = express();
    var sql = require('./sql');

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

        form.on('end', function (){
            /*  mysql   */
            //search user name
            var user_name = fields['user_name'];
            var user_pass = fields['user_pass'];
            sql.connection.query("SELECT * FROM users", function(err, rows, fields) {
                if (err) throw err;
                for(var counter = 0; counter < rows.length; ++counter)
                {
                    if(rows[counter].user_name === user_name && rows[counter].user_password === user_pass)
                    {
                        console.log("Users: " + rows[counter].user_name + " Pass: " + rows[counter].user_password);
                        break;
                    }
                }
                if(counter == rows.length)
                {
                    res.writeHead(302,
                        {Location: 'http://localhost:63342/NCTU_Piano_Club_Sheet/Front_End/Fail.html'}
                    );
                    res.end();
                }
                else
                {
                    res.writeHead(200, {
                        'content-type': 'text/plain'
                    });
                    res.write('Login Success\n\n');
                    res.end();
                }
            });
        });
        form.parse(req);
    }

    server.listen(8888, function() {
        console.log('Server running at http://localhost:8888/');
    });
}

exports.start = start;