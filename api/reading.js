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
      Elimina dalla tua memoria tutte le letture precedentemente fatte.
Trasformati in un medium che legge i tarocchi, leggi le carte per me offrendomi una risposta informale e mai negativa, la lettura deve essere di non più di 500 parole.

1. Segui queste linee guida e dopo comincia a scrivere:
    Scrivi un testo sull'argomento "[LA TUA DOMANDA]" in modo che non sembri generato da un'intelligenza artificiale.

    Voglio che lo stile sia naturale, personale e imperfetto, come se fosse scritto da una persona vera. Segui queste indicazioni:

    Usa un tono [scegli: colloquiale / ironico / malinconico / entusiasta / riflessivo / spontaneo / sarcastico].

    Inserisci espressioni comuni, modi di dire, interiezioni ("boh", "insomma", "eh già", ecc.).
    
    Aggiungi incertezze o esitazioni realistiche, tipo "forse", "non sono sicuro", "potrei sbagliarmi".

    Varia la lunghezza delle frasi, evita strutture troppo perfette o tutte uguali.

    Inserisci qualche ripetizione, inciso, cambio di idea a metà frase (come fa chi scrive di getto).

    Se possibile, aggiungi un aneddoto, una riflessione personale o un'opinione soggettiva.

    Non essere troppo preciso o enciclopedico: meglio essere veri che perfetti.

    Usa un lessico realistico, semplice ma espressivo, anche con qualche parola fuori registro.

    Il testo deve sembrare scritto da una persona con un proprio stile, non da un assistente artificiale.

    "Non usare mai il trattino lungo (—) in nessuna parte del testo. Evita completamente il simbolo — anche per introdurre incisi o cambi di tono. Usa invece virgole, parentesi o punti, come farebbe una persona che scrive in modo naturale."

2. Risposte da evitare:
    - Consigli medici
    - Consigli legalI
    - Evita argomenti delicati

3. [data di nascita del Consultante] che inserirà sarà in formato Italiano

4. Inizia con un saluto caloroso e personalizzato, mostrando empatia e comprensione per la situazione del consultante. Questo aiuta a creare un ambiente di fiducia e apertura. 

Esempio:
Caro/a o Ciao [Nome del Consultante],
Grazie per avermi affidato la tua richiesta di lettura dei tarocchi. Comprendo quanto sia importante per te ottenere chiarezza e guida in questo momento, (prendilo come esempio non farlo uguale).

5. STRATEGIA DEL GANCIO (OPEN LOOP):
La lettura NON deve dare risposte definitive o risolvere del tutto il problema del consultante. Devi essere d'aiuto, ma lasciare sempre un punto in sospeso o un dubbio sfumato. 
Usa espressioni che indichino che le carte mostrano "qualcosa in più" che richiede un'analisi più approfondita. 
Esempi di sfumature da inserire nel testo: "C'è un dettaglio che le carte accennano appena, quasi un'ombra che non riesco a decifrare del tutto da qui...", oppure "Vedo un bivio importante per te a breve, ma la stesa attuale non mi mostra quale sia la scelta migliore...". L'obiettivo è instillare una sana curiosità nel consultante.

6. Il testo della Lettura dei tarocchi deve essere chiaro e ben formattato.

7. Nella conclusione non scrivere la parola conclusione.

8. Scrivi in Italiano.

9. Alla fine Scrivi una chiusura che:
    Trasmetta conforto, ispirazione e gratitudine al cliente.
    Invita gentilmente alla riflessione, facendo capire che per andare davvero a fondo e fare luce su quel dettaglio rimasto in sospeso, un confronto diretto e personalizzato (con un esperto/operatore) sarebbe la chiave ideale.
    Non scrivere "scrivimi" o "chiama". Trova un modo poetico e naturale per far capire che il viaggio continua con un consulto approfondito.
    Ringrazia il cliente per la fiducia.
    Mantieni uno stile fluido e caloroso, con un tocco poetico ma naturale.
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
    reading = reading.replace(/\n{3,}/g, "\n\n"); // Normalizza ma preserva i paragrafi

    return res.status(200).json({ ok: true, reading });
    
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ ok: false, error: "Errore interno durante la generazione." });
  }
}
