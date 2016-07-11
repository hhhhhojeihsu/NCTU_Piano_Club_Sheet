"use strict";

/*  requried module */
var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var formidable = require("formidable");
var util = require('util');
var path = require("path");
var sql = require('./sql');


/*  MODE SELECTION
    1 for openshift mode and 0 for localhost mode
    //NOTE THAT THE MODE IN sql.js need to be changed as well
 */
var mode_selection = 1;

/*  mode related variable   */
var ip_address_re_ = mode_selection ? 'http://nodejs-wwwworkspace.rhcloud.com/' : 'http://localhost:8888/';
var ip_address_local_ = mode_selection ? process.env.OPENSHIFT_NODEJS_IP : '127.0.0.1';
var port_ = mode_selection ? process.env.OPENSHIFT_NODEJS_PORT : '8888';

/*  global variable */
var redirect_2_front_page = "<a href=" + ip_address_re_ + ">點此返回首頁</a>";


/*  time variable   */
//default time is set to now, can be modify to debug
function getnow()
{
    //CHANGE THIS LINE TO MODIFY THE CURRENT TIME FOR DEBUG
    var d = new Date();
    //prevent timezone error and SET TO GMT+8
    if((d.getHours() + (d.getTimezoneOffset() / 60) + 8) >= 24) //jump to next day
    {
        d.setDate(d.getDate() + 1);
    }
    d.setHours((d.getUTCHours() + 8) % 24);
    return d;
}


