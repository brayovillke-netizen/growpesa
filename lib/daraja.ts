const BASE_URL = 'https://api.safaricom.co.ke'; // Use https://sandbox.safaricom.co.ke for testing
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gropesa.vercel.app';

// 1. Get Auth Token
async function getToken() {
  const auth = Buffer.from(`${process.env.DARAJA_KEY}:${process.env.DARAJA_SECRET}`).toString('base64');
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  const data = await res.json();
  return data.access_token;
}

// 2. STK Push (Trigger M-Pesa prompt on member's phone)
export async function triggerSTK(phone: string, amount: number) {
  const token = await getToken();
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const password = Buffer.from(`${process.env.DARAJA_SHORTCODE}${process.env.DARAJA_PASSKEY}${timestamp}`).toString('base64');

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: process.env.DARAJA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline', // Or CustomerBuyGoodsOnline if using Buy Goods Till
      Amount: amount,
      PartyA: phone,
      PartyB: process.env.DARAJA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: `${SITE_URL}/api/daraja/stk-callback`,
      AccountReference: 'GrowPesa',
      TransactionDesc: 'Savings'
    })
  });
  return res.json();
}

// 3. B2C (Send money to member's phone automatically)
export async function sendB2C(phone: string, amount: number) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/mpesa/b2c/v3/paymentrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      OriginatorConversationID: `GP-${Date.now()}`,
      InitiatorName: process.env.DARAJA_INITIATOR,
      SecurityCredential: process.env.DARAJA_CREDENTIAL,
      CommandID: 'BusinessPayment',
      Amount: amount,
      PartyA: process.env.DARAJA_SHORTCODE,
      PartyB: phone,
      Remarks: 'GrowPesa Loan Payout',
      QueueTimeOutURL: `${SITE_URL}/api/daraja/b2c-timeout`,
      ResultURL: `${SITE_URL}/api/daraja/b2c-result`,
      Occasion: 'Loan'
    })
  });
  return res.json();
}