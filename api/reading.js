export default async function handler(req, res) {
  // Gestione CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, birthDate, question, cards } = req.body;
    
    // Assicurati che OPENAI_API_KEY sia impostata su Vercel
    const apiKey = process.env.OPENAI_API_KEY; 
    if (!apiKey) return res.status(500).json({ ok: false, error: "Chiave API non configurata." });

    const SYSTEM_PROMPT = `Elimina dalla tua memoria tutte le letture precedentemente fatte. Trasformati in un medium che legge i tarocchi. Leggi le carte offrendo una risposta informale e mai negativa. La lettura deve essere di non più di 500 parole. 
    [...inserisci qui il resto delle tue linee guida...]`;

    const userPrompt = `Consultante: ${name}
Data di nascita: ${birthDate}
Domanda: ${question}
Carte estratte:
- Passato: ${cards[0]}
- Presente: ${cards[1]}
- Futuro: ${cards[2]}
Genera la lettura in HTML.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("OpenAI Error:", data);
      return res.status(500).json({ ok: false, error: "Errore durante la generazione." });
    }

    let reading = data.choices[0].message.content.trim();
    reading = reading.replace(/—/g, ",");

    return res.status(200).json({ ok: true, reading });
    
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ ok: false, error: "Errore interno." });
  }
}
