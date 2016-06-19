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
            sql.connection.query("SELECT * FROM users", function (err, rows, fields){
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
                    var days_this_mon = ((new Date(now.getFullYear(), now.getMonth() + 1, 1)) - (new Date(now.getFullYear(), now.getMonth(), 1)))/60/60/24/1000;	//how many days
                    FirstDayOfWeek.setDate(now.getDate() - now.getDay());
                    var query_esc_date = FirstDayOfWeek.getFullYear() + '-' + (FirstDayOfWeek.getMonth() + 1) + '-' + FirstDayOfWeek.getDate() + "'";
                    var query_esc_name = user_id;
                    sql.connection.query("SELECT * FROM schedule WHERE date >= ? AND name = ? ORDER BY date ASC, time ASC, room ASC", [query_esc_date, query_esc_name], function(err, rows, fields)
                    {
                        if(err) throw err;
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
                        sql.connection.query("SELECT * FROM schedule WHERE date >= ? AND name != ? ORDER BY time ASC, date ASC, room ASC", [query_esc_date, query_esc_name], function(err, rows_oth, fields){
                            if(err) throw err;
                            //resort the array
                            rows.sort(function(a, b){
                                if(a.time > b.time) return 1;
                                else if(a.time === b.time)
                                {
                                    if(a.date > b.date) return 1;
                                    else if(a.date === b.date)
                                    {
                                        if(a.room > b.room) return 1;
                                        else return -1;
                                    }
                                    else return -1;
                                }
                                else return -1;
                            });
                            /*  parsing other users */
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

    //TODO: Database Primary Key Overflow
    function UserQuery(req, res)
    {
        var changes = {
            add: [],
            min: [],
            error: []
        };
        var now = new Date();
        var FirstDayOfWeek = new Date();
        FirstDayOfWeek.setDate(now.getDate() - now.getDay());
        var form = new formidable.IncomingForm();
        var fields = [];
        form.on('field', function(field, value){
            fields.push(value);
        });

        form.on('end', function(){
            //NOTE THAT THE FIRST ONE IN ARRAY IS USER NAME
            var query = ParseCheckbox(fields);
            query.sort(function(a, b){
                if(a[0] > b[0]) return 1;
                else if(a[0] === b[0])
                {
                    if(a[1] > b[1]) return 1;
                    else if(a[1] === b[1])
                    {
                        if(a[2] > b[2]) return 1;
                        else return -1;
                    }
                    else return -1;
                }
                else return -1;
            });
            var query_origin_date = FirstDayOfWeek.getFullYear() + '-' + (FirstDayOfWeek.getMonth() + 1) + '-' + FirstDayOfWeek.getDate();
            var query_origin_name = fields[0];
            //reference: http://stackoverflow.com/questions/750486/javascript-closure-inside-loops-simple-practical-example
            sql.connection.query("SELECT * from schedule WHERE date >= ? AND name = ? ORDER BY date ASC, time ASC, room ASC", [query_origin_date, query_origin_name], function(err, rows_origin, fields_origin){
                if(err) throw err;
                var rows_origin_parsed_date_only = [];
                var chk_ptr = 0;
                var rows_orgin_marker = [];
                for(var ctr_marker = 0; ctr_marker < rows_origin.length; ++ctr_marker)
                {
                    rows_orgin_marker[ctr_marker] = false;
                }
                for(var ctr_origin = 0; ctr_origin < rows_origin.length; ++ctr_origin)
                {
                    rows_origin_parsed_date_only[ctr_origin] = ParseSqlDateCht(rows_origin[ctr_origin].date + "");
                }

                query.forEach(function(element, index, array){
                    /*  compare with data on sql    */
                    //refrence: http://stackoverflow.com/questions/7244513/javascript-date-comparisons-dont-equal
                    while(
                    chk_ptr < rows_origin.length &&
                        (rows_origin_parsed_date_only[chk_ptr] < element[0] || (rows_origin_parsed_date_only[chk_ptr].getTime() === element[0].getTime() && rows_origin[chk_ptr].time < element[1]) || (rows_origin_parsed_date_only[chk_ptr].getTime() === element[0].getTime() && rows_origin[chk_ptr].time === element[1] && rows_origin[chk_ptr].room < element[2]))
                    )
                    {
                        console.log(rows_origin_parsed_date_only[chk_ptr]);
                        ++chk_ptr;
                    }
                    //the record remain unchanged
                    if(
                        chk_ptr < rows_origin.length &&
                        (rows_origin_parsed_date_only[chk_ptr].getFullYear() === element[0].getFullYear() &&
                        rows_origin_parsed_date_only[chk_ptr].getMonth() === element[0].getMonth() &&
                        rows_origin_parsed_date_only[chk_ptr].getDate() === element[0].getDate() &&
                        rows_origin[chk_ptr].time === element[1] &&
                        rows_origin[chk_ptr].room === element[2])
                    )
                    {
                        rows_orgin_marker[chk_ptr] = true;
                        ++chk_ptr;
                        //reference: http://stackoverflow.com/questions/18452920/continue-in-cursor-foreach
                        if(index === array.length - 1)
                        {
                            changes = DeleteFromDb(rows_origin, rows_orgin_marker, rows_origin_parsed_date_only, changes, fields, res);
                            console.log("Caller 1");
                        }
                        return true;
                    }

                    var qry_esc_date = element[0].getFullYear() + "-" + (element[0].getMonth() + 1) + "-" + element[0].getDate();
                    var qry_esc_time = element[1];
                    var qry_esc_room = element[2];
                    sql.connection.query("SELECT `name` from `schedule` WHERE `date` = ? AND `time` = ? AND `room` = ?", [qry_esc_date, qry_esc_time, qry_esc_room],function(err, rows_chk, fields_func){
                        if(err) throw err;
                        var sql_str_wirtten_esacpe_obj = {
                            date: element[0].getFullYear() + "-" + (element[0].getMonth() + 1) + "-" + element[0].getDate(),
                            time: Number(element[1]),
                            room: Number(element[2]),
                            name: fields[0]
                        };
                        //no record found -> force write
                        if(rows_chk.length === 0)
                        {
                            sql.connection.query("INSERT INTO `schedule` SET ?", sql_str_wirtten_esacpe_obj,function(err, rows_sql_str_written, fields_func){
                                if(err) throw err;
                                console.log(this.sql);
                                changes.add.push(sql_str_wirtten_esacpe_obj);
                                //refrence: http://stackoverflow.com/questions/29738535/catch-foreach-last-iteration
                                if(index === array.length - 1)
                                {
                                    changes = DeleteFromDb(rows_origin, rows_orgin_marker, rows_origin_parsed_date_only, changes, fields, res);
                                    console.log("Caller 2");
                                }
                            });
                        }
                        //check if name is not the same as the one
                        else if(rows_chk[0].name !== fields[0])
                        {
                            //ERROR: THIS SPACE IS RESERVED BY OTHERS
                            changes.error.push(sql_str_wirtten_esacpe_obj);
                            console.log("INSERT INTO `schedule` SET date = " + (element[0].getFullYear() + "-" + (element[0].getMonth() + 1) + "-" + element[0].getDate()) + " date = " + element[1] + " room = " + element[2] + " Failed");
                            if(index === array.length - 1)
                            {
                                changes = DeleteFromDb(rows_origin, rows_orgin_marker, rows_origin_parsed_date_only, changes, fields, res);
                                console.log("Caller 3");
                            }
                        }
                        //if the name is the recived one then do nothing
                        else
                        {
                            if(index === array.length - 1)
                            {
                                changes = DeleteFromDb(rows_origin, rows_orgin_marker, rows_origin_parsed_date_only, changes, fields, res);
                                console.log("Caller 4");
                            }
                        }
                    });
                });
                if(query.length === 0)
                {
                    changes = DeleteFromDb(rows_origin, rows_orgin_marker, rows_origin_parsed_date_only, changes, fields, res);
                    console.log("Caller 5");
                }
            });
        });

        form.parse(req);
    }

server.listen(8888, function(){
    console.log('Server running at http://localhost:8888/');
});
}

//DeleteFromDb is the last asynchrnous function called before respond
//Due to the asynchrnous problem
function DeleteFromDb(rows_origin, rows_orgin_marker, rows_origin_parsed_date_only, changes, fields, res)
{
    for(var ctr_clear = 0; ; ++ctr_clear)
    {
        if(ctr_clear === rows_origin.length)
        {
            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            res.end(BuildHtmlResult(changes));
            return changes;
        }
        if(rows_orgin_marker[ctr_clear]) continue;
        changes.min.push({
            date: rows_origin_parsed_date_only[ctr_clear].getFullYear() + "-" + (rows_origin_parsed_date_only[ctr_clear].getMonth() + 1) + "-" + rows_origin_parsed_date_only[ctr_clear].getDate(),
            time: rows_origin[ctr_clear].time,
            room: rows_origin[ctr_clear].room,
            name: fields[0]
        });
        sql.connection.query("DELETE FROM `schedule` WHERE `id` = ?", rows_origin[ctr_clear].id, function(err, rows_query_del, fields_func){
            if (err) throw err;
            console.log(this.sql);
        });
    }
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
    date_obj.setHours(0, 0, 0, 0);  //set the time to, to make date object comparison accurate
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
        FirstDayOfWeek.setDate(now.getDate() - now.getDay());
        var date_temp = FirstDayOfWeek;
        date_temp.setHours(0, 0, 0, 0);
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

function BuildHtmlResult(array_obj)
{
    var head = "";
    var body = "";
    var footer = "";


    function draw(sub_arr)
    {
        var string_draw  = "";
        string_draw += "<table>";
        string_draw += "<tr><td>日期</td><td>時間</td><td>琴房</td></tr>";
        for(var ctr = 0; ctr < sub_arr.length; ++ctr)
        {
            var l_pos = 0;
            string_draw += "<tr>";
            string_draw += "<td>";
            string_draw += sub_arr[ctr].date.substring(l_pos = sub_arr[ctr].date.indexOf("-", 0) + 1, l_pos = sub_arr[ctr].date.indexOf("-", l_pos));
            string_draw += "/";
            string_draw += sub_arr[ctr].date.substring(l_pos = sub_arr[ctr].date.indexOf("-", l_pos) + 1, sub_arr[ctr].date.length);
            string_draw += "</td>";
            string_draw += "<td>";
            if(sub_arr[ctr].time < 10) string_draw += "0";
            string_draw += sub_arr[ctr].time;
            string_draw += ":00 ~ ";
            if(sub_arr[ctr].time + 1 < 10) string_draw += "0";
            if(sub_arr[ctr].time + 1 == 24) string_draw += "00";
            else string_draw += (sub_arr[ctr].time + 1);
            string_draw += ":00";
            string_draw += "</td>";
            string_draw += "<td>";
            if(!sub_arr[ctr].room) string_draw += "409";
            else string_draw += "417";
            string_draw += "</td>";
            string_draw += "</tr>";
        }
        string_draw += "</table>";
        return string_draw;
    }

    /*  head    */
    head += "<meta charset='UTF-8'>";
    head += "<title>交通大學鋼琴社琴房預約系統</title>";


    /*  body    */
    if(array_obj.add.length === 0 && array_obj.min.length === 0 && array_obj.error.length === 0)
    {
        body += "甚麼事情都沒有發生0.0";
    }
    else body += "此次變動<br>";
    //addition part
    console.log(array_obj);
    if(array_obj.add.length !== 0)
    {
        body += "新增的有:\n";
        body += draw(array_obj.add);
    }
    //deletion part
    if(array_obj.min.length !== 0)
    {
        body += "刪除的有:\n"
        body += draw(array_obj.min);
    }
    if(array_obj.error.length !== 0)
    {
        body += "錯誤的有(你動作太慢這格被別人搶走了QQ):\n"
        body += draw(array_obj.err);
    }
    //TODO: ERROR PART
    return "<!DOCTYPE html>\n<html lang='zh-Hant'>" +  "<head>" + head + "</head>" + "<body>" + body + "</body>" + "<footer>" + footer + "</footer>" + "</html>";
}

exports.start = start;
