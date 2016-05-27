function start() {
    var express = require('express');
    var bodyParser = require('body-parser');
    var fs = require('fs');
    var formidable = require("formidable");
    var util = require('util');
    var server = express();
    var sql = require('./sql');
    server.use(bodyParser.urlencoded({extended: true}));


    server.post('/process', function (req, res) {
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
            /*  mysql   */
            //search user name
            var user_name = fields['user_id'];
            var user_pass = fields['user_pass'];
            sql.connection.query("SELECT * FROM users", function (err, rows, fields) {
                if (err) throw err;
                for (var counter = 0; counter < rows.length; ++counter) {
                    if (rows[counter].user_name === user_name && rows[counter].user_password === user_pass) {
                        console.log("Users: " + rows[counter].user_name + " with Pass: " + rows[counter].user_password + " activity detected");
                        break;
                    }
                }
                /*  admin mode  */
                //TODO: implmentation of admin mode
                /*  user mode   */
                if (counter === 2)
                {
                    var html = buildHtml_user(req);
                    /*  point to the selectable form for user   */
                    res.writeHead(200, {
                        'Content-Type': 'text/html'
                    });
                    res.end(html);
                }
                /*  login failed    */
                if (counter === rows.length) {
                    console.log("Attempt failed with User: " + user_name + " Pass: " + user_pass + " detected");
                    res.redirect('http://localhost:63342/NCTU_Piano_Club_Sheet/Front_End/Fail.html');
                    res.end();
                }

            });
        });
        form.parse(req);
    }

    /*  build form for user */
    function buildHtml_user(req)
    {

        var header = '';
        var body = '';
        header += "<meta charset='UTF-8'><title>交通大學鋼琴社琴房預約系統</title><link rel='icon' href='Material/piano_icon.png'>";
        body += "WHOOOOOOOOOOOO";
        return '<!DOCTYPE html><html lang="zh-Hant">' + '<html><header>' + header + '</header><body>' + body + '</body></html>';
    }

    server.listen(8888, function () {
        console.log('Server running at http://localhost:8888/');
    });
}
exports.start = start;