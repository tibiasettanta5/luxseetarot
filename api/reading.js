export default async function handler(req, res) {
  // 1. Permetti solo richieste POST
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { name, birthDate, question, cards } = req.body;
    
    // Verifica che la chiave sia presente
    const apiKey = process.env.OPENAI_API_KEY; 
    if (!apiKey) {
      return res.status(500).json({ ok: false, error: "Chiave API mancante." });
    }

    // 2. Prompt ottimizzato per restituire SOLO HTML pulito
    const systemPrompt = `
      Sei un medium esperto di tarocchi. Rispondi in italiano con tono colloquiale, empatico e naturale.
      FORMATO: Restituisci ESCLUSIVAMENTE codice HTML pulito (usa <p>, <strong>, <em>, <br>).
      NON USARE: liste numerate, titoli (<h1>, <h2>), trattini lunghi (—), o prefazioni come "Ecco la tua lettura".
      Struttura: Saluto iniziale, analisi delle tre carte in paragrafi separati, conclusione incoraggiante.
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

    // 3. Gestione errori risposta OpenAI
    if (!response.ok || !data.choices || !data.choices[0]) {
      console.error("OpenAI Error:", data);
      return res.status(500).json({ ok: false, error: "Errore dal servizio di intelligenza artificiale." });
    }

    // Pulisci il testo da eventuali trattini lunghi residui
    let reading = data.choices[0].message.content.trim();
    reading = reading.replace(/—/g, ",");

    return res.status(200).json({ ok: true, reading });
    
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ ok: false, error: "Errore interno durante la generazione." });
  }
}
