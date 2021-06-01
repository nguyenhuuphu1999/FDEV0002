import { Grid } from '@material-ui/core';
import React from 'react';
import Form_Thanh_Toan from './Form_Thanh_Toan';
import Form_Thong_Tin from './From_Thong_Tin'
const index = () => {
    return (
        <div style={{marginTop:'200px'}}>
            <Grid container spacing={3}>
                <Grid item xs={6}>
                    <Form_Thanh_Toan/>
                </Grid>

                <Grid item xs={6}>
                    <Form_Thong_Tin/>
                </Grid>
            </Grid>
        </div>
    );
};

export default index;