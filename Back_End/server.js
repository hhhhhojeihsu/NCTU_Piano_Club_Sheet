"use strict";

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
                    var now = new Date();
                    var FirstDayOfWeek = new Date();
                    var day_cht = "日一二三四五六日";
                    var query = "SELECT * FROM schedule WHERE date >";
                    var days_this_mon = ((new Date(now.getFullYear(), now.getMonth() + 1, 1)) - (new Date(now.getFullYear(), now.getMonth(), 1)))/60/60/24/1000;	//how many days
                    FirstDayOfWeek.setDate(now.getDate() - now.getDay());
                    query += "'" + FirstDayOfWeek.getFullYear() + '-' + (FirstDayOfWeek.getMonth() + 1) + '-' + FirstDayOfWeek.getDate() + "'";
                    query += "AND name = '";
                    query += user_id + "'";
                    query += " ORDER BY 'date' DESC";
                    sql.connection.query(query, function(err, rows, fields)
                    {
                        var html = "";
                        var header = '';
                        var body = '';
                        header += "<meta charset='UTF-8'><title>交通大學鋼琴社琴房預約系統</title><link rel='icon' href='Material/piano_icon.png'>";

                        /*  body    */
                        body += "您欲輸入的名字是"+ user_id;
                        /*  no record found  */
                        if(rows.length == 0) console.log(user_id + " access system with no record found");
                        else    //show booked
                        {
                            console.log(user_id + " access system with " + rows.length + " record found");
                            body += "您目前登記的有: <br>";
                            /*  booked  */
                            body += "<table>";
                            body += "<tr>" + "<td>" + "日期" + "</td>" + "<td>" + "時間" + "</td>" + "<td>" + "房號" + "</td>" + "</tr>";
                            for (var ctr = 0; ctr < rows.length; ++ctr) {
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
                                    body += rows[ctr].time + ":00 AM ~ " + (rows[ctr].time + 1) + ":00 AM";
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
                        /*  point to the selectable form for user   */
                        body += "<table>";
                        body += "<tr>";
                        body += "<td></td>";
                        for(var ctr_day = 0; ctr_day < 7; ++ctr_day)
                        {
                            body += "<td colspan='2'>";
                            if(FirstDayOfWeek.getDate() + ctr_day > days_this_mon)
                            {
                                body += now.getMonth() + 1;
                                body += "/";
                                body += (FirstDayOfWeek.getDate() + ctr_day) - days_this_mon;
                            }
                            else
                            {
                                body += now.getMonth();
                                body += "/";
                                body += FirstDayOfWeek.getDate() + ctr_day;
                            }
                            body += " (";
                            body += day_cht.substring(ctr_day, ctr_day + 1);
                            body += ")";
                            body += "</td>";
                        }
                        body += "</tr>";

                        body += "<tr>";
                        body += "<td></td>";
                        for(var ctr_room = 0; ctr_room < 7; ++ctr_room)
                        {
                            body += "<td>";
                            body += "409";
                            body += "</td>";
                            body += "<td>";
                            body += "417";
                            body += "</td>";
                        }
                        body += "</tr>";

                        for(var ctr_hr = 0; ctr_hr <= 23; ++ctr_hr)
                        {
                            body += "<tr>";
                            body += "<td>";
                            if(ctr_hr < 10) body += "0";
                            body += ctr_hr;
                            body += ":00 ~ ";
                            if(ctr_hr + 1 < 10) body += "0";
                            if(ctr_hr + 1 == 24) body += "00";
                            else body += (ctr_hr + 1);
                            body += ":00";
                            body += "</td>";
                            for(var ctr_day = 0; ctr_day < 7; ++ctr_day)
                            {
                                body += "<td>";
                                body += "</td>";
                            }
                            body += "</tr>";
                        }
                        body += "</table>";


                        html = '<!DOCTYPE html><html lang="zh-Hant">' + '<html><header>' + header + '</header><body>' + body + '</body></html>';
                        /*  print out the page  */
                        res.writeHead(200, {
                            'Content-Type': 'text/html'
                        });
                        res.end(html);
                    });
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
    server.listen(8888, function ()
    {
        console.log('Server running at http://localhost:8888/');
    });
}
exports.start = start;