

const axios = require('axios');
const {v4: uuidv4} = require('uuid');


// Environment variables
const CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
const CLIENT_VERSION = process.env.PHONEPE_CLIENT_VERSION;
const CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const ENV = process.env.PHONEPE_ENV;
const AUTH_URL = process.env.PHONEPE_AUTH_URL;
const CREATE_ORDER_URL = process.env.PHONEPE_CREATE_ORDER_URL;
const STATUS_URL = process.env.PHONEPE_STATUS_URL;
const FRONTEND_SUCCESS_URL = process.env.FRONTEND_SUCCESS_URL;
const FRONTEND_FAILURE_URL = process.env.FRONTEND_FAILURE_URL;

if (!CLIENT_ID || !CLIENT_VERSION || !CLIENT_SECRET) {
  console.error('Missing PhonePe Credentials');
  process.exit(1);
}

let accessToken = null;
let tokenExpiry = 0;

const getAccessToken = async () => {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const response = await axios.post(
      AUTH_URL,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_version: CLIENT_VERSION,
        client_secret: CLIENT_SECRET,
        grant_type: 'client_credentials',
      }),

      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
        },
      },
    );

    accessToken  = response.data.access_token;
    tokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000;
    console.log("Access Token fetched",accessToken);
    return accessToken;
  } catch (err) {
    console.error('Auth token error', err?.response?.data || err.message);
  }
};


exports.initializePayment = async(req,res) => {
  try{
    const {phone,amount,userId} = req.body;

    if(!phone || !amount || !userId){
      return res.status(400).json({success:false,message:"Invalid parameters"});
    }

    const transactionId = uuidv4();
    const authToken = await getAccessToken();


    const orderPayload = {
      merchantOrderId:transactionId,
      amount:Number(amount) * 100, //in paise
      expireAfter:1200,
      metaInfo:{user_name:userId,mobile:phone},
      paymentFlow:{type:'PG_CHECKOUT'}
    };

    const orderResponse = await axios.post(CREATE_ORDER_URL, orderPayload, {
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `O-Bearer ${authToken}`,
      },
    });
    

    console.log("order response - full data",orderResponse.data);

    const {token} = orderResponse.data;


    const sdkPayload = {
      orderId:transactionId,
      merchantId:MERCHANT_ID,
      token:token,
      paymentMode:{type:'PAY_PAGE'}
    }

    res.json({
      success:true,
      request:JSON.stringify(sdkPayload),
      transactionId
    })
  }catch(err){
    console.error("Payment Init error",err?.response?.data || err?.message);
    res.status(500).json({
      success:false,
      message:"Payment init failed",
      error:err?.response?.data
    })
  }
}

exports.paymentStatus =  async (req, res) => {
  // try {
    const {transactionId} = req.query;
    const authToken = await getAccessToken();

    const response = await axios.get(
      `${STATUS_URL}/${transactionId}/status`,
      {
        headers: {
          accept: 'application/json',
          Authorization: `O-Bearer ${authToken}`, // Using O-Bearer
        },
      },
    );
    console.log("Payment status query:",response);

    const paymentStatus = response.data.paymentStatus; // e.g., SUCCESS, FAILURE
    res.json({success: true, paymentStatus}); // Return JSON instead of redirect
  // } catch (error) {
  //   console.error('Status Error:', error.response?.data || error.message);
  //   res
  //     .status(500)
  //     .json({
  //       success: false,
  //       message: 'Status check failed',
  //       error: error.response?.data || error.message,
  //     });
  // }
}
