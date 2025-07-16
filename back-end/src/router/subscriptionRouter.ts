import { loadSubscription } from '../middleware/subscriptionMiddleware';
import express from 'express';
const router = express.Router();

router.post('/loadSubscription',loadSubscription,(req,res)=>{
    const lv_data = res.locals.subscription;
    res.send({lv_data});
})

export default router;