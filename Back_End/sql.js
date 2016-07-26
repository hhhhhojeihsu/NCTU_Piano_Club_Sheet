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

//reference: http://stackoverflow.com/questions/20210522/nodejs-mysql-error-connection-lost-the-server-closed-the-connection
var handleDisconnect = function()
{
    connection.connect(function(err){
        if(err)
        {
            console.log("error connecting to database:", err.code);
            setTimeout(handleDisconnect(), 2000);
        }
        else console.log('reconnected to database');
    });
};

connection.connect();

exports.connection = connection;
exports.handleDisconnect = handleDisconnect;