function start(){


    var server = express();
    server.use(bodyParser.urlencoded({extended: true}));
    /*  modify the index.html base on mode  */
    change_html_path('index.html');
    change_html_path('fail.html');
    //Front End File by using get
    //reference: http://stackoverflow.com/questions/20322480/express-js-static-relative-parent-directory
    server.use(express.static(path.join(__dirname, '..', 'Front_End')));

    /*  home page */
    //reference: http://stackoverflow.com/a/24308957/6007708
    server.get('/', function(req, res)
    {
        fs.readFile(path.join(__dirname, '..', 'index.html'), function(err, html)
        {
            if(err) throw err;
            res.writeHead(200,{"Content-Type": "text/html"});
            res.write(html);
            res.end();
        });
    });

    /*  processing page transfering using POST    */
    //generate user's and administrator's selectable page
    server.post('/process', function(req, res){
        UserPageProcess(req, res);
    });
    //process data sent by user
    server.post('/process_user', function(req, res){
        UserQuery(req, res);
    });
    //process data sent by administrator
    server.post('/process_admin', function(req, res){
        AdminQuery(req, res);
    });

    //reference: http://stackoverflow.com/a/6528951/6007708
    /*  404 handler */
    server.get('*', function(req, res)
    {
        var err = new Error('404 Not Found');
        err.status = 404;
        res.send(err.message);
    });

    function UserPageProcess(req, res){
        /*  process incoming data by using "formidable" */
        var fields = [];
        var form = new formidable.IncomingForm();
        form.on('field', function(field, value){
            fields[field] = value;
        });

        form.on('end', function (){
            /*  change variation to prevent scope problem   */
            var user_name = fields['user_id'];
            var user_pass = fields['user_pass'];
            var user_id = fields['user_name'] + "";
            //the name is stored by varchar(45) on database, deal with the exception
            if(user_id.length > 44)
            {
                res.writeHead(200, {
                    'Content-Type': 'text/html'
                });
                res.end(BuildNameError());
                ;
            }
            else
            {
                /*  detect user */
                //three user in total -> 0: su, 1: admin, 2: user
                sql.connection.query("SELECT * FROM users", function (err, rows, fields){
                    if(err) throw err;
                    for (var counter = 0; counter < rows.length; ++counter)
                    {
                        //detect user
                        if (rows[counter].user_name === user_name && rows[counter].user_password === user_pass)
                        {
                            console.log("Users: " + rows[counter].user_name + " with Pass: " + rows[counter].user_password + " activity detected");
                            break;
                        }
                    }
                    /*  admin mode  */
                    if(counter === 1)
                    {
                        //starting of this week
                        var now = getnow();
                        var FirstDayOfWeek = getFirstDayOfWeek();
                        var day_cht = "日一二三四五六日";
                        var days_this_mon = getdays_this_mon();
                        var query_esc_date = FirstDayOfWeek.getFullYear() + '-' + (FirstDayOfWeek.getMonth() + 1) + '-' + FirstDayOfWeek.getDate() + "'";
                        //get all the field this week
                        sql.connection.query("SELECT * FROM schedule WHERE date >= ? ORDER BY time ASC, date ASC, room ASC", [query_esc_date], function(err, rows, fields){
                            if(err) throw err;
                            /*  variable used for generating html  */
                            var html = "";
                            var head = '';
                            var body = '';
                            head += "<meta charset='UTF-8'><title>交通大學鋼琴社琴房預約系統</title><link rel='icon' href='Material/piano_icon.png'>";
                            head += "<link rel='stylesheet' href='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css' integrity='sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7' crossorigin='anonymous'>";
                            head += "<link rel='stylesheet' type='text/css' href='" + ip_address_re_ + "Style_user.css'>";
                            head += "<script type='text/javascript' src='" + ip_address_re_ + "form_valid.js'></script>";
                            body += "你現在在Administrator模式，可以任意更改與觀看本周所有的資料。'除非必要不然不應任意更改'。<br>預設也會檢驗填入資料，若有需要保留琴房供特殊使用且超出預設限制，請換一個名字填入表格";
                            var arr_pos = 0;    //pointer point to which field to be print
                            /*  generating table    */
                            body += "<table class='table1'>";
                            body += "<form action='" + ip_address_re_ + "process_admin' onsubmit='return validateForm_admin()' method='POST' enctype='multipart/form-data' name='admin_form' id='admin_form'>";    //data is sent to process_admin
                            body += "<thead>";
                            body += "<tr><td colspan='15'>每週最多八個時段 每天最多三個時段</td></tr>";
                            body += "<tr>";
                            body += "<td></td>";
                            /*  7 days in total */
                            for(var ctr_day = 0; ctr_day < 7; ++ctr_day)
                            {
                                body += "<th colspan='2'>";
                                //prevent cross month problem
                                if (FirstDayOfWeek.getDate() + ctr_day > days_this_mon)
                                {
                                    //cross year
                                    body += FirstDayOfWeek.getMonth() + 2 !== 13 ? FirstDayOfWeek.getMonth() + 2 : 1;
                                    body += "/";
                                    body += (FirstDayOfWeek.getDate() + ctr_day) - days_this_mon;
                                }
                                else
                                {
                                    body += FirstDayOfWeek.getMonth() + 1;
                                    body += "/";
                                    body += FirstDayOfWeek.getDate() + ctr_day;
                                }
                                //days
                                body += " (";
                                body += day_cht.substring(ctr_day, ctr_day + 1);
                                body += ")";
                                body += "</th>";
                            }
                            body += "</tr>";

                            /*  generating room number  */
                            body += "<tr>";
                            body += "<td></td>";
                            for(var ctr_room = 0; ctr_room < 7; ++ctr_room)
                            {
                                body += "<th>";
                                body += "409";
                                body += "</th>";
                                body += "<th>";
                                body += "417";
                                body += "</th>";
                            }
                            body += "</tr>";
                            body += "</thead>";
                            body += "<tfoot>";
                            body += "<tr><td><input class='btn btn-primary' type='submit' value='送出'></td>";
                            body += "</tfoot>";
                            body += "<tbody>";
                            /*  generating each hour row by row */
                            for(var ctr_hr = 0; ctr_hr <= 23; ++ctr_hr)
                            {
                                body += "<tr>";
                                /*  fixed time  */
                                //TODO: USE PADDING NUMBER FUNCTION INSTEAD OF STATEMENT
                                body += "<td>";
                                if(ctr_hr < 10) body += "0";
                                body += ctr_hr;
                                body += ":00 ~ ";
                                if(ctr_hr + 1 < 10) body += "0";
                                if(ctr_hr + 1 == 24) body += "00";
                                else body += (ctr_hr + 1);
                                body += ":00";
                                body += "</td>";
                                /*  generating input field  */
                                //TODO: USE 7 DAYS 2 ROOM INSTEAD OF 14 DAYS AND PARSING
                                for(var ctr_day = 0; ctr_day < 14; ++ctr_day)
                                {
                                    //reference: http://stackoverflow.com/questions/6609574/javascript-date-variable-assignment
                                    var date_obj = new Date(FirstDayOfWeek);
                                    date_obj.setDate(FirstDayOfWeek.getDate() + Math.floor(ctr_day / 2));
                                    body += "<td>";
                                    body += "<input type='text' size='5' name='";   //fixed the size of input field
                                    /*  name of each input box  */
                                    body += "c";
                                    body += Math.floor(ctr_day / 2);
                                    body += "_";
                                    body += ctr_hr;
                                    body += "_";
                                    body += ctr_day % 2;
                                    //value acquire from database
                                    body += "' value='";
                                    if(arr_pos < rows.length && rows[arr_pos].time === ctr_hr && rows[arr_pos].date.getDate() === date_obj.getDate() && (ctr_day % 2) === rows[arr_pos].room)
                                    {
                                        body += rows[arr_pos].name;
                                        ++arr_pos;
                                    }
                                    body += "'";
                                    body += ">";
                                    body += "</td>";
                                }
                                body += "</tr>";
                            }
                            body += "</tbody>";
                            body += "</tr>";
                            body += "</form>";
                            body += "</table>";

                            /*  print out the page  */
                            html = '<!DOCTYPE html><html lang="zh-Hant">' + '<html><head>' + head + '</head><body>' + body + '</body></html>';
                            res.writeHead(200, {
                                'Content-Type': 'text/html'
                            });
                            res.end(html);
                        });

                    }
                    /*  user mode   */
                    else if(counter === 2)
                    {
                        /*  variable the store the starting of the week    */
                        var now = getnow();
                        var FirstDayOfWeek = getFirstDayOfWeek();
                        var day_cht = "日一二三四五六日";
                        var days_this_mon = getdays_this_mon();
                        /*  variable save to prevent sql injection  */
                        var query_esc_date = FirstDayOfWeek.getFullYear() + '-' + (FirstDayOfWeek.getMonth() + 1) + '-' + FirstDayOfWeek.getDate() + "'";
                        var query_esc_name = user_id;
                        /*  get data from sql server where name is provided from last page   */
                        //not that the array is sort by date time then room
                        sql.connection.query("SELECT * FROM schedule WHERE date >= ? AND name = ? ORDER BY date ASC, time ASC, room ASC", [query_esc_date, query_esc_name], function(err, rows, fields)
                        {
                            if(err) throw err;  //exception, no handling though
                            /*  variable generating html    */
                            var html = "";
                            var head = '';
                            var body = '';
                            var ctr_selected = 0;   //pointer to current user name's record on database
                            var ctr_oth_not_selected = 0;   //pointer to other user's appointment on database
                            head += "<meta charset='UTF-8'><title>交通大學鋼琴社琴房預約系統</title><link rel='icon' href='Material/piano_icon.png'>";
                            head += "<link rel='stylesheet' href='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css' integrity='sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7' crossorigin='anonymous'>";
                            head += "<link rel='stylesheet' type='text/css' href='" + ip_address_re_ + "Style_user.css'>";
                            head += "<script type='text/javascript' src='" + ip_address_re_ + "form_valid.js'></script>";
                            /*  body    */
                            body += "您欲輸入的名字是'"+ user_id + "' ";
                            /*  no record found  */
                            if(rows.length == 0)
                            {
                                console.log(user_id + " access system with no record found");
                                body += "您目前並沒有登記任何時段<br>";
                            }
                            else    //show booked in a table
                            {
                                console.log(user_id + " access system with " + rows.length + " record found");
                                body += "您目前登記的有: <br><br>";
                                /*  booked  */
                                body += "<div id='booked'>";
                                body += "<table class='table1'>";
                                body += "<thead>";
                                body += "<tr>" + "<th>" + "日期" + "</th>" + "<th>" + "時間" + "</th>" + "<th   >" + "房號" + "</th>" + "</tr>";
                                body += "</thead>";
                                body += "<tbody>";
                                for(var ctr = 0; ctr < rows.length; ++ctr)
                                {
                                    body += "<tr>";
                                    /*  date    */
                                    body += "<td>";
                                    body += rows[ctr].date.getFullYear() + "年 ";
                                    body += (rows[ctr].date.getMonth() + 1).pad() + "月 ";
                                    body += rows[ctr].date.getDate().pad() + "號 禮拜";
                                    body += day_cht.substring(rows[ctr].date.getDay(), rows[ctr].date.getDay() + 1);
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
                                body += "</tbody>";
                                body += "</table>";
                                body += "</div>";
                            }

                            body += "<br>";

                            /*  get all data this week except the user himself  */
                            //the array is sort by time, date then room
                            sql.connection.query("SELECT * FROM schedule WHERE date >= ? AND name != ? ORDER BY time ASC, date ASC, room ASC", [query_esc_date, query_esc_name], function(err, rows_oth, fields){
                                if(err) throw err;
                                //resort the array because the array is row-based
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
                                /*  point to the selectable form for user   */
                                body += "<div id='select_menu'>";
                                body += "<table class='table1'>";
                                body += "<form action='" + ip_address_re_ + "process_user' onsubmit='return validateForm_user()' method='POST' enctype='multipart/form-data' name='user_form' id='user_form'>";  //collected data is sent to process_user
                                //create a hidden input box that stored user name passed from the main page
                                body += "<input style='display: none;' type='text' id='hid_user' name='hid_user' value='";
                                body += user_id;
                                body += "' required >";
                                body += "<thead>";
                                body += "<tr><td colspan='15'>每週最多八個時段 每天最多三個時段</td></tr>";
                                body += "<tr>";
                                body += "<td style='border-bottom: 0'></td>";
                                /*  generate date label */
                                for(var ctr_day = 0; ctr_day < 7; ++ctr_day)
                                {
                                    body += "<th colspan='2'>";
                                    if (FirstDayOfWeek.getDate() + ctr_day > days_this_mon)
                                    {
                                        body += FirstDayOfWeek.getMonth() + 2 !== 13 ? FirstDayOfWeek.getMonth() + 2 : 1
                                        body += "/";
                                        body += (FirstDayOfWeek.getDate() + ctr_day) - days_this_mon;
                                    }
                                    else
                                    {
                                        body += FirstDayOfWeek.getMonth() + 1;
                                        body += "/";
                                        body += FirstDayOfWeek.getDate() + ctr_day;
                                    }
                                    body += " (";
                                    body += day_cht.substring(ctr_day, ctr_day + 1);
                                    body += ")";
                                    body += "</th>";
                                }
                                body += "</tr>";

                                body += "<tr>";
                                body += "<td style='border-top: 0'></td>";
                                /*  generate room label */
                                for(var ctr_room = 0; ctr_room < 7; ++ctr_room)
                                {
                                    body += "<th>";
                                    body += "409";
                                    body += "</th>";
                                    body += "<th>";
                                    body += "417";
                                    body += "</th>";
                                }
                                body += "</tr>";
                                body += "</thead>";
                                body += "<tfoot>";
                                body += "<tr>" +
                                    "<td><input class='btn btn-primary' type='submit' value='送出'></td>";

                                for(var ctr_border = 0; ctr_border < 14; ++ctr_border)
                                {
                                    body += "<td></td>";
                                }

                                body += "</tr>";
                                body += "</tfoot>";
                                body += "<tbody>";
                                /*  generating table    */
                                for(var ctr_hr = 0; ctr_hr <= 23; ++ctr_hr)
                                {
                                    /*  time label  */
                                    body += "<tr>";
                                    body += "<th>";
                                    if(ctr_hr < 10) body += "0";
                                    body += ctr_hr;
                                    body += ":00 ~ ";
                                    if(ctr_hr + 1 < 10) body += "0";
                                    if(ctr_hr + 1 == 24) body += "00";
                                    else body += (ctr_hr + 1);
                                    body += ":00";
                                    body += "</th>";
                                    /*  for each check box  */
                                    for(var ctr_day = 0; ctr_day < 14; ++ctr_day)
                                    {
                                        var date_obj = new Date(FirstDayOfWeek);
                                        date_obj.setDate(FirstDayOfWeek.getDate() + Math.floor(ctr_day / 2));
                                        body += "<td>";
                                        //if this checkbox is not occupied by other users   */
                                        if(ctr_oth_not_selected >= rows_oth.length || ctr_hr !== rows_oth[ctr_oth_not_selected].time || ctr_day % 2 !== rows_oth[ctr_oth_not_selected].room || date_obj.getDate() !== rows_oth[ctr_oth_not_selected].date.getDate())
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
                                            //if the user has already appoint this section before
                                            if(rows.length !== 0 && ctr_selected < rows.length)
                                            {
                                                //mark the checkbox as checked
                                                if(ctr_hr === rows[ctr_selected].time && ctr_day % 2 === rows[ctr_selected].room && date_obj.getDate() === rows[ctr_selected].date.getDate())
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
                                body += "</tbody>";
                                body += "</form>";
                                body += "</table>";
                                body += "</div>";
                                /*  generate the html page  */
                                html = '<!DOCTYPE html><html lang="zh-Hant">' + '<html><head>' + head + '</head><body>' + body + '</body></html>';
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
                        //reference: http://stackoverflow.com/questions/17341122/link-and-execute-external-javascript-file-hosted-on-github
                        res.redirect(ip_address_re_ + "fail.html");
                        res.end();
                    }
                });
            }
        });
        form.parse(req);
    }

    //TODO: FIX ASYNC HELL BY ADJUST THE STRUCTURE
    function UserQuery(req, res)
    {
        var changes = {
            add: [],
            min: [],
            error: []
        };  //variable to store what user change this time
        var now = getnow();
        var FirstDayOfWeek = getFirstDayOfWeek();
        /*  parse what user checkced    */
        var form = new formidable.IncomingForm();
        var fields = [];
        form.on('field', function(field, value){
            fields.push(value);
        });

        form.on('end', function(){
            //NOTE THAT THE FIRST ONE IN ARRAY IS USER NAME
            //parse all the checkbox
            var query = ParseCheckbox_AdminForm(fields, 1);
            //since data sent from html page is sorted by time, date, room
            //re-sort it by date, time, room
            query.sort(function(a, b){
                return sortby_dtm(a, b);
            });
            var query_origin_date = FirstDayOfWeek.getFullYear() + '-' + (FirstDayOfWeek.getMonth() + 1) + '-' + FirstDayOfWeek.getDate();
            var query_origin_name = fields[0];
            //reference: http://stackoverflow.com/questions/750486/javascript-closure-inside-loops-simple-practical-example
            //get data from server and compare the differences
            sql.connection.query("SELECT * from schedule WHERE date >= ? AND name = ? ORDER BY date ASC, time ASC, room ASC", [query_origin_date, query_origin_name], function(err, rows_origin, fields_origin){
                if(err) throw err;
                var chk_ptr = 0;    //pointer points to the original acquire from database
                var rows_orgin_marker = []; //marker use to save which checkbox is identical to the one on database
                /*  initialize the marker array */
                for(var ctr_marker = 0; ctr_marker < rows_origin.length; ++ctr_marker)
                {
                    rows_orgin_marker[ctr_marker] = false;
                }
                /*  iterating through all checkboxes    */
                query.forEach(function(element, index, array){

                    //if(index === array.length - 1)
                    //it means that if the iteration is about to end, then call the function to delete data
                    //structure original used to prevent callback hell, but failed
                    //TODO: CHANGE TO THE METHOD USED IN FUNCTION AdminQuery

                    /*  compare with data on sql    */
                    //refrence: http://stackoverflow.com/questions/7244513/javascript-date-comparisons-dont-equal
                    //if the data point to is eariler than current pointed date object
                    //keep point to the next one until it's equal or bigger than
                    while(
                    chk_ptr < rows_origin.length &&
                        (rows_origin[chk_ptr].date < element[0] || (rows_origin[chk_ptr].date.getTime() === element[0].getTime() && rows_origin[chk_ptr].time < element[1]) || (rows_origin[chk_ptr].date.getTime() === element[0].getTime() && rows_origin[chk_ptr].time === element[1] && rows_origin[chk_ptr].room < element[2]))
                    )
                    {
                        console.log(rows_origin[chk_ptr].date);
                        ++chk_ptr;
                    }
                    //the record remain unchanged
                    if(
                        chk_ptr < rows_origin.length &&
                        (rows_origin[chk_ptr].date.getFullYear() === element[0].getFullYear() &&
                        rows_origin[chk_ptr].date.getMonth() === element[0].getMonth() &&
                        rows_origin[chk_ptr].date.getDate() === element[0].getDate() &&
                        rows_origin[chk_ptr].time === element[1] &&
                        rows_origin[chk_ptr].room === element[2])
                    )
                    {
                        rows_orgin_marker[chk_ptr] = true;
                        ++chk_ptr;
                        //reference: http://stackoverflow.com/questions/18452920/continue-in-cursor-foreach
                        if(index === array.length - 1)
                        {
                            changes = DeleteFromDb(rows_origin, rows_orgin_marker, changes, fields, res);
                            console.log("Caller 1");
                        }
                        return true;
                    }
                    //variable used to send query and prevent sql injection
                    var qry_esc_date = element[0].getFullYear() + "-" + (element[0].getMonth() + 1) + "-" + element[0].getDate();
                    var qry_esc_time = element[1];
                    var qry_esc_room = element[2];
                    //send query to check the specify field is empty or occupied
                    sql.connection.query("SELECT `name` from `schedule` WHERE `date` = ? AND `time` = ? AND `room` = ?", [qry_esc_date, qry_esc_time, qry_esc_room],function(err, rows_chk, fields_func){
                        if(err) throw err;
                        //variable used to insert into database
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
                                changes.add.push(sql_str_wirtten_esacpe_obj);   //record the changes
                                //refrence: http://stackoverflow.com/questions/29738535/catch-foreach-last-iteration
                                if(index === array.length - 1)
                                {
                                    changes = DeleteFromDb(rows_origin, rows_orgin_marker, changes, fields, res);
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
                                changes = DeleteFromDb(rows_origin, rows_orgin_marker, changes, fields, res);
                                console.log("Caller 3");
                            }
                        }
                        //if the name is the recived one then do nothing
                        else
                        {
                            if(index === array.length - 1)
                            {
                                changes = DeleteFromDb(rows_origin, rows_orgin_marker, changes, fields, res);
                                console.log("Caller 4");
                            }
                        }
                    });
                });
                if(query.length === 0)
                {
                    changes = DeleteFromDb(rows_origin, rows_orgin_marker, changes, fields, res);
                    console.log("Caller 5");
                }
            });
        });

        form.parse(req);
    }

    function AdminQuery(req, res)
    {
        //TODO: PREVENT FORM COLLISION
        var form = new formidable.IncomingForm();
        form.encoding = 'utf-8';
        var fields = [];
        /*  get input field's name and value that is non-empty  */
        form.on('field', function(name, value) {
            if(value != "") fields.push([name, value]);
        });

        form.on('end', function(){
            var fields_parse_date = [];
            var marker_new = [];    //array used to record which field needs to insert into database
            var marker_update = []; //base on marker_new, used to see which field needs update instead of insert or delete
            var now = getnow();
            var FirstDayOfWeek = getFirstDayOfWeek();
            var query_esc_date = FirstDayOfWeek.getFullYear() + '-' + (FirstDayOfWeek.getMonth() + 1) + '-' + FirstDayOfWeek.getDate() + "'";
            /*  pasrse input by using function ParseCheckbox_AdminForm
                since they share the same name for each field
             */
            //first assing to array
            for(var ctr_fields_cp = 0; ctr_fields_cp < fields.length; ++ctr_fields_cp)
            {
                fields_parse_date[ctr_fields_cp] = fields[ctr_fields_cp][0];
            }
            //parse by calling function
            fields_parse_date = ParseCheckbox_AdminForm(fields_parse_date, 0);
            //copy the field's user name into array as weel
            for(var ctr_fields_cp = 0; ctr_fields_cp < fields.length; ++ctr_fields_cp)
            {
                fields_parse_date[ctr_fields_cp][3] = fields[ctr_fields_cp][1];
            }
            //sort by date, time, name
            fields_parse_date.sort(function(a, b){
                return sortby_dtm(a, b);
            });
            //initialize marker
            for(var ctr_ini = 0; ctr_ini < fields_parse_date.length; ++ctr_ini)
            {
                marker_new[ctr_ini] = false;    //NOTE THAT IT IS SET TO FALSE INITIALLY
                marker_update[ctr_ini] = -1;    //the marker save the id needs to be update, if update is not needed the value would be -1
            }
            /*  get all fields this week to compare between incoming data   */
            sql.connection.query("SELECT * FROM schedule WHERE date >= ? ORDER BY date ASC, time ASC, room ASC", [query_esc_date], function(err, rows, fields) {
                var marker_old = [];
                var old_ptr = 0;    //pointer points to the array retrieve from data base
                var new_ptr = 0;    ////pointer points to the array retrieve from front end
                //initialize the record and marker
                for (var ctr_parse = 0; ctr_parse < rows.length; ++ctr_parse)
                {
                    marker_old[ctr_parse] = true;   //NOTE THAT IT IS SET TO TRUE INITIALLY
                }
                //  compare between two array
                while (old_ptr < rows.length && new_ptr < fields_parse_date.length)
                {
                    //if the pointer points to the one from database is smaller iterate to next one
                    if((rows[old_ptr].date < fields_parse_date[new_ptr][0]) || (rows[old_ptr].date.getTime() === fields_parse_date[new_ptr][0].getTime() && rows[old_ptr].time < fields_parse_date[new_ptr][1]) || (rows[old_ptr].date.getTime() === fields_parse_date[new_ptr][0].getTime() && rows[old_ptr].time === fields_parse_date[new_ptr][1] && rows[old_ptr].room < fields_parse_date[new_ptr][2]))
                    {
                        ++old_ptr;
                        continue;
                    }
                    //if the same field match between two arrays
                    if(rows[old_ptr].date.getTime() === fields_parse_date[new_ptr][0].getTime() && rows[old_ptr].time === fields_parse_date[new_ptr][1] && rows[old_ptr].room === fields_parse_date[new_ptr][2])
                    {
                        //if two field has same date, time, and room but different name, then we need to update the name
                        if(rows[old_ptr].name !== fields_parse_date[new_ptr][3]) marker_update[new_ptr] = rows[old_ptr].id;
                        //no need to insert nor delete
                        marker_new[new_ptr] = true;
                        marker_old[old_ptr] = false;
                        ++old_ptr;
                        ++new_ptr;
                        continue;
                    }
                    //iterate to next one in opposite condition
                    else
                    {
                        ++new_ptr;
                        continue;
                    }
                }

                //deletion
                marker_old.forEach(function(element, index, array){
                    if(!element) return true;
                    sql.connection.query("DELETE FROM `schedule` WHERE `id` = ?", rows[index].id, function(err, rows_query_del, fields_func){
                        if (err) throw err;
                        console.log(this.sql);
                    });
                });
                //addition
                marker_new.forEach(function(element, index, array){
                    if(element) return true;
                    var sql_str_wirtten_esacpe_obj = {
                        date: fields_parse_date[index][0].getFullYear() + "-" + (fields_parse_date[index][0].getMonth() + 1) + "-" + fields_parse_date[index][0].getDate(),
                        time: Number(fields_parse_date[index][1]),
                        room: Number(fields_parse_date[index][2]),
                        name: fields_parse_date[index][3]
                    };
                    sql.connection.query("INSERT INTO `schedule` SET ?", sql_str_wirtten_esacpe_obj, function(err, rows_sql_str_written, fields_func){
                        if(err) throw err;
                        console.log(this.sql);
                    });
                });
                //update
                marker_update.forEach(function(element, index, array){
                    if(element === -1) return true;
                    var sql_str_wirtten_esacpe_arr = [fields_parse_date[index][0].getFullYear() + "-" + (fields_parse_date[index][0].getMonth() + 1) + "-" + fields_parse_date[index][0].getDate(), Number(fields_parse_date[index][1]), Number(fields_parse_date[index][2]), fields_parse_date[index][3], element];
                    sql.connection.query("UPDATE `schedule` SET `date` = ?, `time` = ?,`room` = ?, `name` = ? WHERE `id` = ?", sql_str_wirtten_esacpe_arr, function(err, rows_sql_updated, fields_func){
                        if(err) throw err;
                        console.log(this.sql);
                    });
                });
                /*  tell the administrator that the process completed   */
                res.writeHead(200, {
                    'Content-Type': 'text/html'
                });
                res.end(BuildAdminResult());
            });

        });

        form.parse(req);
    }
    //listening on port 8888
    server.listen(port_, ip_address_local_, function(){
        console.log('Server running at mode ' + mode_selection + ', with ip: ' + ip_address_local_ + ', and port: ' + port_);
        console.log("Current timezone offset is: " + getnow().getTimezoneOffset());
    });
}

//DeleteFromDb is the last asynchrnous function called before respond
//Due to the asynchrnous problem
function DeleteFromDb(rows_origin, rows_orgin_marker, changes, fields, res)
{
    for(var ctr_clear = 0; ; ++ctr_clear)
    {
        //if the loop ends call the respond function
        if(ctr_clear === rows_origin.length)
        {
            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            res.end(BuildHtmlResult(changes));
            return changes;
        }
        if(rows_orgin_marker[ctr_clear]) continue;  //not the target
        //push into changed
        changes.min.push({
            date: rows_origin[ctr_clear].date.getFullYear() + "-" + (rows_origin[ctr_clear].date.getMonth() + 1) + "-" + rows_origin[ctr_clear].date.getDate(),
            time: rows_origin[ctr_clear].time,
            room: rows_origin[ctr_clear].room,
            name: fields[0]
        });
        //send delete query
        sql.connection.query("DELETE FROM `schedule` WHERE `id` = ?", rows_origin[ctr_clear].id, function(err, rows_query_del, fields_func){
            if (err) throw err;
            console.log(this.sql);
        });
    }
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
/*
 mode === 1 for parsing user sent checkbox, since the first one in array is hidden user name
 the other mode is universal
 this function just parsed input name with "c_xx_xx_x"
 */
function ParseCheckbox_AdminForm(input, mode)
{
    var start_pt;

    if(mode === 1) start_pt = 1;
    else start_pt = 0;
    var respond = [];
    //NOTE THAT THE FIRST ONE IN 'input' ARRAY IS USER NAME
    for(var ctr_all = start_pt; ctr_all < input.length; ++ctr_all)
    {
        var temp = [];
        var now = getnow();
        var FirstDayOfWeek = getFirstDayOfWeek();
        var date_temp = FirstDayOfWeek;
        date_temp.setHours(0, 0, 0, 0); //need to set hour to 0, 0, 0, 0 since sometimes we would use date comparison operator
        /*  by finding the character '_' to determine which day this week or time or room, and then convert them from string to number  */
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
        respond[ctr_all - start_pt] = temp;
    }
    return respond;
}

/*  just a simple function to redirect to the main page */
function BuildAdminResult()
{
    var head = "";
    var body = "";
    var footer = "";
    head += "<meta charset='UTF-8'>";
    head += "<meta http-equiv='refresh' content='3;url=" + ip_address_re_ + "'>";
    body += "所有變動都已儲存，網頁將在3秒鐘後自動導向至首頁。";
    body += redirect_2_front_page;
    return "<!DOCTYPE html>\n<html lang='zh-Hant'>" +  "<head>" + head + "</head>" + "<body>" + body + "</body>" + "<footer>" + footer + "</footer>" + "</html>";
}

/*  build html that show the changes the user made this time    */
function BuildHtmlResult(array_obj)
{
    var head = "";
    var body = "";
    var footer = "";


    /*  the function that draw the table of changes */
    function draw(sub_arr)
    {
        var string_draw  = "";
        string_draw += "<div>";
        string_draw += "<table class='table1'>";
        string_draw += "<thead>";
        string_draw += "<tr><th>日期</th><th>時間</th><th>琴房</th></tr>";
        string_draw += "</thead>";
        string_draw += "<tbody>";
        for(var ctr = 0; ctr < sub_arr.length; ++ctr)
        {
            //parsed the date object with type "YYYY-MM-DD"
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
        string_draw += "</tbody>";
        string_draw += "</table>";
        string_draw += "</div>";
        return string_draw;
    }

    /*  head    */
    head += "<meta charset='UTF-8'>";
    head += "<title>交通大學鋼琴社琴房預約系統</title>";
    head += "<link rel='stylesheet' type='text/css' href='http://nodejs-wwwworkspace.rhcloud.com/Style_user.css'>";


    /*  body    */
    //show the changes
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
    body += redirect_2_front_page;
    return "<!DOCTYPE html>\n<html lang='zh-Hant'>" +  "<head>" + head + "</head>" + "<body>" + body + "</body>" + "<footer>" + footer + "</footer>" + "</html>";
}

function BuildNameError()
{
    var head = "";
    head += "<meta charset='UTF-8'>";
    head += "<meta http-equiv='refresh' content='3;url=" + ip_address_re_ + "'>";
    var body = "";
    var footer = "";
    body += "您所輸入的名稱超過了45個字元(資料庫能儲存的上限)，麻煩您為自己取個暱稱，或是不要打一堆無意義的字元謝謝。<br>";
    body += "系統將在3秒後從新導向至首頁";
    body += redirect_2_front_page;
    return "<!DOCTYPE html>\n<html lang='zh-Hant'>" +  "<head>" + head + "</head>" + "<body>" + body + "</body>" + "<footer>" + footer + "</footer>" + "</html>";
}

function change_html_path(target)
{
    //!!Restricted to index.html and fail.html only
    var file = "";
    if(target === 'index.html') file = path.join(__dirname, '..', target);
    else file = path.join(__dirname, '..', 'Front_End', target)
    //reference: http://stackoverflow.com/questions/14177087/replace-a-string-in-a-file-with-nodejs
    fs.readFile(file, 'utf8', function(err, data){
        if(err) throw err;
        var result;
        if(mode_selection)    //openshift mode
        {
            result = data.replace(/localhost:8888/g, 'nodejs-wwwworkspace.rhcloud.com');
            console.log(target + ' modify to openshift mode');
        }
        else
        {
            result = data.replace(/nodejs-wwwworkspace.rhcloud.com/g, 'localhost:8888');
            console.log(target + ' modify to localhost mode');
        }
        fs.writeFile(file, result, function(err, data){
            if(err) throw err;
        });
    });
}


function getdays_this_mon()
{
    var f = getFirstDayOfWeek();
    return ((new Date(f.getFullYear(), f.getMonth() + 1, 1)) - (new Date(f.getFullYear(), f.getMonth(), 1)))/60/60/24/1000;
}

function getFirstDayOfWeek()
{
    var n = getnow(), d = getnow();
    d.setDate(n.getDate() - n.getDay());
    return d;
}

//re-sort it by date, time, room
function sortby_dtm(a, b)
{
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
}


exports.start = start;
