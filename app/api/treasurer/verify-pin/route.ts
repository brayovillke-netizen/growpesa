export async function POST(req: Request) {
  try {
    const { pin } = await req.json();
    
    // Accepts 6200 or whatever is in your Vercel settings
    if (pin === '6200' || pin === process.env.TREASURER_PIN) {
      return Response.json({ ok: true });
    }
    
    return Response.json({ error: 'Invalid PIN' }, { status: 401 });
  } catch (e) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}