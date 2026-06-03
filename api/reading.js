import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const BodySchema = z.object({
  name: z.string().min(1).max(100),
  birthDate: z.string().min(1).max(50),
  question: z.string().min(3).max(1000),
  cards: z.array(z.string().min(1).max(80)).length(3),
});

const SYSTEM_PROMPT = `Elimina dalla tua memoria tutte le letture precedentemente fatte.

Trasformati in un medium che legge i tarocchi. Leggi le carte offrendo una risposta informale e mai negativa. La lettura deve essere di non più di 500 parole.

LINEE GUIDA DI STILE:
- Scrivi in modo che non sembri generato da un'intelligenza artificiale.
- Stile naturale, personale e imperfetto, come se fosse scritto da una persona vera.
- Tono colloquiale, riflessivo e spontaneo, con un tocco poetico.
- Inserisci espressioni comuni, modi di dire, interiezioni ("boh", "insomma", "eh già").
- Aggiungi incertezze realistiche ("forse", "non sono sicuro", "potrei sbagliarmi").
- Varia la lunghezza delle frasi, evita strutture troppo perfette.
- Inserisci qualche ripetizione, inciso, cambio di idea a metà frase.
- Aggiungi se possibile un aneddoto o una riflessione personale.
- Non essere enciclopedico: meglio veri che perfetti.
- Lessico realistico, semplice ma espressivo.
- NON USARE MAI il trattino lungo (—). Usa virgole, parentesi o punti.

RISPOSTE DA EVITARE:
- Consigli medici
- Consigli legali
- Argomenti delicati

FORMATO:
- Scrivi tassativamente in HTML (usa <p>, <strong>, <em>, <br/>; niente <html>, <head>, <body>, niente <h1>).
- Testo chiaro e ben formattato.
- Inizia con un saluto caloroso e personalizzato usando il nome del consultante, mostrando empatia (non copiare l'esempio).
- Considera la data di nascita in formato italiano (gg/mm/aaaa).
- Interpreta le tre carte nelle posizioni Passato, Presente, Futuro in relazione alla domanda.
- Nella conclusione NON scrivere la parola "conclusione".
- Chiudi con un messaggio che trasmetta conforto, ispirazione e gratitudine, inviti gentilmente alla riflessione o all'azione, e ringrazi per la fiducia. Stile fluido, caloroso, con tocco poetico ma naturale.
- Scrivi in italiano.`;

export const Route = createFileRoute("/api/public/reading")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.json();
          const parsed = BodySchema.safeParse(raw);
          if (!parsed.success) {
            return Response.json(
              { ok: false, error: "Dati non validi." },
              { status: 400 }
            );
          }
          const { name, birthDate, question, cards } = parsed.data;

          const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`, // Qui la tua API Key di OpenAI
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Il tuo motore specifico
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

          const userPrompt = `Consultante: ${name}
Data di nascita: ${birthDate}
Domanda: ${question}

Carte estratte:
- Passato: ${cards[0]}
- Presente: ${cards[1]}
- Futuro: ${cards[2]}

Genera ora la lettura dei tarocchi in HTML seguendo tutte le linee guida.`;

          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
              ],
            }),
          });

          if (!res.ok) {
            const text = await res.text();
            console.error("AI gateway error:", res.status, text);
            if (res.status === 429) {
              return Response.json(
                { ok: false, error: "Troppe richieste, riprova tra poco." },
                { status: 429 }
              );
            }
            if (res.status === 402) {
              return Response.json(
                { ok: false, error: "Crediti AI esauriti." },
                { status: 402 }
              );
            }
            return Response.json(
              { ok: false, error: "Le carte non rispondono ora." },
              { status: 500 }
            );
          }

          const data = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          let reading = data.choices?.[0]?.message?.content?.trim() ?? "";
          // Safety: strip any em-dashes if the model slips one through
          reading = reading.replace(/—/g, ",");

          if (!reading) {
            return Response.json(
              { ok: false, error: "Le carte non rispondono ora." },
              { status: 500 }
            );
          }

          return Response.json({ ok: true, reading });
        } catch (err) {
          console.error("reading handler failed:", err);
          return Response.json(
            { ok: false, error: "Le carte non rispondono ora." },
            { status: 500 }
          );
        }
      },
    },
  },
});
