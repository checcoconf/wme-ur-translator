# Changelog

Tutte le versioni pubblicate di WME UR Translator. La Action usa la sezione della versione come
nota della release.

## [1.0.0] - 2026-09-22

Prima versione pubblica.

**Traduzione nel pannello della UR**
- La descrizione e **tutta la conversazione**, compresi i messaggi degli altri editor, compaiono
  tradotte in italiano sotto ogni riquadro, appena i messaggi compaiono nel pannello.
- Quello che scrivi, comprese le risposte pronte di URComments-Enhanced (anche con il doppio clic),
  parte tradotto nella lingua del segnalante. Se la traduzione non riesce il messaggio **non parte**.
- La lingua di ogni UR la decide Waze; il riconoscimento dal testo si usa solo se Waze non la dichiara.
  Qualsiasi lingua e variante, scritta come si scrive nel paese del segnalante (inglese britannico o
  americano, spagnolo di Spagna, d'America Latina o rioplatense, portoghese del Brasile o del
  Portogallo, tedesco svizzero, cinese tradizionale o semplificato...).
- Le variabili di URC-E (`$USERNAME$`, `$URD$`...) e i link non vengono mai toccati.
- Riga "tradotto automaticamente" in coda al messaggio, nella lingua del segnalante (si toglie dalla
  scheda).

**Traduzione fedele**
- Stesso contenuto, stesso ordine, stesso tono: niente aggiunte, niente tagli, ma frasi corrette con
  verbi, persone e accordi al loro posto.
- **Tutte le parole tradotte**, comprese quelle scritte male, gli intercalari e l'ultima frase anche se
  tronca; nessuna parola resta nella lingua di partenza, tranne nomi propri e sigle.
- **Pronuncia della lingua della UR**: al modello si passano la lingua del segnalante, con il paese, e
  le sue trappole di pronuncia e di scrittura. Le segnalazioni dettate a voce, scritte senza accenti, con
  abbreviazioni da chat o in alfabeto latino al posto del proprio (arabo con le cifre, greeklish, russo
  traslitterato, hinglish, vietnamita senza toni...) vengono prima ricostruite per come suonano e poi
  tradotte. Note specifiche per oltre 50 lingue e per le varianti che cambiano la pronuncia. I nomi di
  vie e località non vengono "corretti".
- Ogni risposta viene controllata prima di usarla (pezzi completi, variabili e link intatti, lunghezza
  sensata, testo tradotto davvero).

**Motori, tutti gratuiti**
- **Groq** (consigliato): velocissimo, qualsiasi lingua. Modello di serie `openai/gpt-oss-120b`.
- DeepL (piano API Free), Google Traduttore e MyMemory senza chiave.
- Descrizione e messaggi partono in **una sola richiesta**; le traduzioni restano in memoria.
- **Modelli di riserva** di Groq, ognuno con la sua quota gratuita (`kimi-k2-instruct-0905`,
  `llama-3.3-70b-versatile`, `gpt-oss-20b`), più la ricerca automatica degli altri modelli della chiave.
- Se il modello tarda, parte anche la riserva e vale la prima risposta corretta.
- I limiti veri di ogni modello si leggono dalle risposte di Groq: si passa alla riserva prima di un
  errore 429. Tetto di 28 richieste al minuto per modello; quello che invii passa davanti.

**Pannello e scheda**
- Barra URT sopra la casella: lingua di risposta, auto, traduci, IT, ↻; scorciatoia ALT + T. Nelle UR
  chiuse o fuori dalla tua area, barra ridotta con lo stato e ↻.
- Scheda URT nel pannello Script: motore, chiave, modelli, lingue che capisci, automatismi, stato dei
  modelli con tempi medi e richieste rimaste.
- `wurtDiag()` nella console per la diagnostica.