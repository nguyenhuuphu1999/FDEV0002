const express = require('express')
const router = express.Router();
const mysql = require('mysql')

function number_data_month(nam_thong_ke) {
    var array_temp = [];

    for(var i = 1; i <= 12; i++){
        array_temp[i] = nam_thong_ke + ' ' + ((i<10)?'0' + i:i);
    }

    array_temp.shift();
    return array_temp;
}

router.get('/:nam_thong_ke',function(req,res){
    var connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'root',
        password : '',
        database: 'bookstore'
    });
    connection.connect(function(err) {
        if (err) {
          console.log('error connecting: ' + err.stack);
          return;
        }
       
        console.log('connected as id ' + connection.threadId);

        connection.query(`SELECT DATE_FORMAT(ngay_dat, '%Y %m') as order_temp, SUM(tong_tien) as tong_tien_thong_ke 
         FROM bs_don_hang
        GROUP BY DATE_FORMAT(ngay_dat, '%Y %m')`, function (error, results, fields) {

            connection.end(function(err) {
                // The connection is terminated now
                console.log('Close connection id ' + connection.threadId);
            });
              

            if (error) throw error;
            // connected!
            console.log(results);

            var list_month = number_data_month(req.params.nam_thong_ke);

            var reponse = [];

            for(var i = 0; i < list_month.length; i++){
                reponse[i] = 0;

                for(var j = 0; j < results.length; j++){

                    if(list_month[i] == results[j].order_temp){
                        reponse[i] = results[j].tong_tien_thong_ke;
                    }

                }
            }

            res.json(reponse);
        });
    })
})


module.exports = router;