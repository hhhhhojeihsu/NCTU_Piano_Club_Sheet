/*  MODE SELECTION
 1 for openshift mode and 0 for localhost mode
 //NOTE THAT THE MODE IN sql.js need to be changed as well
 */

var mode_selection = 1;
var host_ = mode_selection ? process.env.OPENSHIFT_MYSQL_DB_HOST : 'localhost';
var port_ = mode_selection ? process.env.OPENSHIFT_MYSQL_DB_PORT : '3306';
var user_ = mode_selection ? process.env.OPENSHIFT_MYSQL_DB_USERNAME : 'root';
var password_ = mode_selection ? process.env.OPENSHIFT_MYSQL_DB_PASSWORD : 'abc';
var database_ = mode_selection ? 'nodejs' : 'info';

var mysql = require('mysql');
var connection = mysql.createConnection({
    host : host_,
    port : port_,
    user : user_,
    password : password_,
    database : database_
});


connection.connect();

exports.connection = connection;
