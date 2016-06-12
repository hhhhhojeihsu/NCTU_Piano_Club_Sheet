"use strict";

var sql = require('./sql');

function start(){
    var express = require('express');
    var bodyParser = require('body-parser');
    var fs = require('fs');
    var formidable = require("formidable");
    var util = require('util');
    var server = express();
    server.use(bodyParser.urlencoded({extended: true}));
    server.post('/process', function(req, res){
        UserPageProcess(req, res);
    });
    server.post('/process_user', function(req, res){
        UserQuery(req, res);
    });

    function UserPageProcess(req, res){
        //Store the data from the fields in your data store.
        //The data store could be a file or database or any other store based
        //on your application.
        var fields = [];
        var form = new formidable.IncomingForm();
        form.on('field', function(field, value){
            fields[field] = value;
        });

        form.on('end', function (){
            /*  mysql   */
            //search user name
            var user_name = fields['user_id'];
            var user_pass = fields['user_pass'];
            var user_id = fields['user_name'];
            sql.connection.query("SELECT * FROM users", function (err, rows, fields)
            {
                if(err) throw err;
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
                if(counter === 2)
                {
                    var now = new Date();
                    var FirstDayOfWeek = new Date();
                    var day_cht = "日一二三四五六日";
                    var query = "SELECT * FROM schedule WHERE date >= ";
                    var query_oth = "";
                    var days_this_mon = ((new Date(now.getFullYear(), now.getMonth() + 1, 1)) - (new Date(now.getFullYear(), now.getMonth(), 1)))/60/60/24/1000;	//how many days
                    FirstDayOfWeek.setDate(now.getDate() - now.getDay());
                    query += "'" + FirstDayOfWeek.getFullYear() + '-' + (FirstDayOfWeek.getMonth() + 1) + '-' + FirstDayOfWeek.getDate() + "'";
                    query_oth = query;
                    query += " AND name = '";
                    query_oth += " AND name != '";
                    query += user_id + "'";
                    query_oth += user_id + "'";
                    query += " ORDER BY date ASC, time ASC";
                    query_oth += " ORDER BY time ASC, date ASC";
                    sql.connection.query(query, function(err, rows, fields)
                    {
                        var html = "";
                        var header = '';
                        var body = '';
                        var record = [];
                        var ctr_selected = 0;
                        var ctr_oth_not_selected = 0;
                        header += "<meta charset='UTF-8'><title>交通大學鋼琴社琴房預約系統</title><link rel='icon' href='Material/piano_icon.png'>";
                        header += "<script type='text/javascript' src='http://localhost:63342/NCTU_Piano_Club_Sheet/Front_End/form_valid.js'></script>";
                        /*  body    */
                        body += "您欲輸入的名字是'"+ user_id + "' ";
                        /*  no record found  */
                        if(rows.length == 0)
                        {
                            console.log(user_id + " access system with no record found");
                            body += "您目前並沒有登記任何時段<br>";
                        }
                        else    //show booked
                        {
                            console.log(user_id + " access system with " + rows.length + " record found");
                            body += "您目前登記的有: <br><br>";
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

                        sql.connection.query(query_oth, function(err, rows_oth, fields){

                            /*  parsing other users */
                            //resort the array
                            rows.sort(function(a, b){
                                if(a.time > b.time) return 1;
                                else if(a.time === b.time)
                                {
                                    if(a.date > b.time) return 1;
                                    else return -1;
                                }
                                else return -1;
                            });
                            for(var ctr_self_sort = 0; ctr_self_sort < rows.length; ++ctr_self_sort)
                            {
                                record[ctr_self_sort] = ParseSqlDateCht(rows[ctr_self_sort].date + "");
                            }


                            var record_oth = [];
                            for(var ctr_rec_oth = 0; ctr_rec_oth < rows_oth.length; ++ctr_rec_oth)
                            {
                                record_oth[ctr_rec_oth] = ParseSqlDateCht(rows_oth[ctr_rec_oth].date + "");
                            }

                            /*  point to the selectable form for user   */
                            body += "<table>";
                            body += "<form action='http://localhost:8888/process_user' onsubmit='return validateForm()' method='POST' enctype='multipart/form-data' name='user_form' id='user_form'>";
                            body += "<input style='display: none;' type='text' id='hid_user' name='hid_user' value='";
                            body += user_id;
                            body += "' required >";
                            body += "<tr><td colspan='8'>每週最多八個時段 每天最多三個時段</td></tr>";
                            body += "<tr>";
                            body += "<td></td>";
                            for(var ctr_day = 0; ctr_day < 7; ++ctr_day)
                            {
                                body += "<td colspan='2'>";
                                if (FirstDayOfWeek.getDate() + ctr_day > days_this_mon)
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
                                    /*  TODO: CROSS MONTH BUG   */
                                    body += "<td>";
                                    if(ctr_oth_not_selected >= rows_oth.length || ctr_hr !== rows_oth[ctr_oth_not_selected].time || ctr_day % 2 !== rows_oth[ctr_oth_not_selected].room || FirstDayOfWeek.getDate() + Math.floor(ctr_day / 2) !== record_oth[ctr_oth_not_selected].getDate())
                                    {
                                        body += "<input type='checkbox' name='";
                                        body += "c";
                                        body += Math.floor(ctr_day / 2);
                                        body += "_";
                                        body += ctr_hr;
                                        body += "_";
                                        body += ctr_day % 2;
                                        body += "' value='";
                                        body += "c";
                                        body += Math.floor(ctr_day / 2);
                                        body += "_";
                                        body += ctr_hr;
                                        body += "_";
                                        body += ctr_day % 2;
                                        body += "'";
                                        if(rows.length !== 0 && ctr_selected < rows.length)
                                        {
                                            if(ctr_hr === rows[ctr_selected].time && ctr_day % 2 === rows[ctr_selected].room && FirstDayOfWeek.getDate() + Math.floor(ctr_day / 2) === record[ctr_selected].getDate())
                                            {
                                                body += "checked";
                                                ++ctr_selected;
                                            }
                                        }
                                        body += ">";
                                    }
                                    else ++ctr_oth_not_selected;
                                    body += "</td>";
                                }
                                body += "</tr>";
                            }
                            body += "<tr><td><input type='submit' value='送出'></td>";
                            body += "</form>";
                            body += "</table>";

                            html = '<!DOCTYPE html><html lang="zh-Hant">' + '<html><header>' + header + '</header><body>' + body + '</body></html>';
                            /*  print out the page  */
                            res.writeHead(200, {
                                'Content-Type': 'text/html'
                            });
                            res.end(html);
                        });
                    });
                }
                /*  login failed    */
                else
                {
                    console.log("Attempt failed with User: " + user_name + " Pass: " + user_pass + " detected");
                    res.redirect('http://localhost:63342/NCTU_Piano_Club_Sheet/Front_End/Fail.html');
                    res.end();
                }
            });
        });
        form.parse(req);
    }

    function UserQuery(req, res)
    {

        var form = new formidable.IncomingForm();
        var fields = [];
        form.on('field', function(field, value){
            fields.push(value);
        });

        form.on('end', function(){
            //NOTE THAT THE FIRST ONE IN ARRAY IS USER NAME
            var query = ParseCheckbox(fields);
            //reference: http://stackoverflow.com/questions/750486/javascript-closure-inside-loops-simple-practical-example
            query.forEach(function(element){
                var qry_str = "SELECT name from schedule WHERE date = '";
                qry_str += element[0].getFullYear() + "-" + (element[0].getMonth() + 1) + "-" + element[0].getDate();
                qry_str += "'";
                qry_str += "AND time = ";
                qry_str += element[1];
                qry_str += " AND room = ";
                qry_str += element[2];
                sql.connection.query(qry_str, function(err, rows_chk, fields_func){
                    //no record found
                    if(rows_chk.length === 0)
                    {
                        var sql_str_written = "INSERT INTO 'info'.'schedule'('date', 'time', 'room', 'name') VALUES('";
                        sql_str_written += element[0].getFullYear() + "-" + (element[0].getMonth() + 1) + "-" + element[0].getDate();
                        sql_str_written += "', '";
                        sql_str_written += element[1];
                        sql_str_written += "', '";
                        sql_str_written += element[2];
                        sql_str_written += "', '";
                        sql_str_written += fields[0];
                        sql_str_written += "')";
                        console.log(element);
                        console.log(sql_str_written);
                    }
                    //check if name is not the same as the one
                    else if(rows_chk[0].name !== fields[0])
                    {

                    }
                    //if the name is the recived one then do nothing
                });
            });
        });

        form.parse(req);
    }


    server.listen(8888, function(){
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
};


/*  parsing checkbox content    */
//input is an array with field
function ParseCheckbox(input)
{

    var res = [];
    //NOTE THAT THE FIRST ONE IN 'input' ARRAY IS USER NAME
    for(var ctr_all = 1; ctr_all < input.length; ++ctr_all)
    {
        var temp = [];
        var now = new Date();
        var FirstDayOfWeek = new Date();
        var days_this_mon = ((new Date(now.getFullYear(), now.getMonth() + 1, 1)) - (new Date(now.getFullYear(), now.getMonth(), 1)))/60/60/24/1000;	//how many days
        FirstDayOfWeek.setDate(now.getDate() - now.getDay());
        var date_temp = FirstDayOfWeek;
        var time_temp = 0;
        var room_temp = 0;
        var string = input[ctr_all] + "";
        var pos_l = 1;
        var pos_r = pos_l + 1;
        date_temp.setDate(date_temp.getDate() + Number(string.substring(pos_l, pos_r)));
        pos_l = pos_r + 1;
        pos_r = string.indexOf("_", pos_l);
        time_temp = Number(string.substring(pos_l, pos_r));
        pos_l = pos_r + 1;
        room_temp = Number(string.substring(pos_l, pos_l + 1));
        temp[0] = date_temp;
        temp[1] = time_temp;
        temp[2] = room_temp;
        res[ctr_all - 1] = temp;
    }
    return res;
}

exports.start = start;
