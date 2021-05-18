const mysql = require('mysql');

const database = mysql.createConnection({
    /*host: "sm9j2j5q6c8bpgyq.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "ah057kfjbkolz4do",
    password: "jaf89al1zf8viseg",
    database: "qooalzvdkvh3byxb"*/
    host: "localhost",
    user: "root",
    password: "",
    database: "trapflix"
});

database.connect(function(err) {
    if (err) throw err;
});

module.exports = database;