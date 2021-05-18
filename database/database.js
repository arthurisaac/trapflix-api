const mysql = require('mysql');

const database = mysql.createConnection({
    host: "bmlx3df4ma7r1yh4.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "rk7rjyspxo5uqspw",
    password: "aen6mbfb4rmkh672",
    database: "xmmevf0y5gc49d9x"
    /*host: "localhost",
    user: "root",
    password: "",
    database: "trapflix"*/
});

database.connect(function(err) {
    if (err) throw err;
});

module.exports = database;