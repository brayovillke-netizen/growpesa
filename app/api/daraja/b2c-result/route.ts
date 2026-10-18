import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = body.Result;

    // ResultCode 0 means the B2C payout was successful
    if (result?.ResultCode === 0) {
      const receipt = result.ResultParameters.ResultParameter
        .find((p: any) => p.Key === 'TransactionReceipt')?.Value;
      
      // We pass the loan ID when we initiate the B2C payment, so we grab it here
      const loanId = result.OriginatorConversationID.replace('GP-LOAN-', '');

      // AUTOMATION: Mark loan as paid out automatically
      await sql`
        update loans 
        set status = 'paid_out', receipt = ${receipt}, sent_at = now()
        where id = ${loanId}
      `;
    }
    
    return Response.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (e) {
    console.error('B2C Callback Error:', e);
    return Response.json({ ResultCode: 1, ResultDesc: "Failed" });
  }
}