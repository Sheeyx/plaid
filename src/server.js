require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { PlaidApi, Configuration, PlaidEnvironments } = require('plaid');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET':    process.env.PLAID_SECRET,
      },
    },
  })
);

// /verify route — Zoho redirect keladigan sahifa
app.get('/verify', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'verify.html'));
});

// 1. IDV uchun link_token
app.post('/api/idv/create_link_token', async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: req.body.user_id || 'user-' + Date.now(),
        email_address:  req.body.email,
      },
      client_name: 'My App',
      products: ['identity_verification'],
      identity_verification: {
        template_id: process.env.PLAID_IDV_TEMPLATE_ID,
      },
      country_codes: ['US'],
      language: 'en',
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

// 2. IDV natijasini olish
app.post('/api/idv/get_result', async (req, res) => {
  try {
    const { idv_session_id } = req.body;
    const response = await plaidClient.identityVerificationGet({
      identity_verification_id: idv_session_id,
    });
    const data = response.data;
    const crmData = {
      name:            data.kyc_check?.name?.summary,
      dob:             data.kyc_check?.date_of_birth?.summary,
      address:         data.kyc_check?.address?.summary,
      phone:           data.user?.phone_number,
      ip_address:      data.risk_check?.behavior?.ip_address,
      trust_index:     data.risk_check?.risk_level,
      risk_indicators: data.risk_check?.risk_indicators,
      idv_result:      data.status,
      request_id:      data.request_id,
      idv_key:         data.id,
    };
    res.json(crmData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Webhook
app.post('/api/webhook/plaid', async (req, res) => {
  const { webhook_type, webhook_code, identity_verification_id } = req.body;
  if (webhook_type === 'IDENTITY_VERIFICATION' && webhook_code === 'STATUS_UPDATED') {
    const response = await plaidClient.identityVerificationGet({ identity_verification_id });
    console.log('IDV status:', response.data.status);
  }
  res.json({ received: true });
});

app.listen(process.env.PORT, () => {
  console.log(`Server: http://localhost:${process.env.PORT}`);
});