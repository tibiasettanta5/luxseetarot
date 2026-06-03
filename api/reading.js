export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, birthDate, question, cards } = req.body;
    
    // Assicurati di avere la chiave su Vercel (Settings -> Environment Variables)
    const apiKey = process.env.OPENAI_API_KEY; 

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Sei un esperto di tarocchi. Rispondi in italiano, stile colloquiale, in HTML." },
          { role: "user", content: `Lettura per ${name} nata il ${birthDate}. Domanda: ${question}. Carte: ${cards.join(', ')}` }
        ],
      }),
    });

    const data = await response.json();
    return res.status(200).json({ ok: true, reading: data.choices[0].message.content });
    
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}
