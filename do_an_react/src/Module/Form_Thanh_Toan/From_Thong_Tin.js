import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { TextField, Button } from '@material-ui/core';
import axios from 'axios';

const useStyles = makeStyles((theme) => ({
  root: {
    '& > *': {
      margin: theme.spacing(1),
      width: '100%',
      marginTop:"50px"
    },
  },
}));


const From_Thong_Tin = () => {
    const classes= useStyles;
    const [ThongTinGioHang, setThongTinGioHang] = useState([]);

    useEffect(()=>{

        const gio_hang = localStorage.getItem('gio_hang')
        if(typeof gio_hang != 'undefined' && gio_hang != null){
            var mang_gio_hang = JSON.parse(gio_hang)
            const list_chi_tiet_don_hang=[];

            mang_gio_hang.forEach((item,index) => {
                list_chi_tiet_don_hang[index] ={
                    ma_san_pham: item.ma,
                    ten_san_pham: item.ten_san_pham,
                    so_luong: item.so_luong,
                    don_gia: item.don_gia,
                    thanh_tien: item.don_gia * item.so_luong
                }
            });
            setThongTinGioHang(list_chi_tiet_don_hang)
        }
        
    },[])
    
const [ DataForm,setDataForm] = useState({
    ho_ten: '',
    email: '',
    dien_thoai_nguoi_nhan: '',
    dia_chi_nguoi_nhan: ''
})

    const handleChangeInput = (e) =>{
        const {name,value}= e.target
        setDataForm(
          setState=>({
              ...setState,[name]:value
          })
        )
       console.log(name)
    }

    


    const handleSubmitForm =(e)=>{
        e.preventDefault();

        // const gio_hang = JSON.parse(localStorage.getItem('gio_hang'))
        
        const info_Data = DataForm;
        info_Data.chi_tiet_don_hang = ThongTinGioHang
        
        console.log(info_Data.chi_tiet_don_hang.don_gia )

        axios.post('http://localhost:4000/don-hang',info_Data)
        .then((res)=>{
            console.log(res)
        })
        .catch((err)=>{
            console.log(err)
        })
    }

    return (
        <div>
            <div>
                Form Thanh Toán
            </div>
            <div>
                <form noValidate autoComplete="off" onSubmit={handleSubmitForm}>
                    <div className={classes.root} style={{margin:'50px 0px' , width:"80%"}}>
                        <TextField id="ho_ten" name="ho_ten" label="Họ tên" onChange={handleChangeInput} value={DataForm.ho_ten} variant="outlined" style={{width:'100%'}} />
                    </div>
                    <div className={classes.root} style={{margin:'50px 0px' , width:"80%"}}>
                        <TextField id="email" name="email" label="Email" onChange={handleChangeInput} value={DataForm.email} variant="outlined" style={{width:'100%'}} />
                    </div>
                    <div className={classes.root} style={{margin:'50px 0px' , width:"80%"}}>
                        <TextField id="dien_thoai_nguoi_nhan" name="dien_thoai_nguoi_nhan" label="Điện thoại" onChange={handleChangeInput} value={DataForm.dien_thoai_nguoi_nhan} variant="outlined" style={{width:'100%'}} />
                    </div>
                    <div className={classes.root} style={{margin:'50px 0px' , width:"80%"}}>
                        <TextField id="dia_chi_nguoi_nhan" name="dia_chi_nguoi_nhan" label="Địa chỉ" onChange={handleChangeInput} value={DataForm.dia_chi_nguoi_nhan} variant="outlined" style={{width:'100%'}} />
                    </div>
                    <div className={classes.root} style={{margin:'50px 0px' , width:"80%"}}>
                        <Button variant="contained" color="primary" type="submit">
                            Đặt Hàng
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default From_Thong_Tin;
//String(result.insert).padStart(maxllenght)