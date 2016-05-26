var mysql = require('mysql');
var connection = mysql.createConnection({
    host : 'localhost',
    port : '3306',
    user : 'root',
    password : 'abc',
    database : 'info'
});
//password is abcd on pc, abc on mac remember to change it

connection.connect();

exports.connection = connection;
