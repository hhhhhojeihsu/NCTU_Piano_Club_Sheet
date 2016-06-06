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
                        var record = [];
                        var ctr_selected = 0;
                        header += "<meta charset='UTF-8'><title>交通大學鋼琴社琴房預約系統</title><link rel='icon' href='Material/piano_icon.png'>";

                        /*  body    */
                        body += "您欲輸入的名字是"+ user_id;
                        /*  no record found  */
                        if(rows.length == 0)
                        {
                            console.log(user_id + " access system with no record found");
                            body += "您目前並沒有登記任何時段<br>";
                        }
                        else    //show booked
                        {
                            console.log(user_id + " access system with " + rows.length + " record found");
                            body += "您目前登記的有: <br>";
                            /*  booked  */
                            body += "<table>";
                            body += "<tr>" + "<td>" + "日期" + "</td>" + "<td>" + "時間" + "</td>" + "<td>" + "房號" + "</td>" + "</tr>";
                            for (var ctr = 0; ctr < rows.length; ++ctr)
                            {
                                record[ctr] = ParseSqlDateCht(rows[ctr].date + "");
                                body += "<tr>";
                                /*  date    */
                                body += "<td>";
                                body += record[ctr].getFullYear() + "年 ";
                                body += (record[ctr].getMonth() + 1).pad() + "月 ";
                                body += record[ctr].getDate().pad() + "號 禮拜";
                                body += day_cht.substring(record[ctr].getDay(), record[ctr].getDay() + 1);
                                body += "</td>";
                                /*  time    */
                                body += "<td>";
                                if (rows[ctr].time >= 12)
                                {
                                    if (rows[ctr].time != 12) body += (rows[ctr].time - 12).pad() + ":00 PM ~ " + (rows[ctr].time - 11).pad() + ":00 PM";
                                    else body += rows[ctr].time.pad() + ":00 PM ~ 01:00 PM";
                                }
                                else
                                {
                                    body += rows[ctr].time.pad() + ":00 AM ~ " + (rows[ctr].time + 1).pad() + ":00 AM";
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
                        body += "<br>";
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
                                body += now.getMonth() + 1;
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

                        body += "<form>";
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
                            for(var ctr_day = 0; ctr_day < 14; ++ctr_day)
                            {
                                body += "<td>";
                                body += "<input type='checkbox' name='";
                                body += ctr_day;
                                body += "_";
                                body += ctr_hr;
                                body += "' value='";
                                body += ctr_day;
                                body += "_";
                                body += ctr_hr;
                                body += "'";
                                //TODO: IF SELECTED
                                if(rows.length !== 0 && ctr_selected < rows.length)
                                {
                                    if(ctr_hr === rows[ctr_selected].time && ctr_day % 2 === rows[ctr_selected].room && FirstDayOfWeek.getDate() + Math.floor(ctr_day /2) === record[ctr_selected].getDate())
                                    {
                                        body += "checked";
                                        ++ctr_selected;
                                    }
                                }
                                body += ">";
                                body += "</td>";
                            }
                            body += "</tr>";
                        }
                        //TODO: INPUT BUTTON
                        body += "</form>";
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

function ParseSqlDateCht(input)
{
    var string = "";
    var date_obj = new Date();
    var month = {
        0: "Jan",
        1: "Feb",
        2: "May",
        3: "Apr",
        4: "Mar",
        5: "Jun",
        6: "Jul",
        7: "Aug",
        8: "Sep",
        9: "Oct",
        10: "Nov",
        11: "Dec"};
    /*  get Month */
    string = input.substring(4, 7);
    for(var ctr_mon = 0; ctr_mon < 12; ++ctr_mon)
    {
        if(input === month[ctr_mon])
        {
            date_obj.setMonth(ctr_mon);
            break;
        }
    }
    /*  get date    */
    date_obj.setDate(Number(input.substring(8, 10)));
    /*  get year    */
    date_obj.setFullYear(Number(input.substring(11, 15)));
    return date_obj;
}

/*	add leading zeroes	*/
Number.prototype.pad = function(size)
{
    var s = String(this);
    while (s.length < (size || 2)) s = "0" + s;
    return s;
}


exports.start = start;