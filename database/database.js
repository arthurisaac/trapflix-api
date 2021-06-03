const mysql = require('mysql');
require('dotenv').config();

const database = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
    /*host: "localhost",
    user: "root",
    password: "",
    database: "trapflix"*/
});

database.connect(function(err) {
    if (err) throw err;
});

module.exports = database;