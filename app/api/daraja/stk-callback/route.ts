import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const callback = body.Body?.stkCallback;

    // ResultCode 0 means the payment was successful
    if (callback?.ResultCode === 0) {
      // Extract the details Safaricom sends us
      const amount = callback.CallbackMetadata.Item.find((i: any) => i.Name === 'Amount').Value;
      const receipt = callback.CallbackMetadata.Item.find((i: any) => i.Name === 'MpesaReceiptNumber').Value;
      const phone = callback.CallbackMetadata.Item.find((i: any) => i.Name === 'PhoneNumber').Value.toString();

      // Safaricom sends 2547XXXXXXXX, but we store 07XXXXXXXX
      const formattedPhone = phone.replace(/^254/, '0');

      // Find the member
      const [member] = await sql`select id from members where phone = ${formattedPhone}`;

      if (member) {
        // AUTOMATION: Insert savings directly as 'confirmed'! No treasurer needed.
        await sql`
          insert into savings (member_id, amount, week_date, code, status)
          values (${member.id}, ${amount}, current_date, ${receipt}, 'confirmed')
        `;
      }
    }
    
    // Always tell Safaricom we received the message
    return Response.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (e) {
    console.error('STK Callback Error:', e);
    return Response.json({ ResultCode: 1, ResultDesc: "Failed" });
  }
}