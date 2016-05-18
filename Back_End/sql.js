var mysql = require('mysql');
var connection = mysql.createConnection({
    host : 'localhost',
    port : '3306',
    user : 'root',
    password : 'abcd',
    database : 'users'
});

connection.connect();

exports.connection = connection;
