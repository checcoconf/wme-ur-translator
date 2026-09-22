# WME UR Translator

Userscript per il **Waze Map Editor** che traduce le Update Request dentro il pannello della UR, senza
aprire finestre. La descrizione e la conversazione le leggi in italiano; quello che scrivi tu — comprese
le risposte pronte di [URComments-Enhanced](https://greasyfork.org/en/scripts/375430-wme-urcomments-enhanced)
— parte tradotto nella lingua del segnalante, scritto come si scrive nel suo paese.

Creato da **checcoconf** · licenza [GPL-3.0-or-later](LICENSE).

## Installazione

1. Installa [Tampermonkey](https://www.tampermonkey.net/) nel browser.
2. Apri questo link e conferma l'installazione:
   **[Installa / aggiorna WME UR Translator](https://github.com/checcoconf/wme-ur-translator/releases/latest/download/wme-ur-translator.user.js)**
3. Ricarica il WME, apri il pannello **Script** e la scheda **URT**: scegli il motore di traduzione e,
   se lo chiede, incolla la chiave. Premi **prova il motore** per verificare.

Gli aggiornamenti arrivano da soli: Tampermonkey controlla l'ultima release pubblicata.

## Il motore di traduzione

Tutti i motori sono **gratuiti**. L'unico motore AI è **Groq**: gratuito, senza carta di credito e
velocissimo.

| Motore | Chiave | Dove si prende | Note |
| --- | --- | --- | --- |
| **Groq** (consigliato) | gratuita, senza carta | [console.groq.com](https://console.groq.com/keys) | Velocissimo (di solito meno di un secondo), qualsiasi lingua e variante. Modello di serie `openai/gpt-oss-120b`. |
| DeepL | gratuita | [deepl.com/pro-api](https://www.deepl.com/pro-api) | Piano *API Free*: 500.000 caratteri al mese. Ottimo sulle lingue europee. |
| Google Traduttore | nessuna | — | Funziona subito, ma è il più letterale. |
| MyMemory | nessuna | — | Di scorta, qualità più bassa. |

Le chiavi restano salvate **solo nel tuo browser**.

Con Groq un'intera UR costa **una sola richiesta**: descrizione e tutti i messaggi, anche quelli degli
altri editor, partono insieme appena compaiono nel pannello, e il modello riconosce da sé la lingua di
ciascuno. Quello che stai inviando passa sempre davanti. Le traduzioni già fatte restano in memoria e non
vengono richieste due volte.

**Pronuncia e parole.** Al modello si passa la lingua del segnalante, con il paese, e le trappole di
pronuncia e di scrittura di quella lingua. Molte UR sono **dettate a voce** mentre si guida (il telefono
scrive parole che suonano come quelle dette ma non sono quelle), altre sono scritte **senza accenti**, con
**abbreviazioni da chat** o in **alfabeto latino** al posto del proprio (arabo con le cifre, greeklish,
russo traslitterato, hinglish): il modello prima ricostruisce quello che il segnalante ha detto, per come
suona, e poi lo traduce **parola per parola, senza saltarne nessuna**. I nomi di vie e località restano
come sono scritti.

**Modelli di riserva.** Sul piano gratuito di Groq ogni modello ha la sua quota: quando quello scelto è
al limite, sovraccarico o ha finito la quota del giorno risponde il primo libero della voce *Modelli di
riserva* (di serie `moonshotai/kimi-k2-instruct-0905`, `llama-3.3-70b-versatile`, `openai/gpt-oss-20b`), e
con *Cerca da solo altre riserve* acceso anche gli altri modelli di testo della tua chiave. Lo script
legge da ogni risposta i limiti veri del modello (richieste del giorno e token al minuto rimasti) e passa
alla riserva prima di prendere un errore. Se il modello tarda più del solito, parte anche la prima riserva
libera e vale la prima risposta corretta (voce *Se il modello tarda, parte anche la riserva*).

**Una risposta sbagliata non vince mai**, anche se arriva prima: vale solo se ha tutti i pezzi, le
variabili di URC-E e i link intatti, una lunghezza sensata ed è tradotta davvero.

C'è un tetto di richieste al minuto per ogni modello, regolabile dalla scheda (di serie 28, sotto il
limite di 30 del piano gratuito). La barra dice chi ha risposto, e la scheda mostra lo stato di ogni
modello, i tempi medi di risposta, le richieste rimaste oggi e i token usati nelle ultime 24 ore.

Google Traduttore di serie **non** entra mai al posto di Groq, perché traduce peggio: se vuoi che faccia
da ultima risorsa quando Groq non risponde, lo accendi dalla scheda.

## Come si usa

**Apri una UR** in una lingua che non conosci: sotto la descrizione e sotto ogni messaggio compare la
traduzione in italiano, e sopra la casella dei commenti la barra **URT**. Nelle UR chiuse o fuori dalla
tua area, dove non puoi scrivere, la barra compare ridotta sopra i messaggi, con lo stato e il pulsante
**↻** per ritradurre.

**Scrivi in italiano**, oppure scegli una risposta pronta di URC-E: il testo viene tradotto appena entra
nella casella, così lo rileggi prima di mandarlo.

**Premi Invia**, o fai il doppio clic di URC-E. Se il testo non era ancora tradotto viene tradotto e poi
inviato. Se la traduzione non riesce il messaggio **non parte**: premendo Invia una seconda volta parte
in italiano. Un clic ripetuto mentre sta traducendo non manda doppioni.

Dalla barra: il menù cambia la lingua di risposta per quella UR, **auto** accende o spegne la
traduzione prima dell'invio, **traduci** ritraduce la casella, **IT** rimette il tuo testo italiano per
correggerlo, **↻** ritraduce tutta la discussione. Scorciatoia **ALT + T** per tradurre la casella.

La traduzione è **fedele**: dice quello che hai scritto, nello stesso ordine e con lo stesso tono, senza
aggiungere saluti né togliere niente; cambia solo quello che serve perché la frase sia corretta in quella
lingua. Le variabili di URC-E (`$URD$`, `$SELSEGS$`, `$USERNAME$`...) e i link non vengono mai toccati.
In coda al messaggio viene aggiunta, nella lingua del segnalante, una riga che dichiara la traduzione
automatica: si toglie dalla scheda.

## Le lingue

La lingua di ogni UR la decide **Waze**: prima i dati della UR, poi la voce che il WME mostra fra le
*Impostazioni del conducente* ("Español (A. Latina)", "Português do Brasil", "English (US)"). Il
riconoscimento dal testo si usa solo se Waze non la dichiara.

Funziona con qualsiasi lingua e variante, e la risposta parte scritta come si scrive nel paese del
segnalante: inglese britannico o americano, spagnolo di Spagna, d'America Latina o argentino, portoghese
del Brasile o del Portogallo, tedesco svizzero, cinese tradizionale o semplificato, serbo latino o
cirillico, e così via.

Nella scheda indichi la tua lingua e quelle che capisci: sulle UR in queste lingue lo script **non
compare**, non traduce niente e non tocca l'invio.

## Configurazione avanzata

Per usare lo script non serve toccare il codice: tutto si regola dalla scheda URT e le scelte restano
salvate nel browser. In cima al file c'è comunque un blocco `CONFIG` con i valori di partenza — motore
di serie, motori che compaiono nel menù e in che ordine, modelli, modello per l'invio, modelli di riserva, corsa con la riserva, limiti di Groq, tetto di
richieste al minuto,
riga di traduzione automatica, ripiego su Google — utile a chi vuole pubblicare una propria variante dello script.
Se modifichi il file installato, ricorda che al prossimo aggiornamento viene sostituito.

## Se qualcosa non va

Con una UR aperta, apri la console del browser (F12) e scrivi `wurtDiag()`: mostra motore e chiave,
la lingua della UR e da dove arriva, i modelli (quello scelto, le riserve, quali sono a riposo,
quante richieste nell'ultimo minuto), cosa espone l'SDK, quanti messaggi ci sono e quanti ne sono stati
tradotti, più una tabella riquadro per riquadro. Allega quell'output quando apri una
[segnalazione](https://github.com/checcoconf/wme-ur-translator/issues).

I messaggi più comuni nella barra: **manca la chiave** — incollala nella scheda o scegli un motore che
non la chiede; **HTTP 503 / over capacity** — i server di Groq sono sovraccarichi, non dipende da te
né dalla chiave: lo script passa subito a una riserva e riprova da solo; **HTTP 429 / troppe
richieste** — hai superato il limite del tuo piano: se è quello al minuto lo script aspetta il turno,
se è quello del giorno passa a una riserva fino a quando la quota si rinnova; puoi abbassare il tetto
nella scheda; **risposta vuota** — fra parentesi c'è il
motivo dato dal servizio, di solito basta ritradurre con ↻. Se la barra non compare proprio, la UR è
quasi certamente in una lingua che hai segnato fra quelle che capisci.

## Regole Waze e privacy

Lo script lavora su una UR per volta e non scrive niente al posto tuo: traduce quello che stai già
inviando, nel momento in cui lo invii. Nessun sollecito né chiusura automatica. Il testo dei commenti
passa dal servizio di traduzione che scegli: non scrivere mai dati personali nelle UR. La traduzione
automatica può sbagliare, soprattutto sui nomi di strada: rileggi prima di mandare, perché quello che
finisce nella UR resta responsabilità tua.

Progetto indipendente, non collegato né approvato da Waze, da Groq o da URComments-Enhanced.

## Sviluppo e rilasci

Lo script vive in `wme-ur-translator.user.js`. Il sorgente resta **solo ASCII**: gli accenti si
scrivono con le sequenze `\uXXXX` (la CI lo controlla).

Il versionamento è manuale: alza la riga `// @version`, aggiungi in cima a `Changelog.md` la sezione
con lo stesso numero e fai push su `main`. La Action controlla la sintassi, genera il file `.meta.js`
per gli aggiornamenti di Tampermonkey e pubblica la release `v<versione>` usando come note la sezione
del changelog. Se la versione è già stata rilasciata non pubblica niente.

## Licenza

[GPL-3.0-or-later](LICENSE). Chi modifica e ridistribuisce lo script deve citare l'autore, dichiarare
le modifiche, pubblicare il codice con la stessa licenza e usare un nome diverso.