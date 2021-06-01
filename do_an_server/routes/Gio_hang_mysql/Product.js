const { json } = require("express");
const express = require("express");
const router = express.Router();
const mysql = require("mysql");

router.get("/", function (req, res) {
  var connection = mysql.createConnection({
    connectTimeout: 10,
    host: "localhost",
    user: "root",
    password: "",
    database: "shop-ban-hang",
  });

  connection.connect(function (err) {
    if (err) {
      console.log("error connecting: " + err.stack);
      return;
    }

    console.log("connected as id " + connection.threadId);

    connection.query(
      `SELECT * FROM san_pham`,
      function (error, results, fields) {
        res.json(results);
      }
    );
  });
});

module.exports = router;

// define( 'DB_NAME', 'u617855816_789win' );

// /** MySQL database username */
// define( 'DB_USER', 'u617855816_root' );

// /** MySQL database password */
// define( 'DB_PASSWORD', 'Win789vn' );

// /** MySQL hostname */
// define( 'DB_HOST', 'localhost' );

// /** Database Charset to use in creating database tables. */
// define( 'DB_CHARSET', 'utf8mb4' );

// /** The Database Collate type. Don't change this if in doubt. */
// define( 'DB_COLLATE', '' );
