export default async function handler(req, res) {
  // Gestione CORS per permettere la chiamata dal tuo frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const { name, birthDate, question, cards } = req.body;
    const apiKey = process.env.OPENAI_API_KEY; 

    if (!apiKey) return res.status(500).json({ ok: false, error: "Chiave API non configurata." });

    // System prompt "blindato" per evitare formattazioni errate
    const systemPrompt = `
      Sei un medium esperto di tarocchi. Rispondi in italiano con tono colloquiale, empatico e naturale.
      FORMATO OBBLIGATORIO:
      - Restituisci ESCLUSIVAMENTE codice HTML pulito.
      - Usa SOLO i tag <p> e <strong>.
      - NON USARE liste numerate (1., 2.), NON USARE titoli (<h1>, <h2>), NON USARE il trattino lungo (—).
      - NON inserire righe vuote o doppi a capo tra i paragrafi.
      - Struttura: Saluto iniziale, analisi delle tre carte in paragrafi separati, conclusione incoraggiante.
    `.trim();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Lettura per ${name} (nata il ${birthDate}). Domanda: ${question}. Carte estratte: ${cards.join(', ')}.` }
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI Error:", data);
      return res.status(500).json({ ok: false, error: "Errore dal servizio AI." });
    }

    // Pulizia avanzata della stringa di risposta
    let reading = data.choices[0].message.content.trim();
    reading = reading.replace(/—/g, ",");      // Rimuovi trattini lunghi
    reading = reading.replace(/\n\s*\n/g, ""); // Rimuovi spazi vuoti tra paragrafi

    return res.status(200).json({ ok: true, reading });
    
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ ok: false, error: "Errore interno durante la generazione." });
  }
}
