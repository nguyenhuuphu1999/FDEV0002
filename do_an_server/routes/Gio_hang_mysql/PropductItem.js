const { json } = require('express');
const express = require('express');
const router = express.Router();
const mysql = require('mysql')




router.get('/:id', function(req,res){
    console.log("hehe")

    var connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'root',
        password : '',
        database: 'shop-ban-hang'
    });

    connection.connect(function(err) {
        if (err) {
          console.log('error connecting: ' + err.stack);
          return;
        }
       
        console.log('connected as id ' + connection.threadId);

        connection.query(`SELECT * FROM san_pham where ma= ${req.params.id}`, function (error, results, fields) {

           
          

            res.json(results);
        });
    })

})

module.exports = router