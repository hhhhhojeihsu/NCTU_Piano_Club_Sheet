var mysql = require('mysql');
var connection = mysql.createConnection({
    host : 'localhost',
    port : '3306',
    user : 'root',
    password : 'abc',
    database : 'info'
});


connection.connect();

exports.connection = connection;
