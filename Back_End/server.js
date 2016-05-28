"use strict";


/*  GLOBAL FUNCTION     */
/*  REINITIALIZED AFTER USE !!! */



/*  GLOBAL FUNCTION     */
/*  REINITIALIZED AFTER USE !!!*/


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
            var user_id = fields['user_name'];
            sql.connection.query("SELECT * FROM users", function (err, rows, fields)
            {
                if (err) throw err;
                for (var counter = 0; counter < rows.length; ++counter)
                {
                    if (rows[counter].user_name === user_name && rows[counter].user_password === user_pass)
                    {
                        console.log("Users: " + rows[counter].user_name + " with Pass: " + rows[counter].user_password + " activity detected");
                        break;
                    }
                }
                /*  admin mode  */
                //TODO: implmentation of admin mode
                /*  user mode   */
                if (counter === 2)
                {
                    var html = buildHtml_user(req, user_id);
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
    function buildHtml_user(req, user_id)
    {
        var header = '';
        var body = '';
        var now = new Date();
        var FirstDayOfWeek = new Date();
        FirstDayOfWeek.setDate(now.getDate() - now.getDay() + 1);
        var query = "SELECT * FROM schedule WHERE date >";
        query += "'" + FirstDayOfWeek.getFullYear() + '-' + (FirstDayOfWeek.getMonth() + 1) + '-' + FirstDayOfWeek.getDate() + "'";
        query += "AND name = '";
        query += user_id + "'";
        query += " ORDER BY 'date' DESC";
        header += "<meta charset='UTF-8'><title>交通大學鋼琴社琴房預約系統</title><link rel='icon' href='Material/piano_icon.png'>";
        body += "您欲輸入的名字是"+ user_id;
        sql.connection.query(query, function(err, rows, fields)
        {
            /*  no record found  */
            if(rows.length == 0) console.log(user_id + " access system with no record found");
            else    //show booked
            {
                console.log(user_id + " access system with " + rows.length + " record found");
                body += "您目前登記的有: <br>";
                body += "<table>";
                body += "<tr>" + "<td>" + "日期" + "</td>" + "<td>" + "時間" + "</td>" + "<td>" + "房號" + "</td>" + "</tr>";
                for (var ctr = 0; ctr < rows.length; ++ctr)
                {
                    body += "<tr>";
                    /*  date    */
                    body += "<td>" + rows[ctr].date + "</td>";
                    /*  time    */
                    body += "<td>";
                    if (rows[ctr].time >= 12) {
                        if (rows[ctr].time != 12) body += (rows[ctr].time - 12) + ":00 PM ~ " + (rows[ctr].time - 11) + ":00 PM";
                        else body += rows[ctr].time() + ":00 PM ~ 1:00 PM";
                    }
                    else {
                        body += rows[ctr].time + ":00 AM ~ " + rows[ctr].time + ":00 AM";
                    }
                    body += "</td>";
                    /*  room    */
                    body += "<td>";
                    if (rows[ctr].room === 0) body += "409";
                    else body += "417";
                    body += "</td>";
                    body += "</tr>";
                }
                body += "</table>";
            }
            console.log(body);
        });
        return '<!DOCTYPE html><html lang="zh-Hant">' + '<html><header>' + header + '</header><body>' + body + '</body></html>';
    }

    server.listen(8888, function ()
    {
        console.log('Server running at http://localhost:8888/');
    });
}
exports.start = start;