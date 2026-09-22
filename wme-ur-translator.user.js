// ==UserScript==
// @name         WME UR Translator
// @namespace    wme-ur-translator
// @version      1.0.0
// @description  Traduce le UR dentro il pannello del Waze Map Editor: la conversazione la leggi in italiano, quello che scrivi (anche le risposte pronte di URC-E) parte tradotto nella lingua del segnalante. A cura di checcoconf.
// @author       Francesco Conforti (checcoconf)
// @copyright    2026 Francesco Conforti
// @homepageURL  https://github.com/checcoconf/wme-ur-translator
// @supportURL   https://github.com/checcoconf/wme-ur-translator/issues
// @updateURL    https://github.com/checcoconf/wme-ur-translator/releases/latest/download/wme-ur-translator.meta.js
// @downloadURL  https://github.com/checcoconf/wme-ur-translator/releases/latest/download/wme-ur-translator.user.js
// @icon         data:image/svg+xml,%3Csvg%20xmlns="http://www.w3.org/2000/svg"%20viewBox="0%200%2048%2048"%20width="48"%20height="48"%3E%20%3Cdefs%3E%3ClinearGradient%20id="wurtG"%20x1="0"%20y1="0"%20x2="1"%20y2="1"%3E%20%3Cstop%20offset="0"%20stop-color="%234f46e5"/%3E%3Cstop%20offset="1"%20stop-color="%230d9488"/%3E%3C/linearGradient%3E%3C/defs%3E%20%3Crect%20x="2"%20y="2"%20width="44"%20height="44"%20rx="12"%20fill="url%28%23wurtG%29"/%3E%20%3Ccircle%20cx="21"%20cy="20"%20r="10"%20fill="none"%20stroke="%23ffffff"%20stroke-width="2.6"/%3E%20%3Cpath%20d="M11%2020%20H31"%20stroke="%23ffffff"%20stroke-width="2.2"/%3E%20%3Cellipse%20cx="21"%20cy="20"%20rx="4.8"%20ry="10"%20fill="none"%20stroke="%23ffffff"%20stroke-width="2.2"/%3E%20%3Cpath%20d="M26%2028%20H40%20a3%203%200%200%201%203%203%20v7%20a3%203%200%200%201%20-3%203%20h-6%20l-5%204%20v-4%20h-3%20a3%203%200%200%201%20-3%20-3%20v-7%20a3%203%200%200%201%203%20-3%20z"%20fill="%23ffffff"%20stroke="%231f2937"%20stroke-width="1.2"/%3E%20%3Cpath%20d="M28.5%2034.5%20h9"%20stroke="%234f46e5"%20stroke-width="2.2"%20stroke-linecap="round"/%3E%20%3Cpath%20d="M28.5%2038%20h5.5"%20stroke="%230d9488"%20stroke-width="2.2"%20stroke-linecap="round"/%3E%20%3C/svg%3E
// @match        https://www.waze.com/editor*
// @match        https://www.waze.com/*/editor*
// @match        https://beta.waze.com/editor*
// @match        https://beta.waze.com/*/editor*
// @exclude      https://www.waze.com/user/editor*
// @exclude      https://www.waze.com/editor/sdk/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      translate.googleapis.com
// @connect      api.mymemory.translated.net
// @connect      api-free.deepl.com
// @connect      api.deepl.com
// @connect      api.groq.com
// @run-at       document-end
// @license      GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0.txt
// ==/UserScript==

/* global getWmeSdk, GM_xmlhttpRequest, GM_info */

/*
 * WME UR Translator
 * Copyright (C) 2026 Francesco Conforti (checcoconf)
 *
 * Questo programma e' software libero: puoi ridistribuirlo e/o modificarlo secondo i termini
 * della GNU General Public License come pubblicata dalla Free Software Foundation, nella
 * versione 3 della licenza o (a tua scelta) in una qualsiasi versione successiva.
 *
 * Il programma e' distribuito nella speranza che sia utile, ma SENZA ALCUNA GARANZIA, senza
 * neppure la garanzia implicita di COMMERCIABILITA' o IDONEITA' A UNO SCOPO PARTICOLARE.
 * Vedi la GNU General Public License per i dettagli: https://www.gnu.org/licenses/gpl-3.0.txt
 *
 * Se modifichi e ridistribuisci questo script devi: conservare questa nota di copyright,
 * indicare in modo evidente che si tratta di una versione modificata e da chi, pubblicare il
 * codice della tua versione con la stessa licenza, e usare un NOME DIVERSO dall'originale
 * ("WME UR Translator" identifica il progetto dell'autore, non i lavori derivati).
 *
 * Lo script non e' collegato ne' approvato da Waze, da URComments-Enhanced o dai servizi di
 * traduzione: si limita a lavorare sul pannello UR del WME e a chiamare il servizio che scegli tu.
 */

(function () {
    'use strict';

    /* ================================================================== */
    /* CONFIGURAZIONE                                                      */
    /* ================================================================== */
    /* Per usare lo script NON serve toccare il codice: tutto si regola dalla scheda "URT"
       nel pannello Script del WME (motore, chiave, modello, lingue, automatismi), e le
       scelte fatte li' restano salvate nel browser.

       Questo blocco decide solo i valori di PARTENZA, quelli che trova chi installa lo
       script per la prima volta. Se lo modifichi a mano ricorda che al prossimo
       aggiornamento il file viene sostituito e le modifiche si perdono.

       Motori disponibili, tutti gratuiti (il nome fra apici e' quello da usare qui sotto):
         'groq'       Groq               AI, chiave gratuita    https://console.groq.com/keys
         'deepl'      DeepL              chiave gratuita        https://www.deepl.com/pro-api
         'google'     Google Traduttore  gratis, senza chiave
         'mymemory'   MyMemory           gratis, senza chiave (qualita' piu' bassa)

       L'unico motore AI e' Groq: gratuito, senza carta di credito, e risponde di solito in meno
       di un secondo.                                                                          */
    const CONFIG = {
        // motore scelto alla prima installazione
        motore: 'groq',
        // motori che compaiono nel menu' della scheda, nell'ordine in cui compaiono:
        // per nasconderne uno basta toglierlo da questo elenco
        motoriNelMenu: ['groq', 'deepl', 'google', 'mymemory'],
        // modello di partenza di Groq (si cambia anche dalla scheda)
        modelli: { groq: 'openai/gpt-oss-120b' },
        // modello per quello che INVII (vuoto = lo stesso della conversazione)
        modelliInvio: { groq: '' },
        // tetto di richieste al minuto per ogni modello: il piano gratuito di Groq ne concede 30
        richiesteAlMinuto: 28,
        // modelli di riserva, provati in ordine quando quello scelto e' al limite, sovraccarico
        // o sparito. Su Groq ogni modello ha la sua quota gratuita: le riserve la moltiplicano.
        riserve: { groq: ['moonshotai/kimi-k2-instruct-0905', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b'] },
        // se il modello tarda piu' del solito, parte anche la prima riserva libera e vale la prima
        // risposta corretta: con Groq costa poco e non ti lascia mai ad aspettare
        corsaRiserva: true,
        // se anche le riserve sono ferme, prova gli altri modelli di testo della tua chiave Groq
        riserveAutomatiche: true,
        // limiti del piano gratuito di Groq quando il servizio non li dice (li vedi nella pagina
        // Limits della console): appena Groq risponde, lo script usa quelli veri di ogni modello
        limitiGroq: { tokenMinuto: 8000, tokenGiorno: 200000 },
        // riga "messaggio tradotto automaticamente" in coda a quello che mandi
        notaTraduzione: true,
        // se Groq non risponde, tradurre lo stesso con Google Traduttore
        ripiegoGoogle: false
    };

    /* Come sta dentro le "Guidelines for Bulk Editing Scripts" (Waze)
       - Nessun editing di massa: si lavora sulla UR aperta, un commento alla volta.
       - Non inventa e non manda messaggi: traduce quello che hai gia' deciso di mandare,
         nel momento in cui premi Invia (o il doppio clic di URC-E). Se la traduzione fallisce
         NON invia: te lo dice e aspetta.
       - Il testo del commento passa dal servizio di traduzione che scegli nelle impostazioni.
       - Codice pubblico su GitHub (vedi @homepageURL). */

    const SCRIPT_ID = 'wme-ur-translator';
    const SCRIPT_NAME = 'WME UR Translator';
    const SIGLA = 'URT';
    const AUTORE = 'checcoconf';
    const AUTORE_FULL = 'Francesco Conforti';
    const VERSION = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.version : 'dev';
    const STORE_KEY = 'wmeUrTranslator_v1';
    // v3: le istruzioni leggono il testo per come suona nella lingua del segnalante
    // (dettatura vocale, parole senza accenti, alfabeto latino): le traduzioni vecchie non si riusano.
    const CACHE_KEY = 'wmeUrTranslator_cache_v3';
    const CACHE_MAX = 800;

    const SLACK_ID = 'U0BHX22AFHS';
    const SLACK_URL = `https://slack.com/app_redirect?channel=${SLACK_ID}`;
    const CODE_LIC_URL = 'https://www.gnu.org/licenses/gpl-3.0.html';
    const GUIDA_URL = 'https://github.com/checcoconf/wme-ur-translator/blob/main/README.md';

    const log = (...a) => console.log(`${SCRIPT_NAME}:`, ...a);

    /* ------------------------------------------------------------------ */
    /* Selettori del pannello UR del WME                                   */
    /* ------------------------------------------------------------------ */

    // Stessi percorsi usati da URComments-Enhanced: se il WME li cambia, cambiano per tutti e due.
    const P = '.overlay-container wz-card[class^="panel"].problem-edit';
    const SEL = {
        panel: P,
        conversazione: `${P} div[class^="container"] .body .conversation`,
        lista: `${P} div[class^="container"] .body .conversation.section .conversation-view .comment-list`,
        form: `${P} div[class^="container"] .body .conversation .new-comment-form`,
        box: `${P} div[class^="container"] .body .conversation .new-comment-text`,
        invia: `${P} div[class^="container"] .body .conversation .new-comment-form .send-button`,
        descrizione: '.overlay-container div[class^="container"] .body .problem-data .description .content'
    };
    const q = s => document.querySelector(s);
    // La casella vera e' dentro lo shadow DOM del componente wz-textarea
    function areaTesto() {
        const b = q(SEL.box);
        if (!b) return null;
        if (b.shadowRoot) { const t = b.shadowRoot.querySelector('textarea[id^=wz-textarea-]'); if (t) return t; }
        return b.querySelector && b.querySelector('textarea');
    }
    // Scrive nella casella come fa URC-E: valore + evento input, cosi' il componente si aggiorna
    function scriviArea(testo) {
        const a = areaTesto();
        if (!a) return false;
        a.value = testo;
        a.dispatchEvent(new Event('input', { bubbles: true }));
        a.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
        try { a.setSelectionRange(testo.length, testo.length); } catch { /* pazienza */ }
        return true;
    }
    // Il percorso completo dei selettori cambia da una versione all'altra del WME:
    // per i messaggi si parte dalla casella dei commenti (quella la troviamo di sicuro,
    // altrimenti non monteremmo nemmeno la barra) e si sale al riquadro della discussione.
    const formCommento = () => q(SEL.form)
        || document.querySelector(`${P} .new-comment-form`)
        || document.querySelector('.overlay-container .new-comment-form');
    const pannelloAperto = () => q(SEL.panel) || formCommento();
    const descrizioneEl = () => q(SEL.descrizione) || document.querySelector('.problem-data .description .content');

    // Il numero della UR scritto nel pannello: serve quando si passa alla UR successiva
    // con "Avanti" e il WME non manda l'evento di apertura.
    function idDalPannello() {
        const t = document.querySelector(`${P} div[class^="container"] .sub-title`)
            || document.querySelector('.overlay-container div[class^="container"] .sub-title');
        const m = t && String(t.textContent || '').match(/\((\d{4,})\)/);
        return m ? Number(m[1]) : null;
    }

    function riquadroConversazione() {
        const form = formCommento();
        if (form) return form.closest('.conversation') || form.closest('.conversation-view') || form.parentElement;
        return q(SEL.conversazione) || document.querySelector(`${P} .conversation`);
    }
    // Solo l'elenco vero dei messaggi. Prima, quando la UR non aveva commenti, si ripiegava
    // sull'intero riquadro e finivano dentro le scritte del WME ("Nessun commento...") e i
    // pulsanti di URC-E: roba che non va tradotta e che faceva sbagliare la lingua.
    function listaCommenti() {
        const dentro = riquadroConversazione();
        if (!dentro) return q(SEL.lista);
        return dentro.querySelector('.comment-list') || dentro.querySelector('.conversation-view') || null;
    }
    // Le voci: prima quelle con la classe attesa, poi qualunque wz-list-item, infine i
    // figli diretti del riquadro. Si esclude sempre la zona di scrittura.
    function vociCommento() {
        const lista = listaCommenti();
        if (!lista) return [];
        // Si raccoglie da tutte le parti: nel WME i messaggi del segnalante e quelli degli
        // editor non sempre hanno la stessa struttura, e fermarsi al primo tentativo che
        // dava qualcosa faceva sparire meta' discussione.
        const insieme = new Set();
        ['wz-list-item.comment', '.comment', 'wz-list-item'].forEach(sel => {
            lista.querySelectorAll(sel).forEach(el => insieme.add(el));
        });
        Array.prototype.slice.call(lista.children).forEach(el => insieme.add(el));
        let voci = Array.from(insieme).filter(el => el && el.nodeType === 1
            && !el.closest('.new-comment-form')
            && !/^wurt/.test(el.id || '')
            && !el.classList.contains('wurt-tr')
            && normalizza(el.textContent || '').length > 2);
        // se una voce ne contiene un'altra si tiene solo quella piu' esterna
        voci = voci.filter(el => !voci.some(altra => altra !== el && altra.contains(el)));
        // e si rimettono nell'ordine in cui stanno nel pannello
        voci.sort((a, c) => (a.compareDocumentPosition(c) & 4) ? -1 : 1);
        return voci;
    }


    /* ------------------------------------------------------------------ */
    /* Lingue                                                              */
    /* ------------------------------------------------------------------ */

    /* Il browser conosce gia' i nomi di QUALSIASI lingua, paese e alfabeto (Intl): cosi' lo
       script riconosce e sa chiamare per nome anche lingue e varianti che nell'elenco qui sotto
       non ci sono (spagnolo del Peru', arabo d'Egitto, inglese di Singapore, giavanese...).
       Nessuna lingua viene scartata perche' "non e' in elenco". */
    const intl = (() => {
        const fai = (loc, type) => { try { return new Intl.DisplayNames(loc, { type, fallback: 'none' }); } catch { return null; } };
        return { fai, lingua: fai(['it'], 'language'), paese: fai(['it'], 'region'), script: fai(['it'], 'script') };
    })();
    const leggiIntl = (dn, c) => { try { return (dn && c && dn.of(c)) || ''; } catch { return ''; } };
    const maiuscola = x => x ? x.charAt(0).toUpperCase() + x.slice(1) : '';
    const minuscola = x => x ? x.charAt(0).toLowerCase() + x.slice(1) : '';
    const nomeIntl = c => leggiIntl(intl.lingua, c);            // "spagnolo (Peru')"
    const nomePaese = r => leggiIntl(intl.paese, r);            // "Peru'"
    const nomeScript = sc => leggiIntl(intl.script, sc);        // "latino", "cirillico"
    const cacheNativi = new Map();
    function nativoIntl(c) {                                    // "espanol (Peru)" scritto da un peruviano
        if (!c) return '';
        if (!cacheNativi.has(c)) cacheNativi.set(c, leggiIntl(intl.fai([c], 'language'), c));
        return cacheNativi.get(c);
    }
    // I pezzi di un codice: lingua, alfabeto (4 lettere), paese (2 lettere o 3 cifre)
    function partiCodice(c) {
        const pezzi = String(c || '').split('-');
        return {
            lingua: (pezzi[0] || '').toLowerCase(),
            script: pezzi.slice(1).find(x => /^[A-Za-z]{4}$/.test(x)) || '',
            regione: (pezzi.slice(1).find(x => /^[A-Za-z]{2}$|^[0-9]{3}$/.test(x)) || '').toUpperCase()
        };
    }
    // Alfabeto e paese "di casa" di una lingua, come li deduce il browser (sr -> cirillico, Serbia)
    const cacheMax = new Map();
    function massimizza(c) {
        if (!cacheMax.has(c)) {
            let v = { script: '', regione: '' };
            try { const l = new Intl.Locale(c).maximize(); v = { script: l.script || '', regione: l.region || '' }; } catch { /* niente */ }
            cacheMax.set(c, v);
        }
        return cacheMax.get(c);
    }

    // codice, nome in italiano, nome nella lingua stessa (come lo scrive Waze nel profilo)
    // Le varianti regionali sono lingue a parte: l'inglese di Londra, di New York e di Sydney,
    // lo spagnolo di Madrid e quello di Buenos Aires non si scrivono allo stesso modo
    // (ortografia, vocaboli, forme di cortesia). Vedi SCRITTURA piu' sotto.
    const LINGUE = [
        ['it', 'Italiano', 'Italiano'],
        ['en', 'Inglese (Regno Unito)', 'English (UK)'], ['en-US', 'Inglese (USA)', 'English (US)'],
        ['en-CA', 'Inglese (Canada)', 'English (Canada)'], ['en-AU', 'Inglese (Australia)', 'English (Australia)'],
        ['en-NZ', 'Inglese (Nuova Zelanda)', 'English (New Zealand)'], ['en-IE', 'Inglese (Irlanda)', 'English (Ireland)'],
        ['en-IN', 'Inglese (India)', 'English (India)'], ['en-ZA', 'Inglese (Sudafrica)', 'English (South Africa)'],
        ['es', 'Spagnolo (Spagna)', 'Espa\u00f1ol (Espa\u00f1a)'],
        ['es-419', 'Spagnolo (America Latina)', 'Espa\u00f1ol (Latinoam\u00e9rica)'],
        ['es-MX', 'Spagnolo (Messico)', 'Espa\u00f1ol (M\u00e9xico)'], ['es-AR', 'Spagnolo (Argentina)', 'Espa\u00f1ol (Argentina)'],
        ['es-CO', 'Spagnolo (Colombia)', 'Espa\u00f1ol (Colombia)'], ['es-CL', 'Spagnolo (Cile)', 'Espa\u00f1ol (Chile)'],
        ['fr', 'Francese (Francia)', 'Fran\u00e7ais (France)'], ['fr-CA', 'Francese (Canada)', 'Fran\u00e7ais (Canada)'],
        ['fr-BE', 'Francese (Belgio)', 'Fran\u00e7ais (Belgique)'], ['fr-CH', 'Francese (Svizzera)', 'Fran\u00e7ais (Suisse)'],
        ['de', 'Tedesco (Germania)', 'Deutsch (Deutschland)'], ['de-AT', 'Tedesco (Austria)', 'Deutsch (\u00d6sterreich)'],
        ['de-CH', 'Tedesco (Svizzera)', 'Deutsch (Schweiz)'],
        ['pt-PT', 'Portoghese (Portogallo)', 'Portugu\u00eas (Portugal)'], ['pt-BR', 'Portoghese (Brasile)', 'Portugu\u00eas do Brasil'],
        ['nl', 'Olandese (Paesi Bassi)', 'Nederlands (Nederland)'], ['nl-BE', 'Olandese (Belgio)', 'Nederlands (Belgi\u00eb)'],
        ['pl', 'Polacco', 'Polski'], ['ro', 'Rumeno', 'Rom\u00e2n\u0103'], ['ru', 'Russo', '\u0420\u0443\u0441\u0441\u043a\u0438\u0439'],
        ['uk', 'Ucraino', '\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430'], ['be', 'Bielorusso', '\u0411\u0435\u043b\u0430\u0440\u0443\u0441\u043a\u0430\u044f'],
        ['cs', 'Ceco', '\u010ce\u0161tina'], ['sk', 'Slovacco', 'Sloven\u010dina'], ['sl', 'Sloveno', 'Sloven\u0161\u010dina'],
        ['hr', 'Croato', 'Hrvatski'], ['sr', 'Serbo (cirillico)', '\u0421\u0440\u043f\u0441\u043a\u0438'],
        ['sr-Latn', 'Serbo (latino)', 'Srpski (latinica)'], ['bs', 'Bosniaco', 'Bosanski'],
        ['mk', 'Macedone', '\u041c\u0430\u043a\u0435\u0434\u043e\u043d\u0441\u043a\u0438'], ['sq', 'Albanese', 'Shqip'],
        ['bg', 'Bulgaro', '\u0411\u044a\u043b\u0433\u0430\u0440\u0441\u043a\u0438'], ['el', 'Greco', '\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac'],
        ['tr', 'Turco', 'T\u00fcrk\u00e7e'], ['hu', 'Ungherese', 'Magyar'], ['fi', 'Finlandese', 'Suomi'],
        ['sv', 'Svedese', 'Svenska'], ['no', 'Norvegese', 'Norsk'], ['da', 'Danese', 'Dansk'],
        ['is', 'Islandese', '\u00cdslenska'], ['fo', 'Faroese', 'F\u00f8royskt'], ['et', 'Estone', 'Eesti'],
        ['lv', 'Lettone', 'Latvie\u0161u'], ['lt', 'Lituano', 'Lietuvi\u0173'], ['ca', 'Catalano', 'Catal\u00e0'],
        ['gl', 'Galiziano', 'Galego'], ['eu', 'Basco', 'Euskara'], ['mt', 'Maltese', 'Malti'],
        ['ga', 'Irlandese', 'Gaeilge'], ['cy', 'Gallese', 'Cymraeg'], ['lb', 'Lussemburghese', 'L\u00ebtzebuergesch'],
        ['fy', 'Frisone', 'Frysk'], ['af', 'Afrikaans', 'Afrikaans'],
        ['ar', 'Arabo', '\u0627\u0644\u0639\u0631\u0628\u064a\u0629'], ['he', 'Ebraico', '\u05e2\u05d1\u05e8\u05d9\u05ea'],
        ['fa', 'Persiano', '\u0641\u0627\u0631\u0633\u06cc'], ['ur', 'Urdu', '\u0627\u0631\u062f\u0648'],
        ['ps', 'Pashto', '\u067e\u069a\u062a\u0648'], ['ku', 'Curdo', 'Kurd\u00ee'],
        ['ka', 'Georgiano', '\u10e5\u10d0\u10e0\u10d7\u10e3\u10da\u10d8'], ['hy', 'Armeno', '\u0540\u0561\u0575\u0565\u0580\u0565\u0576'],
        ['az', 'Azero', 'Az\u0259rbaycan'], ['kk', 'Kazako', '\u049a\u0430\u0437\u0430\u049b\u0448\u0430'],
        ['ky', 'Kirghiso', '\u041a\u044b\u0440\u0433\u044b\u0437\u0447\u0430'], ['uz', 'Uzbeco', 'O\u02bbzbekcha'],
        ['tg', 'Tagico', '\u0422\u043e\u04b7\u0438\u043a\u04e3'], ['tk', 'Turkmeno', 'T\u00fcrkmen\u00e7e'],
        ['mn', 'Mongolo', '\u041c\u043e\u043d\u0433\u043e\u043b'], ['hi', 'Hindi', '\u0939\u093f\u0928\u094d\u0926\u0940'],
        ['bn', 'Bengalese', '\u09ac\u09be\u0982\u09b2\u09be'], ['pa', 'Punjabi', '\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40'],
        ['gu', 'Gujarati', '\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0'], ['mr', 'Marathi', '\u092e\u0930\u093e\u0920\u0940'],
        ['ta', 'Tamil', '\u0ba4\u0bae\u0bbf\u0bb4\u0bcd'], ['te', 'Telugu', '\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41'],
        ['kn', 'Kannada', '\u0c95\u0ca8\u0ccd\u0ca8\u0ca1'], ['ml', 'Malayalam', '\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02'],
        ['si', 'Singalese', '\u0dc3\u0dd2\u0d82\u0dc4\u0dbd'], ['ne', 'Nepalese', '\u0928\u0947\u092a\u093e\u0932\u0940'],
        ['my', 'Birmano', '\u1019\u103c\u1014\u103a\u1019\u102c'], ['km', 'Khmer', '\u1781\u17d2\u1798\u17c2\u179a'],
        ['lo', 'Lao', '\u0ea5\u0eb2\u0ea7'], ['th', 'Thai', '\u0e44\u0e17\u0e22'],
        ['vi', 'Vietnamita', 'Ti\u1ebfng Vi\u1ec7t'], ['id', 'Indonesiano', 'Bahasa Indonesia'],
        ['ms', 'Malese', 'Bahasa Melayu'], ['fil', 'Filippino', 'Filipino'],
        ['ja', 'Giapponese', '\u65e5\u672c\u8a9e'], ['ko', 'Coreano', '\ud55c\uad6d\uc5b4'],
        ['zh-CN', 'Cinese semplificato', '\u7b80\u4f53\u4e2d\u6587'], ['zh-TW', 'Cinese tradizionale (Taiwan)', '\u7e41\u9ad4\u4e2d\u6587'],
        ['zh-HK', 'Cinese tradizionale (Hong Kong)', '\u7e41\u9ad4\u4e2d\u6587 (\u9999\u6e2f)'],
        ['sw', 'Swahili', 'Kiswahili'], ['am', 'Amarico', '\u12a0\u121b\u122d\u129b'],
        ['so', 'Somalo', 'Soomaali'], ['ha', 'Hausa', 'Hausa'], ['yo', 'Yoruba', 'Yor\u00f9b\u00e1'],
        ['ig', 'Igbo', 'Igbo'], ['zu', 'Zulu', 'isiZulu'], ['xh', 'Xhosa', 'isiXhosa'],
        ['st', 'Sotho', 'Sesotho'], ['rw', 'Kinyarwanda', 'Kinyarwanda'], ['mg', 'Malgascio', 'Malagasy'],
        ['ht', 'Creolo haitiano', 'Krey\u00f2l ayisyen']
    ];
    // Bandierina per ogni lingua: il paese e' quello che la rappresenta di piu'.
    // Dove una lingua e' di tanti paesi (arabo, swahili) se ne sceglie uno solo.
    const PAESE = {
        it: 'IT', en: 'GB', 'en-US': 'US', 'en-CA': 'CA', 'en-AU': 'AU', 'en-NZ': 'NZ', 'en-IE': 'IE', 'en-IN': 'IN', 'en-ZA': 'ZA',
        es: 'ES', 'es-MX': 'MX', 'es-AR': 'AR', 'es-CO': 'CO', 'es-CL': 'CL',
        fr: 'FR', 'fr-CA': 'CA', 'fr-BE': 'BE', 'fr-CH': 'CH', de: 'DE', 'de-AT': 'AT', 'de-CH': 'CH',
        'pt-PT': 'PT', 'pt-BR': 'BR', nl: 'NL', 'nl-BE': 'BE', 'sr-Latn': 'RS', 'zh-HK': 'HK', pl: 'PL',
        ro: 'RO', ru: 'RU', uk: 'UA', be: 'BY', cs: 'CZ', sk: 'SK', sl: 'SI', hr: 'HR', sr: 'RS', bs: 'BA',
        mk: 'MK', sq: 'AL', bg: 'BG', el: 'GR', tr: 'TR', hu: 'HU', fi: 'FI', sv: 'SE', no: 'NO', da: 'DK',
        is: 'IS', fo: 'FO', et: 'EE', lv: 'LV', lt: 'LT', ca: 'ES', gl: 'ES', eu: 'ES', mt: 'MT', ga: 'IE',
        cy: 'GB', lb: 'LU', fy: 'NL', af: 'ZA', ar: 'SA', he: 'IL', fa: 'IR', ur: 'PK', ps: 'AF', ku: 'IQ',
        ka: 'GE', hy: 'AM', az: 'AZ', kk: 'KZ', ky: 'KG', uz: 'UZ', tg: 'TJ', tk: 'TM', mn: 'MN', hi: 'IN',
        bn: 'BD', pa: 'IN', gu: 'IN', mr: 'IN', ta: 'IN', te: 'IN', kn: 'IN', ml: 'IN', si: 'LK', ne: 'NP',
        my: 'MM', km: 'KH', lo: 'LA', th: 'TH', vi: 'VN', id: 'ID', ms: 'MY', fil: 'PH', ja: 'JP', ko: 'KR',
        'zh-CN': 'CN', 'zh-TW': 'TW', sw: 'TZ', am: 'ET', so: 'SO', ha: 'NG', yo: 'NG', ig: 'NG', zu: 'ZA',
        xh: 'ZA', st: 'LS', rw: 'RW', mg: 'MG', ht: 'HT'
    };
    /* Altre lingue e varianti di paese da poter scegliere a mano nel menu': i nomi li da' il
       browser. Una UR in una lingua o variante che qui non c'e' funziona lo stesso, perche'
       la lingua arriva dalla UR e non dal menu': questo elenco serve solo alla scelta a mano. */
    const LINGUE_IN_PIU = ('jv su ceb ilo haw mi sm to fj eo la yi gd co br oc sc fur rm nn ug bo dz ti om wo ln sn ny '
        + 'tn ts ss ve ak ee ff bm lg qu gn ay tt ba cv ce os sd or as dv ckb hmn sa nso kok mai mni bho').split(' ');
    const VARIANTI_MENU = {
        en: 'US CA AU NZ IE IN ZA PH SG NG KE GH JM MT PK',
        es: '419 MX AR CO CL PE VE EC BO PY UY CR PA GT HN SV NI CU DO PR US GQ',
        fr: 'CA BE CH LU MC SN CI CM CD MA DZ TN HT',
        pt: 'BR AO MZ CV GW ST TL',
        de: 'AT CH LU LI BE',
        nl: 'BE SR',
        ar: 'EG MA DZ TN LY SD AE QA KW BH OM YE JO LB SY IQ PS',
        sv: 'FI', sw: 'KE UG', ms: 'SG BN', ta: 'LK SG', bn: 'IN', ur: 'IN', fa: 'AF', zh: 'SG'
    };
    (() => {
        const visti = new Set(LINGUE.map(l => l[0]));
        const aggiungi = c => {
            if (visti.has(c)) return;
            const n = nomeIntl(c);
            if (!n || n.toLowerCase() === c.toLowerCase()) return;   // il browser non la conosce
            visti.add(c);
            LINGUE.push([c, maiuscola(n), maiuscola(nativoIntl(c) || n)]);
        };
        LINGUE_IN_PIU.forEach(aggiungi);
        Object.keys(VARIANTI_MENU).forEach(b => VARIANTI_MENU[b].split(' ').forEach(r => aggiungi(b + '-' + r)));
    })();

    // Le due lettere del paese diventano una bandierina: dove il sistema non ha il disegno
    // (succede su Windows) il browser mostra da solo le due lettere, che vanno bene lo stesso.
    // Il paese: quello scritto nel codice (es-PE -> Peru'), altrimenti quello di casa della lingua.
    function bandiera(c) {
        if (!c || settings.bandiere === false) return '';
        if (c === 'es-419') return '\u{1f30e}';      // America Latina: non c'e' una bandiera, si usa il globo
        const lingua = String(c).split('-')[0].toLowerCase();
        const reg = partiCodice(c).regione;
        const p = PAESE[c] || (/^[A-Z]{2}$/.test(reg) ? reg : '') || PAESE[lingua] || massimizza(lingua).regione;
        if (!p || !/^[A-Z]{2}$/.test(p)) return '';
        return String.fromCodePoint(0x1f1e6 + p.charCodeAt(0) - 65, 0x1f1e6 + p.charCodeAt(1) - 65);
    }

    const NOMI = new Map(LINGUE.map(l => [l[0], l[1]]));
    const NATIVI = new Map(LINGUE.map(l => [l[0], l[2]]));
    // Quello che non e' in elenco lo nomina il browser: "Spagnolo (Peru')", "Arabo (Egitto)"
    const nomeLingua = c => NOMI.get(c) || maiuscola(nomeIntl(c)) || (c || 'sconosciuta');
    const nomeNativo = c => NATIVI.get(c) || maiuscola(nativoIntl(c)) || '';
    const sigla = c => (c || '??').split('-')[0].toUpperCase();
    const etichettaLingua = c => {
        const b = bandiera(c);
        const n = nomeLingua(c), v = nomeNativo(c);
        const nome = (v && v !== n) ? `${n} \u00b7 ${v}` : n;
        return b ? `${b} ${nome}` : nome;
    };
    // Per i posti stretti (le righe tradotte, i riquadri): bandierina se c'e', sigla se no
    const segnoLingua = c => bandiera(c) || sigla(c);

    // Waze non scrive sempre un codice: a volte arriva il nome della lingua nella lingua
    // stessa (\u0627\u0644\u0639\u0631\u0628\u064a\u0629, \u0420\u0443\u0441\u0441\u043a\u0438\u0439, \u65e5\u672c\u8a9e) oppure in inglese. Qui si riconoscono tutti e tre i modi.
    const chiaveNome = s => String(s || '').toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\u0370-\uffff]/g, '');
    const ALIAS_NOME = (() => {
        const m = new Map();
        LINGUE.forEach(([c, n, v]) => { m.set(chiaveNome(n), c); m.set(chiaveNome(v), c); });
        [['english', 'en'], ['italian', 'it'], ['spanish', 'es'], ['castellano', 'es'], ['french', 'fr'],
        ['latinamericanspanish', 'es-419'], ['espanollatinoamerica', 'es-419'], ['spanishlatinamerica', 'es-419'],
        ['americanenglish', 'en-US'], ['englishus', 'en-US'], ['canadianfrench', 'fr-CA'], ['francaiscanada', 'fr-CA'],
        ['german', 'de'], ['portuguese', 'pt-PT'], ['brazilianportuguese', 'pt-BR'], ['dutch', 'nl'],
        ['flemish', 'nl-BE'], ['vlaams', 'nl-BE'], ['polish', 'pl'], ['romanian', 'ro'], ['russian', 'ru'],
        ['ukrainian', 'uk'], ['belarusian', 'be'], ['czech', 'cs'], ['slovak', 'sk'], ['slovenian', 'sl'],
        ['croatian', 'hr'], ['serbian', 'sr'], ['bosnian', 'bs'], ['macedonian', 'mk'], ['albanian', 'sq'],
        ['bulgarian', 'bg'], ['greek', 'el'], ['turkish', 'tr'], ['hungarian', 'hu'], ['finnish', 'fi'],
        ['swedish', 'sv'], ['norwegian', 'no'], ['bokmal', 'no'], ['nynorsk', 'nn'], ['norwegiannynorsk', 'nn'], ['danish', 'da'],
        ['icelandic', 'is'], ['estonian', 'et'], ['latvian', 'lv'], ['lithuanian', 'lt'], ['catalan', 'ca'],
        ['galician', 'gl'], ['basque', 'eu'], ['maltese', 'mt'], ['irish', 'ga'], ['welsh', 'cy'],
        ['arabic', 'ar'], ['hebrew', 'he'], ['ivrit', 'he'], ['persian', 'fa'], ['farsi', 'fa'],
        ['pashto', 'ps'], ['kurdish', 'ku'], ['georgian', 'ka'], ['armenian', 'hy'], ['azerbaijani', 'az'],
        ['kazakh', 'kk'], ['kyrgyz', 'ky'], ['uzbek', 'uz'], ['tajik', 'tg'], ['turkmen', 'tk'],
        ['mongolian', 'mn'], ['bengali', 'bn'], ['punjabi', 'pa'], ['sinhala', 'si'], ['nepali', 'ne'],
        ['burmese', 'my'], ['myanmar', 'my'], ['khmer', 'km'], ['cambodian', 'km'], ['thai', 'th'],
        ['vietnamese', 'vi'], ['indonesian', 'id'], ['malay', 'ms'], ['filipino', 'fil'], ['tagalog', 'fil'],
        ['japanese', 'ja'], ['korean', 'ko'], ['chinese', 'zh-CN'], ['simplifiedchinese', 'zh-CN'],
        ['traditionalchinese', 'zh-TW'], ['mandarin', 'zh-CN'], ['swahili', 'sw'], ['amharic', 'am'],
        ['somali', 'so'], ['zulu', 'zu'], ['xhosa', 'xh'], ['malagasy', 'mg'], ['haitiancreole', 'ht'],
        // i nomi nudi, senza paese: nell'elenco ora hanno la variante fra parentesi
        ['inglese', 'en'], ['spagnolo', 'es'], ['espanol', 'es'], ['francese', 'fr'], ['francais', 'fr'],
        ['tedesco', 'de'], ['deutsch', 'de'], ['olandese', 'nl'], ['nederlands', 'nl'],
        ['portoghese', 'pt-PT'], ['portugues', 'pt-PT'], ['serbo', 'sr'], ['cinesetradizionale', 'zh-TW'],
        // e le varianti scritte in inglese
        ['britishenglish', 'en'], ['englishunitedkingdom', 'en'], ['englishgb', 'en'],
        ['englishunitedstates', 'en-US'], ['canadianenglish', 'en-CA'], ['australianenglish', 'en-AU'],
        ['newzealandenglish', 'en-NZ'], ['irishenglish', 'en-IE'], ['indianenglish', 'en-IN'],
        ['southafricanenglish', 'en-ZA'], ['mexicanspanish', 'es-MX'], ['argentinespanish', 'es-AR'],
        ['argentinianspanish', 'es-AR'], ['rioplatense', 'es-AR'], ['colombianspanish', 'es-CO'],
        ['chileanspanish', 'es-CL'], ['europeanspanish', 'es'], ['europeanportuguese', 'pt-PT'],
        ['belgianfrench', 'fr-BE'], ['swissfrench', 'fr-CH'], ['austriangerman', 'de-AT'],
        ['swissgerman', 'de-CH'], ['schweizerdeutsch', 'de-CH'], ['serbianlatin', 'sr-Latn'],
        ['cantonese', 'zh-HK']
        ].forEach(([n, c]) => m.set(chiaveNome(n), c));
        return m;
    })();

    // Paesi di lingua spagnola dell'America Latina (piu' il 419, che e' proprio "America Latina")
    const AMERICA_LATINA = new Set(['419', 'MX', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY',
        'CR', 'CU', 'DO', 'GT', 'HN', 'NI', 'PA', 'SV', 'PR', 'US']);

    // Codici a tre lettere (ISO 639-2) che ogni tanto arrivano al posto di quelli a due
    const TRE_LETTERE = {
        ara: 'ar', heb: 'he', per: 'fa', fas: 'fa', urd: 'ur', pus: 'ps', kur: 'ku', eng: 'en', ita: 'it',
        spa: 'es', fre: 'fr', fra: 'fr', ger: 'de', deu: 'de', por: 'pt', dut: 'nl', nld: 'nl', pol: 'pl',
        rum: 'ro', ron: 'ro', rus: 'ru', ukr: 'uk', bel: 'be', cze: 'cs', ces: 'cs', slo: 'sk', slk: 'sk',
        slv: 'sl', hrv: 'hr', srp: 'sr', bos: 'bs', mac: 'mk', mkd: 'mk', alb: 'sq', sqi: 'sq', bul: 'bg',
        gre: 'el', ell: 'el', tur: 'tr', hun: 'hu', fin: 'fi', swe: 'sv', nor: 'no', nob: 'no', nno: 'nn', dan: 'da',
        ice: 'is', isl: 'is', est: 'et', lav: 'lv', lit: 'lt', cat: 'ca', glg: 'gl', baq: 'eu', eus: 'eu',
        mlt: 'mt', gle: 'ga', wel: 'cy', cym: 'cy', geo: 'ka', kat: 'ka', arm: 'hy', hye: 'hy', aze: 'az',
        kaz: 'kk', kir: 'ky', uzb: 'uz', tgk: 'tg', tuk: 'tk', mon: 'mn', hin: 'hi', ben: 'bn', pan: 'pa',
        guj: 'gu', mar: 'mr', tam: 'ta', tel: 'te', kan: 'kn', mal: 'ml', sin: 'si', nep: 'ne', bur: 'my',
        mya: 'my', khm: 'km', lao: 'lo', tha: 'th', vie: 'vi', ind: 'id', may: 'ms', msa: 'ms', fil: 'fil',
        tgl: 'fil', jpn: 'ja', kor: 'ko', chi: 'zh', zho: 'zh', swa: 'sw', amh: 'am', som: 'so',
        zul: 'zu', xho: 'xh', mlg: 'mg', hat: 'ht', afr: 'af', ice2: 'is'
    };

    function normLang(raw) {
        if (raw == null) return '';
        const grezzo = String(raw).trim();
        if (!grezzo) return '';
        // 1) sembra un codice: it, en-US, pt_BR, zh-Hans-CN
        if (/^[a-z]{2,3}([-_][a-z0-9]{2,8})*$/i.test(grezzo)) {
            const pezzi = grezzo.replace(/_/g, '-').split('-');
            let b = pezzi[0].toLowerCase();
            let regione = (pezzi.slice(1).find(x => /^[A-Za-z]{2}$|^[0-9]{3}$/.test(x)) || '').toUpperCase();
            const s4 = pezzi.slice(1).find(x => /^[A-Za-z]{4}$/.test(x)) || '';
            const copione = s4 ? s4.charAt(0).toUpperCase() + s4.slice(1).toLowerCase() : '';
            if (TRE_LETTERE[b]) b = TRE_LETTERE[b];
            const alias = { iw: 'he', 'in': 'id', jw: 'jv', nb: 'no', mo: 'ro', tl: 'fil', sh: 'sr', ji: 'yi' };
            if (alias[b]) b = alias[b];
            if (b.length === 3 && !linguaValida(b)) {
                // codice a tre lettere che nemmeno il browser conosce: proviamo le prime due
                const due = b.slice(0, 2);
                if (linguaValida(due)) b = due;
            }
            if (regione === 'UK') regione = 'GB';
            // Il paese e l'alfabeto si tengono SEMPRE: es-PE, ar-EG, en-SG, sr-Latn...
            return componi(b, copione, regione);
        }
        // 2) e' scritto per esteso: "Arabic", "Italiano", "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", "\u7b80\u4f53\u4e2d\u6587"
        const k = chiaveNome(grezzo);
        if (ALIAS_NOME.has(k)) return ALIAS_NOME.get(k);
        // 3) a volte c'e' il nome seguito dal codice: "Arabic (ar)"
        const dentro = grezzo.match(/[(\[]\s*([a-z]{2,3}(?:[-_][a-z0-9]{2,8})?)\s*[)\]]/i);
        if (dentro) return normLang(dentro[1]);
        // 4) nome composto tipo "Arabic - Saudi Arabia"
        for (const pezzo of grezzo.split(/[\/,;|\u2013\u2014-]/)) {
            const kk = chiaveNome(pezzo);
            if (kk && ALIAS_NOME.has(kk)) return ALIAS_NOME.get(kk);
        }
        return '';
    }

    const base = c => String(c || '').split('-')[0].toLowerCase();

    // Una lingua e' buona se e' in elenco o se il browser la conosce. Prima valeva solo
    // l'elenco, e una UR in una lingua non prevista finiva nel riconoscimento dal testo.
    const NON_LINGUE = new Set(['und', 'zxx', 'mul', 'mis']);
    const linguaValida = c => !!c && !NON_LINGUE.has(base(c)) && (NOMI.has(c) || !!nomeIntl(base(c)));

    /* Il codice che usiamo dentro lo script. Paese e alfabeto restano quando cambiano il
       modo di scrivere e si tolgono solo quando sono quelli di casa della lingua:
       en-GB = en, es-ES = es, ar-SA = ar, sr-Cyrl = sr, ma es-PE, ar-EG, sr-Latn restano. */
    function componi(b, copione, regione) {
        if (!b) return '';
        if (b === 'zh') {
            if (regione === 'HK' || regione === 'MO') return 'zh-HK';
            if (regione === 'TW' || (copione === 'Hant' && !regione)) return 'zh-TW';
            if (!regione || regione === 'CN') return 'zh-CN';
            return 'zh-' + regione;                                // Singapore, Malesia...
        }
        if (b === 'pt') return (!regione || regione === 'PT') ? 'pt-PT' : 'pt-' + regione;
        const casa = massimizza(b);
        const sc = (copione && copione !== casa.script) ? copione : '';
        const r = (regione && regione !== (PAESE[b] || casa.regione)) ? regione : '';
        return [b, sc, r].filter(Boolean).join('-');
    }

    // Il WME a volte scrive il paese per esteso ("Espanol (Peru)", "Deutsch (Osterreich)"):
    // lo si riconosce con i nomi dei paesi che da' il browser, nella lingua stessa, in
    // italiano e in inglese.
    const PAESI_ISO = ('AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT '
        + 'BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ '
        + 'FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE '
        + 'JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO '
        + 'MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PR PS PT PW PY '
        + 'QA RE RO RS RU RW SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR '
        + 'TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW').split(' ');
    const mappePaesi = new Map();
    function mappaPaesi(lingua) {
        if (!mappePaesi.has(lingua)) {
            const m = new Map();
            const dn = intl.fai([lingua], 'region');
            if (dn) PAESI_ISO.forEach(r => { const n = leggiIntl(dn, r); if (n) m.set(chiaveNome(n), r); });
            mappePaesi.set(lingua, m);
        }
        return mappePaesi.get(lingua);
    }
    function regioneDaNome(testo, lingua) {
        const k = chiaveNome(testo);
        if (!k) return '';
        if (/^[a-z]{2}$/.test(k) && PAESI_ISO.includes(k.toUpperCase())) return k.toUpperCase();
        for (const l of [lingua, 'it', 'en']) {
            if (!l) continue;
            const r = mappaPaesi(l).get(k);
            if (r) return r;
        }
        return '';
    }

    /* Il WME scrive la lingua del conducente per esteso, con la variante fra parentesi:
       "Espa\u00f1ol (A. Latina)", "Portugu\u00eas do Brasil", "English (US)". Qui si rimette
       insieme il codice giusto, variante compresa. */
    const VARIANTI = [
        [/^(alatina|latinoamerica|americalatina|latam|latina|latinamerica|hispanoamerica|419)$/, 'es', 'es-419'],
        [/^(mexico|mx|mexicano)$/, 'es', 'es-MX'],
        [/^(argentina|ar|rioplatense)$/, 'es', 'es-AR'],
        [/^(colombia|co)$/, 'es', 'es-CO'],
        [/^(chile|cl|cile)$/, 'es', 'es-CL'],
        [/^(espana|es|castellano|spain|spagna)$/, 'es', 'es'],
        [/^(brasil|brazil|br|dobrasil|brasile)$/, 'pt', 'pt-BR'],
        [/^(portugal|pt|europeu|portogallo)$/, 'pt', 'pt-PT'],
        [/^(us|usa|eua|estadosunidos|america|american|unitedstates|statiuniti)$/, 'en', 'en-US'],
        [/^(uk|gb|reinounido|britanico|british|unitedkingdom|greatbritain|regnounito|england)$/, 'en', 'en'],
        [/^(canada|ca|canadian)$/, 'en', 'en-CA'],
        [/^(australia|au|australian)$/, 'en', 'en-AU'],
        [/^(newzealand|nz|nuovazelanda)$/, 'en', 'en-NZ'],
        [/^(ireland|ie|irlanda)$/, 'en', 'en-IE'],
        [/^(india|in)$/, 'en', 'en-IN'],
        [/^(southafrica|za|sudafrica)$/, 'en', 'en-ZA'],
        [/^(canada|ca|quebec)$/, 'fr', 'fr-CA'],
        [/^(belgique|belgie|belgium|belgio|be)$/, 'fr', 'fr-BE'],
        [/^(suisse|schweiz|svizzera|switzerland|ch)$/, 'fr', 'fr-CH'],
        [/^(osterreich|austria|at)$/, 'de', 'de-AT'],
        [/^(schweiz|suisse|svizzera|switzerland|ch)$/, 'de', 'de-CH'],
        [/^(belgie|belgique|belgium|belgio|be|vlaanderen)$/, 'nl', 'nl-BE'],
        [/^(hongkong|hk|xianggang|macau|macao|mo|\u9999\u6e2f|\u6fb3\u9580)$/, 'zh', 'zh-HK'],
        [/^(taiwan|tw|tradizionale|traditional|fanti|\u53f0\u7063|\u81fa\u7063)$/, 'zh', 'zh-TW'],
        [/^(cina|china|cn|semplificato|simplified|jianti)$/, 'zh', 'zh-CN'],
        [/^(latinica|latin|latino|latn)$/, 'sr', 'sr-Latn'],
        [/^(cirilica|cyrillic|cirillico|cyrl)$/, 'sr', 'sr']
    ];
    function linguaDaEtichetta(testo) {
        const t = normalizza(testo);
        if (!t || t.length > 48 || t.length < 2) return '';
        // una sigla nuda nel pannello ("IT", "NO", "ID") e' quasi sempre altro: la lingua del
        // conducente il WME la scrive per esteso
        if (/^[a-z]{2,3}$/i.test(t) && !ALIAS_NOME.has(chiaveNome(t))) return '';
        const m = t.match(/^(.+?)\s*[([]([^)\]]+)[)\]]\s*$/);
        let nome = m ? m[1] : t, nota = m ? m[2] : '';
        // forme senza parentesi: "Portugues do Brasil", "Espanol de Mexico"
        if (!m) {
            const d = t.match(/^(.+?)\s+(?:do|de|da|del|di)\s+(.+)$/i);
            if (d) { nome = d[1]; nota = d[2]; }
        }
        let c = normLang(nome);
        if (!linguaValida(c)) { c = normLang(t); if (!linguaValida(c)) return ''; }
        if (nota) {
            const k = chiaveNome(nota);
            for (const [rx, b, esito] of VARIANTI) if (rx.test(k) && base(c) === b) return esito;
            // qualsiasi altro paese scritto per esteso: "Espanol (Peru)" -> es-PE
            const reg = regioneDaNome(nota, base(c));
            if (reg) return normLang(base(c) + '-' + reg);
        }
        return c;
    }
    // Vera se quella lingua la leggi da solo: la tua piu' quelle che hai aggiunto.
    const loConosco = c => {
        if (!c) return false;
        if (base(c) === base(settings.mia)) return true;
        return (settings.conosco || []).some(x => base(x) === base(c));
    };

    const TIPI_UR = {
        BLOCKED_ROAD: 'Strada bloccata', INCORRECT_ADDRESS: 'Indirizzo errato',
        INCORRECT_GENERAL_ERROR: 'Errore generico', INCORRECT_JUNCTION: 'Incrocio errato',
        INCORRECT_MISSING_ROUNDABOUT: 'Rotatoria mancante', INCORRECT_ROUTE: 'Percorso errato',
        INCORRECT_TURN: 'Svolta errata', MISSING_BRIDGE_OVERPASS: 'Ponte mancante',
        MISSING_EXIT: 'Uscita mancante', MISSING_ROAD: 'Strada mancante',
        TURN_NOT_ALLOWED: 'Svolta non consentita', WRONG_DRIVING_DIRECTIONS: 'Senso di marcia errato'
    };

    const nomeTipo = t => TIPI_UR[t] || (t ? String(t).toLowerCase().replace(/_/g, ' ') : 'non indicato');

    const NOTA_TRAD = 'Messaggio tradotto automaticamente: scusa eventuali errori.';

    /* ------------------------------------------------------------------ */
    /* Impostazioni                                                        */
    /* ------------------------------------------------------------------ */

    // I valori di partenza arrivano dal blocco CONFIGURAZIONE in cima al file; poi vince
    // quello che hai salvato dalla scheda.
    const DEFAULTS = {
        motore: CONFIG.motore,
        chiavi: {},
        modelli: {},
        mia: 'it',                         // la lingua in cui leggi e scrivi
        conosco: [],                       // altre lingue che sai leggere: su quelle lo script non compare
        bandiere: true,                    // bandierine al posto delle sigle
        ripiegoGoogle: CONFIG.ripiegoGoogle,
        rpm: CONFIG.richiesteAlMinuto,
        riserve: {},                       // modelli di riserva scritti da te, per motore (vuoto = quelli di CONFIG)
        riserveAuto: CONFIG.riserveAutomatiche,
        modelliInvio: {},                  // modello per quello che invii, per motore (vuoto = quello di CONFIG)
        corsa: CONFIG.corsaRiserva,        // se il modello tarda, parte anche la riserva
        ripiego: '',                       // vuoto = riconoscila dal testo, mai un ripiego fisso
        recenti: [],                       // lingue usate di recente, per averle in cima al menu'
        autoOut: true,                     // traduci prima di inviare (vale anche per URC-E)
        autoIn: true,                      // traduci la conversazione in arrivo
        notaTrad: CONFIG.notaTraduzione,
        allegaIt: false,                   // allega in coda il testo italiano
        anteprimaSubito: true              // quando arriva una risposta pronta, traducila subito nella casella
    };
    const settings = Object.assign({}, DEFAULTS,
        (() => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; } })());
    settings.chiavi = Object.assign({}, settings.chiavi);
    settings.modelli = Object.assign({}, settings.modelli);
    settings.riserve = Object.assign({}, settings.riserve);
    settings.modelliInvio = Object.assign({}, settings.modelliInvio);
    if (!Array.isArray(settings.recenti)) settings.recenti = [];
    if (!Array.isArray(settings.conosco)) settings.conosco = [];
    if (settings.ripiego === 'en' && settings.recenti.length === 0) settings.ripiego = '';  // vecchia impostazione
    // nelle versioni di prova il tetto di serie era 8 (e finiva salvato anche senza toccarlo): il limite
    // gratuito vero dei Flash-Lite e' 15, quindi si porta al nuovo valore di serie
    if (!settings.ver || settings.ver < 2) {
        if (settings.rpm === 8 || settings.rpm === 9) settings.rpm = CONFIG.richiesteAlMinuto;
        settings.ver = 2;
        try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch { /* ignora */ }
    }
    // solo motori gratuiti: chi nelle versioni di prova aveva scelto OpenAI o Claude passa all'AI gratuita
    if (settings.ver < 3) {
        if (settings.motore === 'openai' || settings.motore === 'anthropic') settings.motore = 'groq';
        ['openai', 'anthropic'].forEach(k => { delete settings.modelli[k]; delete settings.riserve[k]; });
        settings.ver = 3;
        try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch { /* ignora */ }
    }
    // Gemini non c'e' piu': chi lo usava in una versione di prova passa a Groq, e le voci di Gemini e del
    // lavoro in coppia (Gemini e Groq insieme, lingue di Groq) si tolgono
    if (settings.ver < 4) {
        if (settings.motore === 'gemini') settings.motore = 'groq';
        ['chiavi', 'modelli', 'riserve', 'modelliInvio'].forEach(x => { if (settings[x]) delete settings[x].gemini; });
        // il vecchio tetto di serie (14, pensato per Gemini) sale a quello di Groq
        if (settings.rpm === 14) settings.rpm = CONFIG.richiesteAlMinuto;
        // la vecchia riserva di serie di Groq si sostituisce con il nuovo elenco
        if (settings.riserve.groq === 'llama-3.3-70b-versatile') delete settings.riserve.groq;
        ['altroAI', 'sceltaAuto', 'lingueGroq'].forEach(x => { delete settings[x]; });
        settings.ver = 4;
        try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch { /* ignora */ }
    }
    const saveSettings = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch { /* ignora */ } };

    /* ------------------------------------------------------------------ */
    /* Utilita'                                                            */
    /* ------------------------------------------------------------------ */

    const esc = s => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const normalizza = s => String(s || '').replace(/\s+/g, ' ').trim();

    function hash(s) {
        let h = 0x811c9dc5;
        for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
        return (h >>> 0).toString(36) + '-' + s.length.toString(36);
    }

    ['wmeUrTranslator_cache_v1', 'wmeUrTranslator_cache_v2', 'wmeUrTranslator_modelli'].forEach(k => { try { localStorage.removeItem(k); } catch { /* ignora */ } });
    let cache = (() => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; } })();
    let timerCache = null;
    function cacheGet(k) { return cache[k] || null; }
    function cacheSet(k, t, d) {
        cache[k] = { t, d: d || '', w: Date.now() };
        const ch = Object.keys(cache);
        if (ch.length > CACHE_MAX) {
            ch.sort((a, b) => (cache[a].w || 0) - (cache[b].w || 0));
            ch.slice(0, ch.length - CACHE_MAX).forEach(x => delete cache[x]);
        }
        clearTimeout(timerCache);
        timerCache = setTimeout(() => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* piena */ } }, 1200);
    }
    const cacheSvuota = () => { cache = {}; try { localStorage.removeItem(CACHE_KEY); } catch { /* ignora */ } };

    function http(opt) {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest !== 'function') { reject(new Error('GM_xmlhttpRequest non disponibile')); return; }
            GM_xmlhttpRequest({
                method: opt.method || 'GET', url: opt.url, headers: opt.headers || {}, data: opt.data,
                timeout: opt.timeout || 30000,
                onload: r => {
                    if (r.status >= 200 && r.status < 300) { resolve(opt.conHeader ? { testo: r.responseText, header: r.responseHeaders || '' } : r.responseText); return; }
                    let extra = '', corpo = null;
                    try {
                        corpo = JSON.parse(r.responseText);
                        const j = Array.isArray(corpo) ? corpo[0] : corpo;
                        extra = ': ' + ((j.error && (j.error.message || j.error.type)) || j.message || '');
                    } catch { /* niente */ }
                    // codice, corpo e attesa suggerita restano attaccati all'errore: servono a
                    // capire se e' un sovraccarico, un limite al minuto o la quota del giorno
                    const e = new Error('HTTP ' + r.status + extra.slice(0, 160));
                    e.status = r.status; e.corpo = corpo; e.header = r.responseHeaders || '';
                    const ra = /^retry-after:\s*(\d+)/im.exec(r.responseHeaders || '');
                    if (ra) e.attesaMs = Number(ra[1]) * 1000;
                    reject(e);
                },
                onerror: () => { const e = new Error('rete non raggiungibile'); e.rete = true; reject(e); },
                ontimeout: () => { const e = new Error('nessuna risposta entro il tempo massimo'); e.rete = true; reject(e); }
            });
        });
    }

    /* ------------------------------------------------------------------ */
    /* Motori di traduzione                                                */
    /* ------------------------------------------------------------------ */

    /* I motori. Quali compaiono nel menu' e in che ordine lo decide CONFIG.motoriNelMenu in
       cima al file. "nota" e "link" sono quello che la scheda mostra sotto il menu'. */
    const MOTORI = {
        groq: {
            n: 'Groq (AI, consigliato)', chiave: true, ai: true, modello: CONFIG.modelli.groq,
            link: 'https://console.groq.com/keys',
            nota: 'Gratis, senza carta di credito: registrati, apri "API Keys" e premi "Create API Key". '
                + 'Velocissimo (di solito meno di un secondo), rispetta tono e varianti regionali e legge le '
                + 'segnalazioni dettate a voce o scritte senza accenti per come suonano nella lingua del segnalante.'
        },
        deepl: {
            n: 'DeepL', chiave: true, ai: false,
            link: 'https://www.deepl.com/pro-api',
            nota: 'Traduttore classico, ottimo sulle lingue europee. Il piano "DeepL API Free" \u00e8 gratuito '
                + '(500.000 caratteri al mese); le chiavi gratuite finiscono con ":fx".'
        },
        google: {
            n: 'Google Traduttore (gratis, senza chiave)', chiave: false, ai: false,
            nota: 'Funziona subito, senza registrazione. Pi\u00f9 letterale delle AI. Con un uso molto '
                + 'intenso pu\u00f2 rispondere "troppe richieste" per qualche minuto.'
        },
        mymemory: {
            n: 'MyMemory (gratis, senza chiave)', chiave: false, ai: false,
            nota: 'Di scorta: qualit\u00e0 pi\u00f9 bassa e poche migliaia di caratteri al giorno.'
        }
    };
    Object.keys(MOTORI).forEach(k => { MOTORI[k].attivo = CONFIG.motoriNelMenu.indexOf(k) >= 0; });
    const attivi = () => CONFIG.motoriNelMenu.filter(k => MOTORI[k]);
    const motore = () => {
        const m = settings.motore;
        if (MOTORI[m] && MOTORI[m].attivo) return m;
        return attivi()[0] || 'google';
    };
    let avvisoMotore = '';   // messaggio da mostrare quando si e' dovuto ripiegare
    const motoreAI = () => !!MOTORI[motore()].ai;
    const nomeMotore = m => MOTORI[m || motore()].n.split(' (')[0];
    const chiave = m => (settings.chiavi[m || motore()] || '').trim();
    const modello = m => { const k = m || motore(); return (settings.modelli[k] || (MOTORI[k] && MOTORI[k].modello) || '').trim(); };
    const mancaChiave = m => new Error(nomeMotore(m) + ': manca la chiave. Incollala nella scheda URT, sezione Motore'
        + (MOTORI[m].chiave && !MOTORI.google.attivo ? '' : ', oppure scegli Google Traduttore che non la chiede') + '.');

    // Ogni servizio ha le sue sigle: qui ci sono solo quelle che NON coincidono
    // con il codice interno, il resto passa cosi' com'e'.
    const GOOGLE_DIVERSE = {
        fil: 'tl', he: 'iw', jv: 'jw',
        'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', 'zh-HK': 'zh-TW'
    };
    // Google non distingue le varianti regionali (en-AU, es-MX, de-CH...): gli si manda la
    // lingua base. Il suo "pt" e' il portoghese brasiliano. Le varianti le rispetta il motore AI.
    const gTrad = c => (!c || c === 'auto') ? 'auto' : (GOOGLE_DIVERSE[c] || (base(c) === 'zh' ? 'zh-CN' : base(c)));

    // MyMemory vuole la coppia in ISO 639-1 con eventuale regione
    const MYMEMORY_DIVERSE = {
        'pt-PT': 'pt-PT', 'pt-BR': 'pt-BR', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', fil: 'tl', no: 'nb',
        'es-419': 'es-MX', 'en-US': 'en-US', 'fr-CA': 'fr-CA'
    };
    const mTrad = c => MYMEMORY_DIVERSE[c] || (c || '').split('-')[0];

    // DeepL: elenco ufficiale delle lingue di arrivo. Quelle che non ci sono
    // passano dal motore gratuito invece di far fallire l'invio.
    const DEEPL_OK = ['AR', 'BG', 'CS', 'DA', 'DE', 'EL', 'EN-GB', 'EN-US', 'ES', 'ES-419', 'ET', 'FI', 'FR', 'HE', 'HU', 'ID', 'IT',
        'JA', 'KO', 'LT', 'LV', 'NB', 'NL', 'PL', 'PT-BR', 'PT-PT', 'RO', 'RU', 'SK', 'SL', 'SV', 'TH', 'TR', 'UK', 'VI', 'ZH'];
    function dTrad(c, target) {
        if (!c || c === 'auto') return null;
        if (c === 'pt-BR') return target ? 'PT-BR' : 'PT';
        if (base(c) === 'pt') return target ? 'PT-PT' : 'PT';          // Portogallo, Angola, Mozambico...
        if (c === 'zh-TW' || c === 'zh-HK') return target ? 'ZH-HANT' : 'ZH';
        if (base(c) === 'zh') return target ? 'ZH-HANS' : 'ZH';
        if (c === 'no') return 'NB';
        if (c === 'es') return 'ES';
        if (base(c) === 'es') return target ? 'ES-419' : 'ES';          // es-419, es-MX, es-AR...
        if (base(c) === 'en' && (c === 'en-CA' || ORTOGRAFIA_USA.has(partiCodice(c).regione))) return target ? 'EN-US' : 'EN';
        if (base(c) === 'en') return target ? 'EN-GB' : 'EN';          // Regno Unito, Australia, Irlanda...
        const u = c.split('-')[0].toUpperCase();
        if (!target) return DEEPL_OK.some(x => x.split('-')[0] === u) ? u : null;
        return DEEPL_OK.includes(u) ? u : null;
    }

    function spezza(testo, max) {
        if (testo.length <= max) return [testo];
        const out = []; let acc = '';
        for (const riga of testo.split('\n')) {
            if ((acc + '\n' + riga).length > max && acc) { out.push(acc); acc = riga; }
            else acc = acc ? acc + '\n' + riga : riga;
            while (acc.length > max) { out.push(acc.slice(0, max)); acc = acc.slice(max); }
        }
        if (acc) out.push(acc);
        return out;
    }

    // Link e variabili di URC-E ($URD$, $SELSEGS$, $USERNAME$...) non si traducono:
    // il testo viene spezzato attorno a loro e rimesso insieme dopo.
    const RX_INTOCCABILE = /(\$[A-Z0-9_]+\$|https?:\/\/\S+|\bwww\.\S+)/g;
    const RX_E_TOKEN = /^(\$[A-Z0-9_]+\$|https?:\/\/\S+|www\.\S+)$/;

    // Link e variabili rimasti identici nella traduzione?
    const intoccabiliSalvi = (orig, tr) => (String(orig).match(RX_INTOCCABILE) || []).every(x => String(tr).indexOf(x) >= 0);
    // Lunghezza sensata fra originale e traduzione: una risposta tagliata o impazzita non vale
    const lunghezzaSensata = (orig, tr) => {
        const a = String(orig).trim().length, b = String(tr).trim().length;
        return a < 25 || (b >= a * 0.2 && b <= a * 5);
    };

    // Google a pezzi, senza mai mandargli link e variabili: il ripiego d'emergenza
    async function googleAPezzi(testo, da, a) {
        let fuori = '';
        for (const p of String(testo).split(RX_INTOCCABILE)) {
            if (!p) continue;
            if (RX_E_TOKEN.test(p.trim()) || !/[a-z\u00c0-\u024f\u0370-\u1fff\u3040-\ud7ff]/i.test(p)) { fuori += p; continue; }
            const pre = p.match(/^\s*/)[0], post = p.match(/\s*$/)[0];
            fuori += pre + (await trGoogle(p.trim(), da, a)).t + post;
        }
        return fuori;
    }

    async function traduciTesto(testo, da, a, opz) {
        // Con i motori AI il testo parte intero, link e variabili compresi: una richiesta sola
        // invece di una per ogni pezzo (una risposta di URC-E con $USERNAME$, $URD$ e un link
        // ne costava quattro). Se il modello tocca anche una sola variabile o un link si torna
        // al metodo a pezzi, che quelle parti non le manda proprio.
        if (motoreAI()) {
            const r = await traduciPezzo(testo, da, a, opz);
            if (intoccabiliSalvi(testo, r.t)) return { t: r.t, d: r.d, m: r.m };
            if (r.g) return { t: await googleAPezzi(testo, da, a), d: r.d, m: 'google' };
            log('il modello ha cambiato un link o una variabile: traduco a pezzi');
        }
        const pezzi = String(testo).split(RX_INTOCCABILE);
        let fuori = ''; let rilevata = '';
        for (const p of pezzi) {
            if (!p) continue;
            if (RX_E_TOKEN.test(p.trim()) || !/[a-z\u00c0-\u024f\u0370-\u1fff\u3040-\ud7ff]/i.test(p)) { fuori += p; continue; }
            const r = await traduciPezzo(p, da, a, opz);
            fuori += r.t;
            if (!rilevata && r.d) rilevata = r.d;
        }
        return { t: fuori, d: rilevata, m: motore() };
    }

    /* Quando il testo tradotto e' fatto quasi delle stesse parole dell'originale, la
       traduzione non e' avvenuta: succede sulle frasi corte quando la lingua di partenza
       dichiarata non e' quella davvero scritta ("pista mao dupla" dichiarato pt-BR ma
       trattato come italiano). Si misura quante parole sono rimaste uguali. */
    function nonTradotto(sorgente, risultato) {
        const parole = s => normalizza(String(s || '')).toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(x => x.length > 2);
        const a = parole(sorgente), b = new Set(parole(risultato));
        if (a.length < 2) return false;               // una parola sola: non si puo' dire niente
        const uguali = a.filter(x => b.has(x)).length;
        return uguali / a.length >= 0.6;
    }

    // Una sola ricetta per la chiave della memoria: prima la traduzione in blocco della
    // discussione salvava con una chiave diversa da quella messaggio per messaggio, e alla
    // riapertura della UR gli stessi messaggi tornavano al modello (quota sprecata).
    const chiaveTr = (m, da, a, testo, uscita) =>
        hash(`${m}|${modello(m)}|${uscita ? 'u' : 'i'}|${da || 'auto'}|${a}|${String(testo).trim()}`);

    async function traduciPezzo(testo, da, a, opz) {
        const grezzo = String(testo);
        const nudo = grezzo.trim();
        if (!nudo) return { t: grezzo, d: '', m: motore() };
        if (da && da !== 'auto' && da === a) return { t: grezzo, d: da, m: motore() };
        const m = motore();
        const k = chiaveTr(m, da, a, nudo, opz && opz.uscita);
        const c = (opz && opz.senzaMemoria) ? null : cacheGet(k);
        let tradotto, rilevata, perGoogle = false;
        if (c) { tradotto = c.t; rilevata = c.d; }
        else {
            let r;
            if (m === 'deepl' && !dTrad(a, true)) {
                r = await trGoogle(nudo, da, a);
            }
            else {
                try {
                    r = await ({ google: trGoogle, mymemory: trMyMemory, deepl: trDeepL, groq: trAI })[m](nudo, da, a, opz);
                } catch (err) {
                    // Di serie non si ripiega su altri motori: se hai scelto un motore vuoi
                    // quello. Il ripiego su Google si accende dalla scheda.
                    if (!settings.ripiegoGoogle || m === 'google' || tipoErrore(err) === 'chiave') throw err;
                    r = await trGoogle(nudo, da, a);
                    perGoogle = true;
                    avvisoMotore = nomeMotore(m) + ' non ha risposto (' + (err.message || err).slice(0, 70) + '): uso Google';
                    log(avvisoMotore);
                }
            }
            // Secondo tentativo quando il testo e' tornato quasi uguale: con i motori AI si
            // richiede la traduzione insistendo, con gli altri si lascia decidere la lingua.
            if (!perGoogle && nonTradotto(nudo, r.t)) {
                try {
                    const r2 = MOTORI[m].ai
                        ? await trAI(nudo, da, a, Object.assign({}, opz, { insistere: true }))
                        : ((da && da !== 'auto') ? await ({ google: trGoogle, mymemory: trMyMemory, deepl: trDeepL })[m](nudo, 'auto', a) : null);
                    if (r2 && r2.t && !nonTradotto(nudo, r2.t)) r = r2;
                } catch { /* si tiene il primo risultato */ }
            }
            tradotto = r.t; rilevata = r.d;
            // quello che arriva dal ripiego non va in memoria: la prossima volta si riprova il
            // motore scelto
            if (!perGoogle) cacheSet(k, tradotto, rilevata);
        }
        // si rimettono gli spazi/a capo che stavano attorno al pezzo
        const pre = grezzo.match(/^\s*/)[0], post = grezzo.match(/\s*$/)[0];
        return { t: pre + tradotto + post, d: rilevata, m, g: perGoogle };
    }

    // L'endpoint gratuito risponde "troppe richieste" se gli si sparano addosso dieci
    // traduzioni di fila (succede con le discussioni lunghe). Qui si tiene una distanza
    // minima fra una chiamata e l'altra e si ritenta due volte, aspettando di piu'.
    let orariGoogle = [];
    async function turnoGoogle() {
        for (;;) {
            const ora = Date.now();
            orariGoogle = orariGoogle.filter(t => ora - t < 10000);
            if (orariGoogle.length < 15) { orariGoogle.push(ora); return; }
            await sleep(400);
        }
    }
    async function trGoogle(testo, da, a) {
        const pezzi = spezza(testo, 1400);
        let fuori = '', rilevata = '';
        for (const p of pezzi) {
            const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl='
                + encodeURIComponent(gTrad(da || 'auto')) + '&tl=' + encodeURIComponent(gTrad(a))
                + '&dt=t&ie=UTF-8&oe=UTF-8&q=' + encodeURIComponent(p);
            let txt = null, ultimo = null;
            for (let tentativo = 0; tentativo < 3 && txt === null; tentativo++) {
                await turnoGoogle();
                try { txt = await http({ url }); }
                catch (e) {
                    ultimo = e;
                    if (!/HTTP (429|5\d\d)|rete|timeout|tempo massimo/i.test(e.message || '')) break;
                    orariGoogle = [];                        // quota al minuto: si riparte dopo l'attesa
                    await sleep(900 * (tentativo + 1));
                }
            }
            if (txt === null) throw new Error('Google: ' + ((ultimo && ultimo.message) || 'non risponde'));
            let j; try { j = JSON.parse(txt); } catch { throw new Error('Google: risposta non leggibile'); }
            if (!Array.isArray(j) || !Array.isArray(j[0])) throw new Error('Google: risposta inattesa');
            fuori += j[0].map(s => (s && s[0]) ? s[0] : '').join('');
            if (!rilevata && j[2]) rilevata = normLang(j[2]);
            if (pezzi.length > 1) await sleep(250);
        }
        return { t: fuori, d: rilevata };
    }

    async function trMyMemory(testo, da, a) {
        const sorgente = (da && da !== 'auto') ? da : ((await rilevaLingua(testo)) || 'en');
        const pezzi = spezza(testo, 450);
        const fuori = [];
        for (const p of pezzi) {
            const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(p)
                + '&langpair=' + encodeURIComponent(mTrad(sorgente) + '|' + mTrad(a));
            const txt = await http({ url }).catch(e => { throw new Error('MyMemory: ' + e.message); });
            let j; try { j = JSON.parse(txt); } catch { throw new Error('MyMemory: risposta non leggibile'); }
            const out = j && j.responseData && j.responseData.translatedText;
            if (!out) throw new Error('MyMemory: ' + ((j && j.responseDetails) || 'nessuna traduzione'));
            fuori.push(out);
            if (pezzi.length > 1) await sleep(300);
        }
        return { t: fuori.join('\n'), d: sorgente };
    }

    async function trDeepL(testo, da, a) {
        const key = chiave('deepl');
        if (!key) throw mancaChiave('deepl');
        const indirizzo = /:fx$/.test(key) ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
        const body = { text: [testo], target_lang: dTrad(a, true) };
        const src = dTrad(da, false);
        if (src && da !== 'auto') body.source_lang = src;
        const txt = await http({
            method: 'POST', url: indirizzo + '/v2/translate',
            headers: { Authorization: 'DeepL-Auth-Key ' + key, 'Content-Type': 'application/json' },
            data: JSON.stringify(body)
        }).catch(e => { throw new Error('DeepL: ' + e.message); });
        const j = JSON.parse(txt);
        const tr = j && j.translations && j.translations[0];
        if (!tr) throw new Error('DeepL: nessuna traduzione');
        return { t: tr.text, d: normLang(tr.detected_source_language || '') };
    }

    /* Come si scrive in ogni variante. Al modello non basta sapere la lingua: gli serve il
       paese. L'inglese di Londra, New York e Sydney cambia ortografia e vocaboli, lo spagnolo
       di Madrid usa "vosotros" e quello dell'America Latina no, l'argentino da' del "vos",
       il portoghese del Brasile e quello del Portogallo hanno forme diverse, il tedesco
       svizzero non ha la esse-zeta, il serbo si scrive in due alfabeti. Gli esempi servono al
       modello a capire che variante usare: non sono parole da infilare nel testo. */
    const SCRITTURA = {
        en: 'inglese britannico: ortografia del Regno Unito (colour, centre, tyre, kerb, -ise) e vocaboli britannici (motorway, car park, petrol station, pavement, lorry)',
        'en-US': 'inglese americano: ortografia degli Stati Uniti (color, center, tire, curb, -ize) e vocaboli americani (highway/freeway, parking lot, gas station, sidewalk, truck)',
        'en-CA': 'inglese canadese: ortografia canadese (colour, centre, ma tire e curb) e vocaboli nordamericani (highway, parking lot, gas station, sidewalk)',
        'en-AU': 'inglese australiano: ortografia britannica (colour, centre, tyre, kerb) e vocaboli australiani (freeway/motorway, car park, petrol station, footpath)',
        'en-NZ': 'inglese neozelandese: ortografia britannica (colour, centre, tyre, kerb) e vocaboli neozelandesi (motorway, car park, petrol station, footpath)',
        'en-IE': 'inglese d\u0027Irlanda: ortografia britannica (colour, centre, tyre) e vocaboli irlandesi (motorway, car park, petrol station, footpath)',
        'en-IN': 'inglese dell\u0027India: ortografia britannica (colour, centre, tyre) e vocaboli in uso in India',
        'en-ZA': 'inglese sudafricano: ortografia britannica (colour, centre, tyre) e vocaboli sudafricani (robot = semaforo, freeway, petrol station)',
        es: 'spagnolo di Spagna: "vosotros" per il voi confidenziale e "ustedes" per quello di cortesia; vocaboli spagnoli (coche, conducir, aparcamiento, rotonda, resalto/bad\u00e9n)',
        'es-419': 'spagnolo latinoamericano neutro, comprensibile in tutta l\u0027America Latina: mai "vosotros" (sempre "ustedes"), niente voseo; vocaboli neutri (auto, manejar, estacionamiento, rotonda/glorieta, reductor de velocidad)',
        'es-MX': 'spagnolo messicano: mai "vosotros" (sempre "ustedes"); vocaboli messicani (carro, manejar, estacionamiento, glorieta, tope, cami\u00f3n = autobus)',
        'es-AR': 'spagnolo argentino (rioplatense): il tu diventa voseo ("vos ten\u00e9s", "pod\u00e9s", "fijate"), mai "vosotros" (sempre "ustedes"); vocaboli argentini (auto, manejar, estacionamiento, rotonda, lomo de burro, colectivo)',
        'es-CO': 'spagnolo colombiano: mai "vosotros" (sempre "ustedes"); vocaboli colombiani (carro, manejar, parqueadero, glorieta, reductor de velocidad)',
        'es-CL': 'spagnolo cileno: mai "vosotros" (sempre "ustedes"); vocaboli cileni (auto, manejar, estacionamiento, rotonda, lomo de toro, micro)',
        'pt-BR': 'portoghese brasiliano: "voc\u00ea" per il tu, gerundio ("estou verificando"), vocaboli brasiliani (\u00f4nibus, trem, celular, lombada/quebra-molas, rotat\u00f3ria, estacionamento)',
        'pt-PT': 'portoghese europeo (Portogallo): "tu" per il tu, "o senhor/a senhora" o il verbo alla terza persona per il Lei, "estou a verificar" al posto del gerundio, vocaboli portoghesi (autocarro, comboio, telem\u00f3vel, lomba, rotunda, parque de estacionamento)',
        fr: 'francese di Francia (rond-point, parking, autoroute, ralentisseur)',
        'fr-CA': 'francese del Canada (Qu\u00e9bec): vocaboli quebecchesi (carrefour giratoire, stationnement, autoroute, dos d\u0027\u00e2ne, courriel)',
        'fr-BE': 'francese del Belgio: numeri "septante" e "nonante", vocaboli belgi',
        'fr-CH': 'francese della Svizzera: numeri "septante", "huitante" e "nonante", vocaboli svizzeri',
        de: 'tedesco di Germania, con la "\u00df" dove prevista (Stra\u00dfe)',
        'de-AT': 'tedesco d\u0027Austria: forme e vocaboli austriaci (J\u00e4nner, heuer), "\u00df" dove prevista',
        'de-CH': 'tedesco standard svizzero: mai la "\u00df", sempre "ss" (Strasse, gross); vocaboli svizzeri (Velo, parkieren, Trottoir)',
        nl: 'olandese dei Paesi Bassi',
        'nl-BE': 'olandese del Belgio (fiammingo scritto standard, vocaboli belgi)',
        'zh-CN': 'cinese semplificato della Cina continentale (caratteri semplificati)',
        'zh-TW': 'cinese tradizionale di Taiwan (caratteri tradizionali, vocaboli taiwanesi)',
        'zh-HK': 'cinese tradizionale di Hong Kong (caratteri tradizionali, cinese scritto standard con i vocaboli di Hong Kong)',
        sr: 'serbo in alfabeto cirillico',
        'sr-Latn': 'serbo in alfabeto latino (latinica)',
        no: 'norvegese bokm\u00e5l',
        ar: 'arabo standard moderno, comprensibile in tutti i paesi arabi'
    };
    // Per tutte le altre varianti si costruisce la scheda dal codice: lingua, alfabeto e paese
    // ("spagnolo, variante regionale: Peru'"), piu' le regole di famiglia che contano davvero.
    const ORTOGRAFIA_USA = new Set(['US', 'PR', 'PH', 'LR', 'UM', 'VI', 'GU', 'AS', 'MP']);
    function regoleFamiglia(l, r) {
        if (l === 'es' && AMERICA_LATINA.has(r)) return '; mai "vosotros" (sempre "ustedes")'
            + (['AR', 'UY', 'PY'].includes(r) ? '; se il testo da\u0027 del tu, usa il voseo ("vos ten\u00e9s", "pod\u00e9s")' : '');
        if (l === 'en') return ORTOGRAFIA_USA.has(r) ? '; ortografia americana (color, center, tire)'
            : '; ortografia britannica (colour, centre, tyre)';
        if (l === 'de' && (r === 'CH' || r === 'LI')) return '; mai la "\u00df", sempre "ss"';
        if (l === 'pt' && r !== 'BR') return '; norma del portoghese europeo ("estou a verificar", non il gerundio)';
        if (l === 'fr' && (r === 'BE' || r === 'CH')) return '; numeri "septante" e "nonante"';
        if (l === 'ar') return '; arabo standard comprensibile ovunque, con i vocaboli d\u0027uso comune in quel paese';
        return '';
    }
    function scritturaDi(c) {
        if (SCRITTURA[c]) return SCRITTURA[c];
        const p = partiCodice(c);
        let s = nomeIntl(p.lingua) || minuscola(String(NOMI.get(p.lingua) || p.lingua).replace(/\s*\(.*\)\s*$/, ''));
        if (p.script) s += ' in alfabeto ' + (nomeScript(p.script) || p.script);
        if (p.regione) {
            s += ', variante regionale: ' + (nomePaese(p.regione) || p.regione)
                + ' (ortografia, vocaboli, forme di cortesia e modi di dire di quel paese)'
                + regoleFamiglia(p.lingua, p.regione);
        }
        return s;
    }

    /* --- La pronuncia della lingua del segnalante ----------------------- */

    /* Molte UR sono DETTATE A VOCE mentre si guida: il riconoscimento vocale del telefono
       scrive parole che suonano come quelle dette ma non sono quelle (in inglese "rode" per
       "road", in spagnolo "haber" per "a ver"). Altre sono scritte di fretta: senza accenti,
       in abbreviazioni da chat o in alfabeto latino al posto del proprio (arabo con i numeri,
       greco "greeklish", russo traslitterato). Tradotte parola per parola danno frasi senza
       senso. Per questo al modello si passa la lingua della UR con le sue trappole di
       pronuncia e di scrittura: prima ricostruisce quello che il segnalante ha DETTO, poi lo
       traduce. Le note sono in italiano come il resto delle istruzioni; ogni voce riguarda la
       lingua base, la variante del paese si aggiunge da sola (seseo, pronuncia brasiliana...). */
    const FONETICA = {
        en: 'omofoni tipici della dettatura: road/rode/rowed, right/write, there/their/they\u0027re, your/you\u0027re, '
            + 'to/too/two, for/four, no/know, won\u0027t/want, turn/tern, lane/lain, way/weigh, exit/exist, sign/sine, '
            + 'brake/break, passed/past, one way/won way; abbreviazioni: u = you, r = are, pls, thx, rd = road, '
            + 'st = street, ave, hwy, fwy, blvd, ln = lane, gonna, wanna',
        es: 'seseo e ceceo (s, c e z scambiate: "cruse" = cruce, "senda"/"zenda"), yeismo (ll e y: "caye" = calle), '
            + 'b e v scambiate ("bia" = v\u00eda), h muta ("abia" = hab\u00eda, "a ver"/"haber", "echo"/"hecho", '
            + '"ay"/"hay"/"ah\u00ed"), accenti mancanti (esta/est\u00e1, si/s\u00ed, mas/m\u00e1s, el/\u00e9l); abbreviazioni: '
            + 'q/k = que, xq/pq = porque, x = por, tb/tmb = tambi\u00e9n, d = de, xfa = por favor, tmr',
        pt: 'accenti e tilde mancanti (nao = n\u00e3o, esta/est\u00e1, e/\u00e9, pra = para, t\u00e1 = est\u00e1); s/ss/\u00e7/z e x/ch '
            + 'scambiati; mas/mais, mau/mal, a/h\u00e1; in Brasile la "e" finale si sente "i" e la "o" finale "u" '
            + '("di" = de, "ki" = que); abbreviazioni: vc = voc\u00ea, q/k = que, tb/tbm = tamb\u00e9m, pq = porque/por que, '
            + 'n/\u00f1 = n\u00e3o, mt/mto = muito, blz = beleza, cmg = comigo, td = tudo, obg = obrigado, msm = mesmo, '
            + 'hj = hoje, agr = agora',
        fr: 'omofoni: a/\u00e0, ou/o\u00f9, et/est/ait, ces/ses/c\u0027est/s\u0027est, on/ont, son/sont, finali -er/-\u00e9/-ez/-ait '
            + 'scambiati ("aller"/"all\u00e9"), vers/verre/vert; accenti mancanti; SMS: c = c\u0027est, g = j\u0027ai, pk/pq = '
            + 'pourquoi, koi = quoi, stp/svp, bcp = beaucoup, jsp = je sais pas, mm = m\u00eame, dc = donc, ya = il y a',
        de: 'ae/oe/ue al posto di \u00e4/\u00f6/\u00fc e ss al posto di \u00df; das/dass, seit/seid, wieder/wider, wird/wirt, '
            + 'Stra\u00dfe/Strasse, parole composte spezzate dalla dettatura ("Auto bahn" = Autobahn); dialetto '
            + 'scritto come si parla; abbreviazioni: Str. = Stra\u00dfe, Kreuzg. = Kreuzung',
        it: 'a/ha, o/ho, e/\u00e8, anno/hanno, ce/c\u0027\u00e8; k = ch, x = per, cmq = comunque, nn = non, xk\u00e8/xch\u00e9 = '
            + 'perch\u00e9, qnd = quando, tt = tutto; forme dialettali',
        ar: 'arabo spesso scritto in lettere latine con le cifre ("arabizi"): 2 = \u0621, 3 = \u0639, 3\u0027 = \u063a, '
            + '5 = \u062e, 6 = \u0637, 7 = \u062d, 8/9 = \u0642/\u0635, sh = \u0634, gh = \u063a; dialetti (egiziano, levantino, '
            + 'del Golfo, maghrebino con parole francesi) mescolati all\u0027arabo standard; vocali lunghe e hamza '
            + 'spesso saltate; leggi ogni parola per come si pronuncia in quel dialetto',
        ru: 'russo scritto in lettere latine (translit): sh = \u0448, ch/4 = \u0447, zh = \u0436, ya/ja = \u044f, yu/ju = '
            + '\u044e, kh/h = \u0445, ts/c = \u0446, 6 = \u0448, w = \u0448 o \u0432; \u0451 scritta \u0435; parole ucraine '
            + 'mescolate; dettatura: \u0442\u0441\u044f/\u0442\u044c\u0441\u044f, \u043e/\u0430 atone scambiate',
        uk: 'ucraino in lettere latine o mescolato al russo (surzhyk); \u0438/\u0456/\u0457 e \u0435/\u0454 scambiate; '
            + 'apostrofo mancante',
        be: 'bielorusso mescolato al russo; \u045e e \u0456 sostituite da \u0443 e \u0438',
        bg: 'bulgaro in lettere latine (shlyokavitsa): sht/6 = \u0449, ch/4 = \u0447, sh = \u0448, zh = \u0436, a/u = \u044a',
        sr: 'serbo in latino senza segni (c = \u010d/\u0107, s = \u0161, z = \u017e, dj = \u0111), cirillico e latino mescolati',
        hr: 'segni mancanti: c = \u010d/\u0107, s = \u0161, z = \u017e, dj = \u0111',
        bs: 'segni mancanti: c = \u010d/\u0107, s = \u0161, z = \u017e, dj = \u0111',
        el: 'greco in lettere latine ("greeklish"): 8/th = \u03b8, 3/ks = \u03be, w/o = \u03c9, x/h = \u03c7, ps = \u03c8, '
            + 'u/y = \u03c5, i/h = \u03b7/\u03b9; accenti mancanti; \u03b7/\u03b9/\u03c5/\u03b5\u03b9/\u03bf\u03b9 si pronunciano '
            + 'tutte "i" e vengono scambiate',
        tr: 'segni mancanti (\u0131/i, \u015f = s, \u011f = g, \u00e7 = c, \u00f6 = o, \u00fc = u); abbreviazioni: slm = selam, '
            + 'tmm = tamam, nbr = ne haber, cdd = cadde, sk = sokak; dettatura: parole unite o spezzate',
        pl: 'segni mancanti (\u0105 \u0119 \u0142 \u0144 \u00f3 \u015b \u017a \u017c); rz/\u017c, ch/h, u/\u00f3 scambiati',
        cs: 'h\u00e1\u010dky e \u010d\u00e1rky mancanti (c = \u010d, r = \u0159, s = \u0161, z = \u017e, u = \u016f/\u00fa); i/y scambiate',
        sk: 'segni mancanti (c = \u010d, s = \u0161, z = \u017e, l = \u013e, a = \u00e4/\u00e1); i/y scambiate',
        hu: 'accenti mancanti (o = \u00f3/\u00f6/\u0151, u = \u00fa/\u00fc/\u0171); ly/j scambiati',
        ro: 'segni mancanti (a = \u0103/\u00e2, i = \u00ee, s = \u0219, t = \u021b)',
        nl: 'd/t finali dei verbi (word/wordt), ei/ij, g/ch scambiati; parole composte spezzate',
        sv: '\u00e5/\u00e4/\u00f6 scritte aa/ae/oe o a/o', no: '\u00e6/\u00f8/\u00e5 scritte ae/oe/aa o a/o',
        da: '\u00e6/\u00f8/\u00e5 scritte ae/oe/aa o a/o', fi: '\u00e4/\u00f6 scritte a/o; doppie saltate',
        lt: 'segni mancanti (\u0105 \u010d \u0119 \u0117 \u012f \u0161 \u0173 \u016b \u017e)',
        lv: 'segni mancanti (\u0101 \u010d \u0113 \u0123 \u012b \u0137 \u013c \u0146 \u0161 \u016b \u017e)',
        et: '\u00e4/\u00f6/\u00fc/\u00f5 scritte a/o/u',
        id: 'abbreviazioni da chat: yg = yang, gk/ga/gak/nggak/tdk = tidak, udh/sdh = sudah, blm = belum, jln = jalan, '
            + 'bgt = banget, dgn = dengan, sy = saya, krn = karena, gmn = gimana, org = orang, lg = lagi, aja = saja; '
            + 'parole giavanesi o sundanesi mescolate',
        ms: 'abbreviazioni: x/tak = tidak, sy = saya, jln = jalan, dgn = dengan, blh = boleh, mcm = macam',
        fil: 'taglish (tagalog e inglese mescolati); abbreviazioni: d2 = dito, nmn = naman, lng = lang, kc = kasi, '
            + 'po, sna = sana, wla = wala; grafie fonetiche',
        vi: 'segni dei toni spesso mancanti (vietnamita "kh\u00f4ng d\u1ea5u"): ricostruisci la parola con i toni dal '
            + 'contesto; abbreviazioni: ko/k/hk = kh\u00f4ng, dc/\u0111c = \u0111\u01b0\u1ee3c, ng = ng\u01b0\u1eddi, j = g\u00ec, '
            + 'bt = bi\u1ebft, dg/\u0111g = \u0111\u01b0\u1eddng',
        th: 'thailandese in lettere latine ("karaoke") o con errori di tastiera; le parole non sono separate da spazi; '
            + '555 = risata',
        zh: 'errori della scrittura in pinyin o della dettatura: caratteri omofoni sbagliati (\u7684/\u5f97/\u5730, '
            + '\u5728/\u518d, \u8def/\u9732), pinyin senza toni; leggi ogni carattere per come suona e scegli quello che ha '
            + 'senso',
        ja: 'errori di conversione dei kanji (omofoni sbagliati), testo in r\u014dmaji o tutto in hiragana dalla dettatura',
        ko: 'spaziature mancanti, abbreviazioni in consonanti (\u3147\u3147, \u3131\u3145, \u3134\u3134), coreano in '
            + 'lettere latine, errori di dettatura fra sillabe dal suono simile',
        he: 'ebraico in lettere latine; lettere dal suono uguale scambiate (\u05d8/\u05ea, \u05db/\u05d7, \u05e7/\u05db, '
            + '\u05d0/\u05e2, \u05e1/\u05e9)',
        fa: 'persiano in lettere latine ("finglish") con cifre come in arabizi; \u06a9/\u0643 e \u06cc/\u064a mescolate',
        ur: 'urdu in lettere latine (roman urdu) con grafie variabili (kya/kia, nahi/nhi, hai/h), parole inglesi mescolate',
        hi: 'hindi in lettere latine (hinglish) con grafie variabili (kya/kia, nahi/nhi, hai/h, raasta/rasta), '
            + 'parole inglesi mescolate; dettatura in devanagari con omofoni',
        bn: 'bengalese in lettere latine con grafie variabili, parole inglesi mescolate',
        pa: 'punjabi in lettere latine o in shahmukhi/gurmukhi mescolati',
        ta: 'tamil in lettere latine (tanglish) con grafie variabili',
        te: 'telugu in lettere latine con grafie variabili',
        mr: 'marathi in lettere latine con grafie variabili',
        sw: 'swahili con parole inglesi mescolate (sheng); abbreviazioni da chat',
        ka: 'georgiano in lettere latine (sh = \u10e8, ch = \u10e9/\u10ed, kh = \u10ee, 7 = \u10ed, 3 = \u10eb)',
        hy: 'armeno in lettere latine con cifre come lettere',
        az: 'segni mancanti (\u0259 = e/a, \u0131 = i, \u015f = s, \u00e7 = c, \u011f = g, \u00f6/\u00fc = o/u)',
        kk: 'kazako in lettere latine o mescolato al russo'
    };
    const FONETICA_ALIAS = { tl: 'fil', nb: 'no', nn: 'no', cnr: 'sr', mk: 'bg' };
    // Due parole sulla pronuncia della variante del paese, quando cambia la resa scritta
    function foneticaPaese(l, r) {
        if (!r) return '';
        if (l === 'es') return AMERICA_LATINA.has(r) || r === 'US' ? '; in America Latina c\u0027\u00e8 sempre il seseo (s, c e z suonano uguali)'
            + (['AR', 'UY'].includes(r) ? ' e ll/y si pronunciano "sh": "yamar"/"shamar" = llamar' : '')
            + (['CU', 'DO', 'PR', 'VE', 'PA'].includes(r) ? ' e la s finale cade ("ma" = m\u00e1s, "loh" = los), r e l si scambiano' : '')
            : '';
        if (l === 'pt') return r === 'BR' ? '; pronuncia brasiliana: "ti/di" per te/de, l finale "u" (Brasiu), r iniziale aspirata'
            : '; pronuncia europea: vocali atone quasi mute, parole scritte contratte';
        if (l === 'en') return ORTOGRAFIA_USA.has(r) ? '' : (['IN', 'PK', 'NG', 'GH', 'KE'].includes(r)
            ? '; inglese di quel paese, con parole e costruzioni locali mescolate' : '');
        if (l === 'fr' && r === 'CA') return '; francese del Qu\u00e9bec, con parole quebecchesi e inglesi mescolate';
        if (l === 'de' && (r === 'CH' || r === 'AT')) return '; parole e frasi in dialetto ' + (r === 'CH' ? 'svizzero' : 'austriaco') + ' scritte come si pronunciano';
        if (l === 'ar') return '; dialetto parlato in ' + (nomePaese(r) || r);
        return '';
    }
    // Il nome della lingua della UR con il paese, per dire al modello da dove viene il testo
    function nomeSorgente(c) {
        const p = partiCodice(c);
        let s = minuscola(nomeLingua(p.lingua)).replace(/\s*\(.*\)\s*$/, '');
        if (p.script) s += ' in alfabeto ' + (nomeScript(p.script) || p.script);
        if (p.regione) s += ' (' + (nomePaese(p.regione) || p.regione) + ')';
        return s;
    }
    function istruzioniFonetica(da) {
        const noto = da && da !== 'auto';
        const p = noto ? partiCodice(da) : {};
        const l = noto ? (FONETICA_ALIAS[p.lingua] || p.lingua) : '';
        const lingua = noto ? 'in ' + nomeSorgente(da) : 'nella sua lingua (riconoscila prima di tradurre, con il paese se si capisce)';
        let s = 'LEGGI IL TESTO PER COME SUONA ' + lingua + ':\n'
            + '- molte segnalazioni sono dettate a voce mentre si guida e trascritte dal riconoscimento vocale del '
            + 'telefono: ci sono parole sostituite da altre che si pronunciano uguali o quasi, parole spezzate o unite, '
            + 'numeri scritti in lettere, niente punteggiatura. Altre sono scritte di fretta, senza accenti, con '
            + 'abbreviazioni da chat o in alfabeto latino al posto di quello della lingua;\n'
            + '- quando una parola non ha senso nel contesto, pronunciala ad alta voce con l\u0027accento di chi scrive e '
            + 'scegli la parola che suona uguale o quasi e che ha senso in una segnalazione stradale (strade, incroci, '
            + 'svolte, corsie, rotatorie, uscite, lavori, chiusure, autovelox, limiti, indicazioni del navigatore); '
            + 'poi traduci il significato ricostruito. Non spiegare le correzioni: traduci direttamente;\n'
            + '- i nomi di vie, localit\u00e0 e negozi non si \u201ccorreggono\u201d in altri nomi: lasciali come sono scritti.\n';
        const note = noto ? (FONETICA[l] || '') + foneticaPaese(p.lingua, p.regione) : '';
        if (note) s += 'Trappole tipiche di questa lingua: ' + note.replace(/^;\s*/, '') + '.\n';
        return s;
    }

    // Il gergo delle UR: senza queste righe i modelli piccoli traducono "tope" con "tappo"
    // e "lombada" con "collina". Serve solo quando si traduce VERSO l'italiano: nell'altro
    // verso i vocaboli giusti li decide la variante del segnalante (vedi SCRITTURA).
    const GLOSSARIO = 'speed bump / speed hump / tope / lombada / quebra-molas / lomo de burro / resalto = dosso; '
        + 'roundabout / rotonda / glorieta / rotat\u00f3ria = rotatoria; turn = svolta; one way = senso unico; '
        + 'two way / m\u00e3o dupla / doble sentido = doppio senso; road works / obras = lavori in corso; '
        + 'closure / cierre = chiusura; junction = incrocio; exit = uscita; detour / desvio = deviazione; '
        + 'lane = corsia; dead end = strada senza uscita; no entry = divieto di accesso; '
        + 'speed limit = limite di velocit\u00e0.';

    /* Le istruzioni al modello. La regola e' quella di un traduttore: stesso contenuto,
       stesso ordine, stesso tono, niente aggiunte e niente tagli; ma una frase corretta
       nella lingua di arrivo, con verbi, persone, generi e accordi al loro posto. */
    function istruzioniAI(da, a, opz) {
        const o = opz || {};
        const tipo = (typeof urObj !== 'undefined' && urObj && urObj.updateRequestType) ? nomeTipo(urObj.updateRequestType) : '';
        const verso = scritturaDi(a);
        const dalla = (da && da !== 'auto') ? nomeSorgente(da) : '';
        let s = 'Sei un traduttore professionista. Traduci il testo in ' + verso + '.\n';
        if (o.uscita) {
            s += 'E\u0027 il messaggio che un editor volontario di Waze scrive all\u0027automobilista che ha fatto '
                + 'una segnalazione' + (tipo ? ' (' + tipo.toLowerCase() + ')' : '') + '. Il contesto ti serve solo '
                + 'a capire il senso: il messaggio non va migliorato, accorciato, semplificato ne\u0027 reso piu\u0027 gentile.\n';
        } else {
            s += 'Sono i messaggi di una segnalazione Waze' + (tipo ? ' di tipo "' + tipo.toLowerCase() + '"' : '')
                + (dalla ? ', scritti in ' + dalla : '') + ', fra un automobilista e gli editor volontari. '
                + 'Spesso sono brevi, senza punteggiatura, con errori di battitura o parole dialettali.\n'
                + istruzioniFonetica(da);
        }
        s += 'TRADUZIONE FEDELE, non una riscrittura:\n'
            + '- traduci esattamente quello che c\u0027e\u0027 scritto, frase per frase e nello stesso ordine: stesso '
            + 'significato, stesse informazioni, stesso tono;\n'
            + '- non aggiungere niente (saluti, ringraziamenti, scuse, spiegazioni, dettagli) e non togliere niente;\n'
            + '- TRADUCI TUTTE LE PAROLE: ogni parola dell\u0027originale deve avere il suo corrispondente nella '
            + 'traduzione, comprese quelle che sembrano sbagliate (ricostruiscile dalla pronuncia), gli intercalari, '
            + 'le esclamazioni, le parolacce e l\u0027ultima frase anche se \u00e8 tronca. Nessuna parola deve restare '
            + 'nella lingua di partenza, tranne i nomi propri e le sigle;\n'
            + '- non riformulare, non riassumere, non abbellire, non cambiare il livello di cortesia;\n'
            + '- la traduzione deve pero\u0027 essere una frase corretta e di senso compiuto nella lingua di arrivo: '
            + 'coniuga bene i verbi (tempo, modo, persona, numero), accorda genere e numero di articoli, nomi, '
            + 'aggettivi e participi, usa le preposizioni e l\u0027ordine delle parole di quella lingua. Dove la resa '
            + 'parola per parola sarebbe sgrammaticata o incomprensibile, usa la costruzione che in quella lingua '
            + 'dice esattamente la stessa cosa;\n'
            + '- non cambiare le persone: chi parla resta chi parla (io resta io, noi resta noi) e ci si rivolge '
            + 'alla stessa persona. Se il testo da\u0027 del tu, usa la forma confidenziale della lingua di arrivo; '
            + 'se da\u0027 del Lei o del Voi, usa quella di cortesia (Sie, usted, vous, o senhor...), secondo la '
            + 'variante indicata sopra;\n'
            + '- se la lingua di arrivo vuole il genere di chi scrive o di chi legge e il testo non lo dice, usa '
            + 'la forma che quella lingua usa quando il genere non si conosce; se il testo lo dice, rispettalo;\n'
            + '- lascia invariati nomi di persona, di vie, piazze e localit\u00e0, marchi, sigle (Waze, WME, UR, GPS), '
            + 'numeri, indirizzi web e le parole fra simboli di dollaro ($URD$, $USERNAME$...);\n'
            + '- mantieni gli a capo, la punteggiatura e gli emoji;\n'
            + '- scrivi con tutti gli accenti e i segni della lingua di arrivo (\u00e0 \u00e9 \u00f1 \u00e7 \u00e3 \u00fc \u00df...), '
            + 'anche dove l\u0027originale li ha saltati;\n'
            + '- traduci SEMPRE, anche se il testo e\u0027 brevissimo, tutto minuscolo o senza punteggiatura: '
            + 'non lasciarlo mai nella lingua di partenza. Se e\u0027 sgrammaticato o pieno di errori di battitura, '
            + 'la traduzione dice la stessa cosa in forma corretta: correggi la forma, non il contenuto;\n'
            + '- rispondi solo con la traduzione: niente virgolette, niente note, niente testo originale.';
        if (!o.uscita && base(a) === 'it') s += '\nTermini ricorrenti: ' + GLOSSARIO;
        if (o.conversazione) s += '\nI blocchi sono messaggi consecutivi della STESSA conversazione, in ordine: '
            + 'traducili uno per uno, senza fonderli, tenendoli coerenti fra loro (chi parla, di che strada si parla).';
        if (o.insistere) s += '\nATTENZIONE: il tentativo precedente ha restituito il testo quasi identico '
            + 'all\u0027originale, cioe\u0027 non tradotto. Questa volta traducilo davvero e per intero, con le stesse regole.';
        return s;
    }

    async function trAI(testo, da, a, opz) {
        const o = opz || {};
        const valida = out => {
            const x = String(out || '').trim();
            return !!x && intoccabiliSalvi(testo, x) && lunghezzaSensata(testo, x)
                && (o.uscita || !da || da === 'auto' || base(da) === base(a) || !nonTradotto(testo, x));
        };
        const t = (await aiChat(istruzioniAI(da, a, o), testo, { prio: o.prio, pazienza: o.pazienza, uscita: o.uscita, da, a, valida })).trim()
            .replace(/^["\u201c]|["\u201d]$/g, '');
        // Prima, con la lingua di partenza non dichiarata, dopo ogni traduzione partiva una
        // seconda richiesta solo per sapere la lingua: dato che poi non si usava.
        return { t, d: (da && da !== 'auto') ? da : '' };
    }

    async function rilevaLingua(testo) {
        const intero = String(testo || '').trim();
        const t = intero.slice(0, 400);
        if (!t) return '';
        const k = hash('rileva|' + t);
        const c = cacheGet(k);
        if (c) return c.d;
        // Se hai scelto un motore AI, la lingua la chiedi a lui: e' una riga di risposta e
        // non manda il testo a un servizio che hai deciso di non usare.
        if (motoreAI()) {
            try {
                const risposta = await aiChat(
                    'Dimmi in che lingua e\u0027 scritto il testo. Rispondi SOLO con il codice BCP-47. '
                    + 'Il testo pu\u00f2 essere dettato a voce, senza accenti, in abbreviazioni da chat o in alfabeto '
                    + 'latino al posto del proprio (arabo con le cifre, greeklish, russo traslitterato, hinglish): '
                    + 'conta la lingua PARLATA, non l\u0027alfabeto ("7abibi wen el shari3" = ar, "kya rasta band hai" = hi). '
                    + 'Aggiungi il paese solo se dal testo si capisce con sicurezza (per esempio il voseo '
                    + '"vos ten\u00e9s" = es-AR, "voc\u00ea" = pt-BR, "estou a fazer" = pt-PT); altrimenti solo la '
                    + 'lingua (esempi: it, en, es, es-AR, pt-BR, ar, zh-TW). Nessun\u0027altra parola.', t, { pazienza: 20000, rileva: true });
                const d = normLang(String(risposta).trim().split(/\s|\n/)[0].replace(/[^A-Za-z0-9-]/g, ''));
                if (linguaValida(d)) { cacheSet(k, '', d); return d; }
            } catch (e) { log('riconoscimento lingua con AI non riuscito, provo con Google:', e && e.message); }
        }
        try {
            // si chiede la traduzione verso la TUA lingua invece che verso l'inglese: la
            // risposta serve a riconoscere la lingua e, gia' che c'e', e' la traduzione
            // buona. Cosi' la descrizione compare senza una seconda andata e ritorno.
            const txt = await http({
                url: 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl='
                    + encodeURIComponent(gTrad(settings.mia)) + '&dt=t&ie=UTF-8&oe=UTF-8&q=' + encodeURIComponent(t)
            });
            const j = JSON.parse(txt);
            const d = normLang(j && j[2] ? j[2] : '');
            cacheSet(k, '', d);
            if (d && d !== settings.mia && motore() === 'google' && intero.length <= 400 && Array.isArray(j[0])) {
                const tradotto = j[0].map(s => (s && s[0]) ? s[0] : '').join('');
                if (tradotto) cacheSet(chiaveTr('google', d, settings.mia, intero, false), tradotto, d);
            }
            return d;
        } catch { return ''; }
    }

    /* --- Groq: quote, limiti e riserve ------------------------------- */

    /* Il piano gratuito di Groq conta, per ogni modello, le richieste al minuto e al giorno e i
       token al minuto e al giorno. Il posto si prenota nello stesso istante in cui si controlla,
       cosi' con piu' traduzioni in parallelo non si sfora il tetto. Chi aspetta sta in fila per
       priorita': quello che stai per inviare passa davanti alla traduzione della conversazione. */
    const PRIO_CONVERSAZIONE = 1, PRIO_INVIO = 3;
    const quote = new Map();
    const fila = [];
    let numeroFila = 0, timerFila = null;
    const tettoRpm = () => Math.max(1, Math.min(60, parseInt(settings.rpm, 10) || CONFIG.richiesteAlMinuto));
    function quota(ch) {
        if (!quote.has(ch)) quote.set(ch, { orari: [], pausaFino: 0 });
        return quote.get(ch);
    }
    // fra quanti millisecondi quel modello ha un posto libero
    function liberoFra(ch) {
        const qq = quota(ch), ora = Date.now();
        qq.orari = qq.orari.filter(t => ora - t < 60000);
        let ms = Math.max(0, qq.pausaFino - ora);
        if (qq.orari.length >= tettoRpm()) ms = Math.max(ms, 60000 - (ora - qq.orari[0]) + 300);
        const ultima = qq.orari[qq.orari.length - 1];
        if (ultima) ms = Math.max(ms, 150 - (ora - ultima));
        return ms;
    }
    function smistaFila() {
        clearTimeout(timerFila); timerFila = null;
        fila.sort((x, y) => (y.prio - x.prio) || (x.n - y.n));
        let prossimo = Infinity;
        for (let i = 0; i < fila.length; i++) {
            const w = fila[i];
            const ms = liberoFra(w.ch);
            if (ms <= 0) { quota(w.ch).orari.push(Date.now()); fila.splice(i, 1); i--; w.via(); }
            else prossimo = Math.min(prossimo, ms);
        }
        if (fila.length) timerFila = setTimeout(smistaFila, Math.max(50, isFinite(prossimo) ? prossimo : 1000));
    }
    const prenotaTurno = (ch, prio) => new Promise(via => {
        fila.push({ ch, prio: prio || PRIO_CONVERSAZIONE, n: numeroFila++, via });
        smistaFila();
    });

    /* Un modello sovraccarico, senza quota per oggi o sparito viene messo a riposo e intanto
       lavora la prima riserva libera. Il riposo per sovraccarico cresce se il problema si
       ripete (3 s, 10 s, 30 s, 1 e 2 minuti) e si azzera appena il modello torna a rispondere. */
    const FERMI_KEY = 'wmeUrTranslator_fermi';
    let fermi = (() => { try { return JSON.parse(localStorage.getItem(FERMI_KEY) || '{}') || {}; } catch { return {}; } })();
    // i riposi dei modelli Gemini delle versioni precedenti non servono piu'
    Object.keys(fermi).forEach(k => { if (k.indexOf('gemini|') === 0) delete fermi[k]; });
    const salvaFermi = () => { try { localStorage.setItem(FERMI_KEY, JSON.stringify(fermi)); } catch { /* ignora */ } };
    const chiaveModello = (m, mod) => m + '|' + mod;
    function fermo(m, mod) {
        const f = fermi[chiaveModello(m, mod)];
        return (f && f.fino > Date.now()) ? f : null;
    }
    function metti(m, mod, ms, perche, volte) {
        fermi[chiaveModello(m, mod)] = { fino: Date.now() + ms, perche, volte: volte || 1 };
        salvaFermi(); disegnaModelli();
    }
    function riattiva(m, mod) {
        const k = chiaveModello(m, mod);
        if (fermi[k]) { delete fermi[k]; salvaFermi(); disegnaModelli(); }
    }
    const senzaThinking = new Set();
    const alle = t => new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    function corpoErrore(e) {
        const c = e && e.corpo;
        const j = Array.isArray(c) ? c[0] : c;
        return (j && j.error) || {};
    }
    // Che tipo di errore e': decide se si aspetta, si passa alla riserva o ci si ferma
    function tipoErrore(e) {
        if (!e) return 'altro';
        if (e.tipo) return e.tipo;
        const msg = String(e.message || e);
        const st = e.status;
        const err = corpoErrore(e);
        const tutto = msg + ' ' + (err.message || '') + ' ' + (err.status || '') + ' ' + (err.type || '') + ' ' + (err.code || '');
        if (/manca la chiave/.test(msg)) return 'chiave';
        if (st === 413 || /request too large|context.length|too many tokens|reduce your message/i.test(tutto)) return 'grande';
        if (st === 429 || /rate.?limit|too many requests/i.test(tutto)) {
            if (/insufficient_quota|credit balance/i.test(tutto)) return 'credito';   // (i 429 di Groq citano la pagina "billing": non e' credito)
            return /per.day|\(TPD\)|\(RPD\)|daily/i.test(tutto) ? 'giorno' : 'minuto';
        }
        if (st === 400 && /reasoning|thinking/i.test(tutto)) return 'thinking';
        if (st === 404 || /model_not_found|model_decommissioned|decommissioned|does not exist|not found/i.test(tutto)) return 'inesistente';
        if (e.rete || [500, 502, 503, 504, 529].indexOf(st) >= 0 || /overloaded|over capacity|unavailable|high demand/i.test(tutto)) return 'sovraccarico';
        if (st === 401 || st === 403 || /api[ _]?key|invalid_api_key|authentication/i.test(tutto)) return 'chiave';
        return 'altro';
    }
    // Errori da cui ci si riprende aspettando: la conversazione riprova da sola, senza contarli
    const transitorio = e => !!(e && (e.transitorio || /^(sovraccarico|minuto)$/.test(tipoErrore(e))));
    // "2m59.56s", "7.66s", "450ms", "1h2m3s" in millisecondi
    function durata(t) {
        const y = /^\s*(?:(\d+)h)?\s*(?:(\d+)m(?!s))?\s*(?:([\d.]+)\s*(ms|s))?\s*$/i.exec(String(t || ''));
        if (!y || !(y[1] || y[2] || y[3])) return 0;
        return Math.ceil((+(y[1] || 0)) * 3600000 + (+(y[2] || 0)) * 60000 + (y[3] ? parseFloat(y[3]) * (y[4] === 'ms' ? 1 : 1000) : 0));
    }
    function attesaSuggerita(e) {
        if (e && e.attesaMs) return e.attesaMs + 300;
        // "Please try again in 1m30.5s" o "in 450ms" (il messaggio completo sta nel corpo)
        const y = /try again in\s*([\dhms.]+)/i.exec(String((e && e.message) || '') + ' ' + String(corpoErrore(e).message || ''));
        const ms = y ? durata(y[1]) : 0;
        return ms ? ms + 500 : 20000;
    }
    const conPrefisso = (p, e) => {
        const n = new Error(p + ': ' + ((e && e.message) || e));
        ['status', 'corpo', 'attesaMs', 'rete', 'header'].forEach(k => { if (e && e[k] != null) n[k] = e[k]; });
        return n;
    };

    // I modelli di riserva: quelli scritti nella scheda (o in CONFIG) e, se serve, gli altri
    // modelli di testo della tua chiave, letti una volta ogni 12 ore dall'elenco ufficiale.
    const elencoModelli = s => (Array.isArray(s) ? s : String(s || '').split(/[\s,;]+/))
        .map(x => String(x).trim().replace(/^models\//, '')).filter(Boolean);
    const riserveManuali = m => elencoModelli(settings.riserve[m] != null ? settings.riserve[m] : (CONFIG.riserve[m] || []));
    const SCOPERTI_KEY = 'wmeUrTranslator_modelliGroq';
    let scoperti = (() => { try { return JSON.parse(localStorage.getItem(SCOPERTI_KEY) || 'null'); } catch { return null; } })();
    let scoperta = null;
    // prima i modelli grandi e multilingue, poi quelli piccoli: su Groq ognuno ha la sua quota
    function puntiModello(n) {
        const ordine = [/gpt-oss-120b/, /kimi/, /maverick/, /qwen/, /llama-3\.3-70b/, /deepseek/, /gpt-oss-20b/, /scout/, /gemma/, /mistral/, /8b/];
        const i = ordine.findIndex(rx => rx.test(n));
        return i < 0 ? ordine.length : i;
    }
    function modelliGroq() {
        const key = chiave('groq');
        if (!key) return Promise.resolve([]);
        const impronta = hash(key);
        if (scoperti && scoperti.k === impronta && Date.now() - scoperti.w < 12 * 3600000) return Promise.resolve(scoperti.l || []);
        if (!scoperta) {
            scoperta = http({ url: 'https://api.groq.com/openai/v1/models', headers: { Authorization: 'Bearer ' + key }, timeout: 15000 })
                .then(txt => {
                    const l = ((JSON.parse(txt) || {}).data || [])
                        .filter(x => x && x.id && x.active !== false)
                        .map(x => String(x.id))
                        .filter(n => !/whisper|tts|orpheus|playai|guard|safeguard|compound|distil|embed|vision|allam|arabic-tts/i.test(n))
                        .sort((a, c) => puntiModello(a) - puntiModello(c));
                    scoperti = { k: impronta, w: Date.now(), l };
                    try { localStorage.setItem(SCOPERTI_KEY, JSON.stringify(scoperti)); } catch { /* ignora */ }
                    return l;
                })
                .catch(e => { log('elenco dei modelli Groq non letto:', e && e.message); return (scoperti && scoperti.l) || []; })
                .finally(() => { scoperta = null; });
        }
        return scoperta;
    }
    // Modello per quello che invii (vuoto = lo stesso della conversazione)
    const modelloInvio = m => {
        const k = m || motore();
        const v = settings.modelliInvio[k] != null ? settings.modelliInvio[k] : ((CONFIG.modelliInvio || {})[k] || '');
        return String(v || '').trim();
    };

    /* --- Scelte, tempi e limiti veri di ogni modello ----------------- */

    const DECISIONI = [];
    function annota(d) { DECISIONI.push(Object.assign({ ora: new Date().toLocaleTimeString('it-IT') }, d)); if (DECISIONI.length > 20) DECISIONI.shift(); }

    // tempi di risposta misurati sul tuo computer (media mobile)
    const tempi = {};
    const misura = (m, mod, ms) => { const k = chiaveModello(m, mod); tempi[k] = tempi[k] ? Math.round(tempi[k] * 0.7 + ms * 0.3) : ms; };
    const tempoDi = (m, mod) => tempi[chiaveModello(m, mod)] || 0;

    // token usati nelle ultime 24 ore, per modello, salvati nel browser (per la scheda e per
    // non superare il limite al minuto prima ancora di chiedere)
    const GROQ_KEY = 'wmeUrTranslator_groqUso';
    let usoGroq = (() => { try { return JSON.parse(localStorage.getItem(GROQ_KEY) || '[]') || []; } catch { return []; } })();
    function tokenGroq(finestraMs, mod) {
        const ora = Date.now();
        usoGroq = usoGroq.filter(x => ora - x[0] < 86400000);
        return usoGroq.filter(x => ora - x[0] < finestraMs && (!mod || (x[2] || modello('groq')) === mod)).reduce((s, x) => s + x[1], 0);
    }
    function contaGroq(tokens, mod) {
        usoGroq.push([Date.now(), Math.max(1, Math.round(tokens)), mod || modello('groq')]);
        tokenGroq(86400000);
        try { localStorage.setItem(GROQ_KEY, JSON.stringify(usoGroq)); } catch { /* ignora */ }
    }
    /* Ogni risposta di Groq dice i limiti veri di quel modello (x-ratelimit-*): richieste al
       giorno e token al minuto, quanti ne restano e fra quanto si rinnovano. Si tengono qui e
       si usano per scegliere il modello libero senza aspettare un errore 429. */
    const limiti = {};
    function leggiLimiti(mod, header) {
        const h = {};
        String(header || '').split(/\r?\n/).forEach(r => { const i = r.indexOf(':'); if (i > 0) h[r.slice(0, i).trim().toLowerCase()] = r.slice(i + 1).trim(); });
        const n = k => (h[k] != null && h[k] !== '' && isFinite(+h[k])) ? +h[k] : null;
        if (n('x-ratelimit-limit-tokens') == null && n('x-ratelimit-limit-requests') == null) return;
        const ora = Date.now();
        limiti[mod] = {
            tpm: n('x-ratelimit-limit-tokens'), rpd: n('x-ratelimit-limit-requests'),
            tokenRestano: n('x-ratelimit-remaining-tokens'), tokenFino: ora + durata(h['x-ratelimit-reset-tokens']),
            richiesteRestano: n('x-ratelimit-remaining-requests'), richiesteFino: ora + durata(h['x-ratelimit-reset-requests'])
        };
        const L = limiti[mod];
        // richieste del giorno finite: il modello riposa fino al rinnovo, lavorano le riserve
        if (L.richiesteRestano === 0 && L.richiesteFino > ora) metti('groq', mod, L.richiesteFino - ora + 1000, 'giorno');
    }
    const tpmDi = mod => (limiti[mod] && limiti[mod].tpm) || (CONFIG.limitiGroq || {}).tokenMinuto || 8000;
    // stima dei token di una richiesta: testo e istruzioni, piu' lo spazio riservato alla risposta
    // (i modelli che ragionano scrivono anche il ragionamento, che conta come risposta)
    const maxRispostaGroq = user => Math.min(6000, 600 + Math.ceil(String(user).length / 1.8));
    const stimaToken = (sys, user) => Math.ceil((String(sys).length + String(user).length) / 3.2) + maxRispostaGroq(user);
    // fra quanto quel modello ha posto per questa richiesta: 0 subito, Infinity mai (troppo grande)
    function attesaGroq(mod, stima) {
        const tpm = tpmDi(mod), ora = Date.now();
        if (stima > tpm * 0.95) return Infinity;
        let ms = 0;
        const L = limiti[mod];
        if (L && L.tokenRestano != null && L.tokenFino > ora && L.tokenRestano < stima) ms = L.tokenFino - ora + 200;
        if (tokenGroq(60000, mod) + stima > tpm) {
            // si libera quando esce dalla finestra del minuto la richiesta piu' vecchia
            const vecchie = usoGroq.filter(x => ora - x[0] < 60000 && (x[2] || modello('groq')) === mod).sort((p, q) => p[0] - q[0]);
            if (vecchie.length) ms = Math.max(ms, 60000 - (ora - vecchie[0][0]) + 300);
        }
        return ms;
    }

    /* Chi puo' rispondere, in ordine: coppie { m: motore, mod: modello }. Per quello che invii
       prima il modello dell'invio, se c'e'; poi quello scelto e le riserve; se sono tutti fermi,
       gli altri modelli della tua chiave. Un modello senza posto al minuto per questa richiesta
       resta in elenco con la sua attesa: se un altro e' libero risponde l'altro. */
    async function candidati(m, o) {
        const coppie = [];
        const metti2 = mods => mods.forEach(x => { if (x && !coppie.some(c => c.mod === x)) coppie.push({ m, mod: x }); });
        const tuttiFermi = () => coppie.every(c => fermo(c.m, c.mod));
        metti2((o.uscita ? [modelloInvio(m)] : []).concat([modello(m)], riserveManuali(m)));
        if (settings.riserveAuto && tuttiFermi()) metti2((await modelliGroq()).slice(0, 8));
        return coppie.filter(c => {
            const ms = attesaGroq(c.mod, o.stima || 0);
            if (ms === Infinity) return false;
            if (ms > 0) { const q = quota(chiaveModello(c.m, c.mod)); q.pausaFino = Math.max(q.pausaFino, Date.now() + ms); }
            return true;
        });
    }

    let ultimoModello = '';   // chi ha risposto l'ultima volta: la barra lo dice quando e' un altro
    const etichetta = (m, c) => c.mod;
    const viaRiserva = () => (motoreAI() && ultimoModello && ultimoModello !== modello() && ultimoModello !== modelloInvio())
        ? ' \u00b7 ha risposto ' + ultimoModello : '';

    function erroreFinale(m, lista, ultimo, riapre) {
        const stati = lista.map(c => fermo(c.m, c.mod)).filter(Boolean);
        let msg, tipo;
        if (stati.length && stati.every(f => f.perche === 'inesistente')) {
            msg = `il modello "${modello(m)}" non esiste pi\u00f9: scegline un altro nella scheda ${SIGLA}`; tipo = 'inesistente';
        } else if (stati.every(f => f.perche !== 'sovraccarico')) {
            msg = `quota gratuita di oggi finita su tutti i modelli, torna alle ${alle(riapre)}`; tipo = 'giorno';
        } else {
            msg = `server sovraccarichi (errore ${(ultimo && ultimo.status) || 503}), di solito passa in pochi secondi`; tipo = 'sovraccarico';
        }
        const e = new Error(nomeMotore(m) + ': ' + msg);
        e.tipo = tipo;
        e.riprovaFra = Math.max(1000, riapre - Date.now());
        e.transitorio = tipo === 'sovraccarico' || (tipo === 'giorno' && e.riprovaFra < 600000);
        return e;
    }

    /* Cosa fare quando un modello risponde con un errore. Torna true se si puo' passare al
       prossimo, false se l'errore va mostrato (chiave sbagliata). */
    function gestisciErrore(m, c, e) {
        if (e.gestito) return e.esito;
        e.gestito = true;
        e.esito = decidiErrore(m, c, e);
        return e.esito;
    }
    function decidiErrore(m, c, e) {
        const mm = c.m, mod = c.mod, ch = chiaveModello(mm, mod);
        const tipo = tipoErrore(e);
        const principale = mod === modello(m);
        log(`${mm} ${mod}: ${e.message} [${tipo}]`);
        if (e.header) leggiLimiti(mod, e.header);
        if (tipo === 'sovraccarico') {
            const prima = fermi[ch];
            const volte = (prima && Date.now() - prima.fino < 600000) ? (prima.volte || 1) + 1 : 1;
            const passi = [3000, 10000, 30000, 60000, 120000];
            metti(mm, mod, passi[Math.min(volte, passi.length) - 1], 'sovraccarico', volte);
            return true;
        }
        if (tipo === 'minuto') { quota(ch).pausaFino = Date.now() + attesaSuggerita(e); return true; }
        // Groq conta le ultime 24 ore e dice lui fra quanto riprovare
        if (tipo === 'giorno') { metti(mm, mod, Math.max(60000, attesaSuggerita(e)), 'giorno'); return true; }
        if (tipo === 'inesistente') { metti(mm, mod, 6 * 3600000, 'inesistente'); return true; }
        if (tipo === 'thinking' && !senzaThinking.has(mod)) { senzaThinking.add(mod); return true; }
        if (tipo === 'grande') { quota(ch).pausaFino = Date.now() + 60000; return true; }
        const chiaveVera = /api[ _]?key|invalid_api_key|manca la chiave/i.test(String(e.message || '') + ' ' + JSON.stringify(corpoErrore(e)));
        // un modello di riserva che la tua chiave non puo' usare (permesso negato, modello
        // riservato, richiesta rifiutata) si mette da parte e si passa al successivo
        if (!principale && !chiaveVera && (tipo === 'altro' || tipo === 'chiave' || tipo === 'credito')) {
            metti(mm, mod, 6 * 3600000, 'inesistente');
            return true;
        }
        return false;
    }

    // Una chiamata a un modello, misurata e con il modello riattivato se risponde
    function chiama(c, sys, user) {
        const t0 = Date.now();
        return aiChiamata(c.m, c.mod, sys, user).then(out => { misura(c.m, c.mod, Date.now() - t0); riattiva(c.m, c.mod); return out; });
    }

    /* La corsa: se il modello ci sta mettendo molto piu' del solito, parte anche la prima
       riserva libera e vale la prima risposta CORRETTA (blocchi presenti, variabili e link
       intatti, testo davvero tradotto). Una risposta sbagliata non vince mai, anche se arriva
       prima: si aspetta l'altra. */
    function corsa(m, a, b, sys, user, dopoMs, valida) {
        return new Promise((resolve, reject) => {
            let finito = false, partitaB = false, timer = null;
            const st = { a: null, b: null };   // null = in viaggio, { out } o { err }
            const fine = (c, out) => { if (finito) return; finito = true; clearTimeout(timer); resolve({ c, out }); };
            const decidi = () => {
                if (finito) return;
                if (st.a && st.a.out != null && valida(st.a.out)) return fine(a, st.a.out);
                if (st.b && st.b.out != null && valida(st.b.out)) return fine(b, st.b.out);
                // il primo ha finito male e la riserva non era ancora partita: parte adesso
                if (st.a && !partitaB) { clearTimeout(timer); return partiB(); }
                if (st.a && st.b) {
                    finito = true;
                    // nessuna risposta corretta: se una c'e' comunque, la si passa a chi controlla
                    if (st.a.out != null) resolve({ c: a, out: st.a.out });
                    else if (st.b.out != null) resolve({ c: b, out: st.b.out });
                    else reject(st.a.err);
                }
            };
            const partiB = () => {
                if (finito || partitaB) return;
                if (fermo(b.m, b.mod) || liberoFra(chiaveModello(b.m, b.mod)) > 0) {
                    // la riserva non ha posto: si aspetta solo il primo
                    partitaB = true; st.b = { err: new Error('riserva non libera') }; decidi(); return;
                }
                partitaB = true;
                quota(chiaveModello(b.m, b.mod)).orari.push(Date.now());
                annota({ compito: 'corsa', lingua: '', scelta: `${a.mod} ci mette pi\u00f9 di ${(dopoMs / 1000).toFixed(1)} s o ha sbagliato: parte anche ${b.mod}` });
                chiama(b, sys, user).then(out => { st.b = { out }; decidi(); },
                    e => { st.b = { err: e }; gestisciErrore(m, b, e); decidi(); });
            };
            chiama(a, sys, user).then(out => { st.a = { out }; decidi(); },
                e => { st.a = { err: e }; gestisciErrore(m, a, e); decidi(); });
            timer = setTimeout(partiB, dopoMs);
        });
    }

    /* Una chiamata al modello AI, con tutto quello che serve per non perderla:
       - sovraccarico (500/502/503): il modello va a riposo e si passa subito al prossimo;
       - limite al minuto (429): se un altro modello e' libero risponde lui, altrimenti si
         aspetta il tempo che dice il servizio;
       - quota del giorno finita o modello sparito (404): quel modello si salta finche' torna;
       - chiave sbagliata: errore subito, inutile insistere.
       "pazienza" e' il tempo massimo di attesa: breve per quello che stai inviando, lungo per
       la conversazione che si traduce in sottofondo. */
    async function aiChat(sys, user, opz) {
        const o = opz || {};
        const m = motore();
        if (!MOTORI[m].ai) throw new Error('Il motore scelto non \u00e8 un modello AI: cambialo nelle impostazioni.');
        if (MOTORI[m].chiave && !chiave(m)) throw mancaChiave(m);
        o.stima = stimaToken(sys, user);
        const valida = o.valida || (out => !!String(out || '').trim());
        const scadenza = Date.now() + (o.pazienza || 90000);
        let ultimo = null;
        for (;;) {
            const lista = await candidati(m, o);
            if (!lista.length) {
                const e = new Error(nomeMotore(m) + ': testo troppo lungo per i limiti gratuiti, riprovo a pezzi');
                e.tipo = 'grande'; e.gestito = true; e.esito = false;
                throw e;
            }
            const liberi = lista.filter(c => !fermo(c.m, c.mod));
            if (!liberi.length) {
                // tutti a riposo: si aspetta il primo che si libera, se arriva in tempo
                const riapre = Math.min.apply(null, lista.map(c => fermo(c.m, c.mod).fino));
                if (riapre > scadenza) throw erroreFinale(m, lista, ultimo, riapre);
                stato(`${nomeMotore(m)} sovraccarico: riprovo fra ${Math.ceil((riapre - Date.now()) / 1000)} s`, 'ko');
                await sleep(Math.max(200, riapre - Date.now() + 100));
                continue;
            }
            // il primo in ordine che ha posto subito; se nessuno ce l'ha, quello che lo avra' prima
            let scelto = liberi.find(c => liberoFra(chiaveModello(c.m, c.mod)) <= 300);
            if (!scelto) scelto = liberi.slice().sort((x, y) => liberoFra(chiaveModello(x.m, x.mod)) - liberoFra(chiaveModello(y.m, y.mod)))[0];
            const ch = chiaveModello(scelto.m, scelto.mod);
            const attesa = liberoFra(ch);
            if (Date.now() + attesa > scadenza) {
                const e = new Error(`${nomeMotore(m)}: limite di richieste al minuto, riprovo fra ${Math.ceil(attesa / 1000)} s`);
                e.tipo = 'minuto'; e.transitorio = true; e.riprovaFra = attesa;
                throw e;
            }
            if (attesa > 2000) stato(`limite al minuto: tocca a me fra ${Math.ceil(attesa / 1000)} s`);
            await prenotaTurno(ch, o.prio);
            // la riserva per la corsa: il primo altro modello libero adesso
            let eco = null, dopo = 0;
            if (settings.corsa) {
                eco = liberi.find(c => c !== scelto && liberoFra(chiaveModello(c.m, c.mod)) <= 0) || null;
                const t = tempoDi(scelto.m, scelto.mod);
                dopo = Math.min(o.uscita ? 8000 : 6000, Math.max(2500, t * 2.5));
            }
            try {
                const r = eco ? await corsa(m, scelto, eco, sys, user, dopo, valida)
                    : { c: scelto, out: await chiama(scelto, sys, user) };
                const nome = etichetta(m, r.c);
                if (nome !== ultimoModello && r.c.mod !== modello(m) && r.c.mod !== modelloInvio(m)) log(`risponde ${nome}`);
                ultimoModello = nome;
                annota({ compito: o.uscita ? 'invio' : (o.rileva ? 'lingua' : 'lettura'), lingua: (o.uscita ? o.a : o.da) || '?',
                    scelta: `${r.c.mod}${tempoDi(r.c.m, r.c.mod) ? ' (~' + (tempoDi(r.c.m, r.c.mod) / 1000).toFixed(1) + ' s)' : ''}` });
                disegnaModelli();
                o.rispostoDa = { m: r.c.m, mod: r.c.mod };
                return r.out;
            } catch (e) {
                ultimo = e;
                if (gestisciErrore(m, scelto, e)) continue;
                throw e;
            }
        }
    }

    async function aiChiamata(m, mod, sys, user) {
        const key = chiave(m);
        if (!key) throw mancaChiave(m);
        if (m !== 'groq') throw new Error('Motore AI sconosciuto: ' + m);
        // Groq conta anche i token che potrebbe scrivere: il tetto resta vicino al necessario
        const corpo = {
            model: mod, temperature: 0.2,
            max_completion_tokens: maxRispostaGroq(user),
            messages: [{ role: 'system', content: sys }, { role: 'user', content: user }]
        };
        // modelli che ragionano: al minimo, e il ragionamento non torna nella risposta
        if (!senzaThinking.has(mod)) {
            if (/gpt-oss/.test(mod)) { corpo.reasoning_effort = 'low'; corpo.include_reasoning = false; }
            else if (/qwen/i.test(mod)) { corpo.reasoning_effort = 'none'; }
        }
        const r = await http({
            method: 'POST', url: 'https://api.groq.com/openai/v1/chat/completions',
            headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
            data: JSON.stringify(corpo),
            timeout: 30000, conHeader: true
        }).catch(e => { throw conPrefisso('Groq', e); });
        leggiLimiti(mod, r.header);
        const j = JSON.parse(r.testo);
        contaGroq((j && j.usage && j.usage.total_tokens) || stimaToken(sys, user), mod);
        const msg = j && j.choices && j.choices[0] && j.choices[0].message;
        const out = String((msg && msg.content) || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        if (!out) throw new Error('Groq: risposta vuota (' + ((j && j.choices && j.choices[0] && j.choices[0].finish_reason) || 'nessun testo') + ')');
        return out;
    }

    /* Una conversazione = una richiesta.
       Descrizione e messaggi (del segnalante, tuoi e degli altri editor) partono tutti insieme,
       ognuno dietro il suo marcatore, e la risposta si riprende pezzo per pezzo: dieci messaggi
       costano una richiesta invece di dieci. Nel marcatore il modello rimette la lingua di ogni
       blocco: cosi' si sa quali erano gia' in italiano (tornano identici e va bene) e quali
       invece sono tornati non tradotti e vanno richiesti. Se il modello salta un blocco non si
       ricomincia da capo: si richiedono solo quelli mancanti. */
    const MARC = n => `<<<${n}>>>`;
    const RX_MARC = /<<<\s*(\d+)\s*(?:\|\s*([^<>\s|]*)\s*)?>>>/g;

    function istruzioniBlocchi(da, a, o) {
        let s = istruzioniAI(da, a, o) + '\n'
            + 'Il testo arriva diviso in blocchi, ognuno introdotto da un marcatore come <<<1>>>.\n';
        if (o.uscita) {
            s += 'Il blocco 1 e\u0027 il messaggio; gli altri sono righe di servizio da tradurre con le stesse regole. '
                + 'Rispondi rimettendo GLI STESSI marcatori, ognuno seguito a capo dalla sola traduzione di quel blocco.';
        } else {
            s += 'Alcuni blocchi possono essere gi\u00e0 in ' + minuscola(nomeLingua(a)) + ' (per esempio i messaggi degli editor): '
                + 'quelli restituiscili identici. Rispondi rimettendo ogni marcatore con dentro, dopo una barra verticale, il '
                + 'codice BCP-47 della lingua in cui era scritto quel blocco (per esempio <<<1|pt-BR>>> oppure <<<2|' + base(a) + '>>>), '
                + 'seguito a capo dalla sola traduzione di quel blocco.';
        }
        return s + ' Stesso ordine, nessun commento, nessun blocco saltato o unito.';
    }

    function leggiBlocchi(risposta, gruppo, fuori, lingue) {
        const testo = String(risposta || '');
        const pezzi = testo.split(RX_MARC);
        let trovati = 0;
        for (let k = 1; k + 2 < pezzi.length; k += 3) {
            const n = parseInt(pezzi[k], 10) - 1;
            const t = String(pezzi[k + 2] || '').trim();
            if (n >= 0 && n < gruppo.length && t && fuori[gruppo[n]] == null) {
                fuori[gruppo[n]] = t;
                lingue[gruppo[n]] = normLang(pezzi[k + 1] || '');
                trovati++;
            }
        }
        // un blocco solo e una risposta senza marcatori: quella e' la traduzione
        if (!trovati && gruppo.length === 1 && pezzi.length === 1 && testo.trim()) fuori[gruppo[0]] = testo.trim();
    }

    async function traduciBlocchi(testi, da, a, opz) {
        const o = opz || {};
        const fuori = new Array(testi.length).fill(null);
        const lingue = new Array(testi.length).fill('');
        let errore = null;
        async function giro(indici, extra) {
            // lotti di 30 blocchi o 4.500 caratteri al massimo, per stare dentro i token al minuto
            // del piano gratuito di Groq: una UR normale sta tutta in uno
            const lotti = [];
            let lotto = [], car = 0;
            indici.forEach(i => {
                if (lotto.length && (lotto.length >= 30 || car + testi[i].length > 4500)) { lotti.push(lotto); lotto = []; car = 0; }
                lotto.push(i); car += testi[i].length;
            });
            if (lotto.length) lotti.push(lotto);
            const sys = istruzioniBlocchi(da, a, Object.assign({}, o, extra));
            for (const gruppo of lotti) {
                const corpo = gruppo.map((i, n) => MARC(n + 1) + '\n' + testi[i]).join('\n\n');
                const info = Object.assign({}, o, { da, a });
                // una risposta vale se i blocchi che contiene sono buoni: variabili e link intatti,
                // lunghezza sensata, e tradotti davvero quando erano in un'altra lingua
                const leggi = out => {
                    const f = new Array(testi.length).fill(null), l = new Array(testi.length).fill('');
                    leggiBlocchi(out, gruppo, f, l);
                    return { f, l, presenti: gruppo.filter(i => f[i] != null) };
                };
                info.valida = out => {
                    const { f, l, presenti } = leggi(out);
                    return presenti.length > 0 && presenti.every(i => intoccabiliSalvi(testi[i], f[i]) && lunghezzaSensata(testi[i], f[i])
                        && !(l[i] && base(l[i]) !== base(a) && nonTradotto(testi[i], f[i])));
                };
                try { leggiBlocchi(await aiChat(sys, corpo, info), gruppo, fuori, lingue); }
                catch (e) {
                    errore = e;
                    if (transitorio(e) || /^(chiave|credito|giorno|inesistente)$/.test(tipoErrore(e))) return;   // gli altri lotti farebbero la stessa fine
                }
            }
        }
        const tutti = testi.map((x, i) => i);
        await giro(tutti);
        if (errore && !fuori.some(x => x != null)) throw errore;
        // blocchi saltati: un secondo giro solo per quelli
        const mancano = tutti.filter(i => fuori[i] == null);
        if (mancano.length && !transitorio(errore)) await giro(mancano);
        if (!fuori.some(x => x != null)) throw errore || new Error(nomeMotore() + ': risposta senza traduzioni');
        // blocchi tornati non tradotti (e non perche' fossero gia' nella lingua giusta): si insiste
        if (!o.uscita && !transitorio(errore)) {
            const rifare = tutti.filter(i => fuori[i] != null && lingue[i] && base(lingue[i]) !== base(a) && nonTradotto(testi[i], fuori[i]));
            if (rifare.length) {
                const primi = rifare.map(i => fuori[i]);
                rifare.forEach(i => { fuori[i] = null; });
                await giro(rifare, { insistere: true });
                rifare.forEach((i, n) => { if (fuori[i] == null) fuori[i] = primi[n]; });
            }
        }
        return { testi: fuori, lingue, errore };
    }

    /* ------------------------------------------------------------------ */
    /* Stato                                                               */
    /* ------------------------------------------------------------------ */

    let sdk = null, me = '';
    let urId = null, urObj = null, dettagli = null;
    let linguaWme = '', linguaVista = '', linguaScelta = '';
    let testoTradotto = '';      // ultimo testo tradotto messo nella casella
    let testoItaliano = '';      // com'era prima della traduzione
    let ultimoItaPieno = '';     // l'italiano completo del messaggio tradotto (con la riga di servizio)
    let passaInvio = false;      // il prossimo clic su Invia e' nostro: lasciarlo passare
    let saltaUnaVolta = false;   // dopo un errore: al secondo clic si manda comunque
    let ultimoValore = '';       // per capire se il testo e' stato incollato tutto insieme
    let osservaCommenti = null, timerIn = null, timerBox = null;
    let statoMsg = new Map();     // chiave del testo -> { fatto, errori }: sopravvive ai ridisegni del pannello
    let ultimoConteggio = null;   // per la diagnosi: quanti messaggi, quanti tradotti, quanti saltati
    let barra = null, b = {};

    // Ordine di scelta: quella che hai messo tu, poi quella che arriva con la UR,
    // poi quella riconosciuta dal testo del segnalante. L'inglese non e' un ripiego:
    // si usa solo se lo imposti tu nella scheda.
    const linguaTarget = () => linguaScelta || linguaWme || linguaVista || settings.ripiego || '';
    const origineLingua = () => linguaScelta ? 'scelta da te'
        : (linguaWme ? 'arrivata con la UR' : (linguaVista ? 'riconosciuta dal testo' : (settings.ripiego ? 'ripiego impostato da te' : 'ancora da riconoscere')));

    // Se la UR e' in una lingua che leggi da solo lo script non serve: non compare
    // proprio, non traduce niente e non tocca l'invio.
    const nonServe = () => { const t = linguaTarget(); return !!t && loConosco(t); };

    // Se non sappiamo ancora in che lingua rispondere, la si riconosce dal testo
    // della segnalazione prima di tradurre. Nessun inglese a caso.
    async function assicuraLingua() {
        if (linguaTarget()) return linguaTarget();
        const testo = testoDelSegnalante();
        if (testo) { linguaVista = await rilevaLingua(testo); aggiornaBarra(); }
        if (linguaTarget()) return linguaTarget();
        const a = areaTesto();
        if (a && (a.value || '').trim().length > 8) {
            const d = await rilevaLingua(a.value);
            if (d && d !== settings.mia) { linguaVista = d; aggiornaBarra(); return d; }
        }
        return 'en';   // davvero non si e' capito niente: meglio qualcosa che niente
    }

    // Quello che ha scritto DAVVERO il segnalante: la descrizione della UR (c'e' anche
    // quando la discussione e' vuota, tipico delle segnalazioni vocali) piu' i suoi
    // messaggi. Niente testo preso a caso dal pannello: le scritte del WME sono in
    // italiano e facevano credere che la UR fosse italiana.
    function testoDescrizione(soloPannello) {
        if (!soloPannello && urObj && urObj.description) return String(urObj.description).trim();
        const el = descrizioneEl();
        return el ? normalizza(el.textContent || '') : '';
    }
    // Come si presenta il pannello adesso: se cambia sotto i piedi vuol dire che il WME
    // ci ha messo dentro un'altra UR senza dirlo.
    function firmaPannello() {
        const voci = vociCommento();
        return testoDescrizione(true).slice(0, 60) + '|' + voci.length
            + '|' + (voci[0] ? testoDiVoce(voci[0]).slice(0, 40) : '');
    }
    function testoDelSegnalante() {
        const parti = [testoDescrizione()];
        if (dettagli && dettagli.comments) {
            parti.push(dettagli.comments.filter(c => !c.userName).map(c => c.text || '').join('\n'));
        }
        return parti.map(x => (x || '').trim()).filter(Boolean).join('\n').trim();
    }

    /* Dove Waze tiene la lingua del segnalante:
       1) nei dati della UR (qualunque campo che parli di lingua, anche annidato);
       2) nel pannello, fra le "Impostazioni del conducente", dove il WME la scrive per esteso.
       Se il pannello e' piu' preciso dei dati (dice "A. Latina" dove i dati dicono solo
       "spagnolo") vince il pannello. Il riconoscimento dal testo resta l'ultima spiaggia. */
    function linguaDaOggetto(o, giro, visti) {
        if (!o || typeof o !== 'object') return '';
        const liv = giro || 0;
        if (liv > 3) return '';
        // 1) i posti dove l'SDK la tiene davvero
        if (!liv) {
            const dritti = [
                o.userPreferences && o.userPreferences.language,
                o.userPreferences && o.userPreferences.locale,
                o.language, o.locale, o.userLanguage,
                o.driverSettings && o.driverSettings.language,
                o.user && o.user.language
            ];
            for (const v of dritti) {
                if (typeof v === 'string') { const c = normLang(v); if (linguaValida(c)) return c; }
            }
        }
        // 2) poi si guarda dentro. Con "for...in" si vedono anche le proprieta' che l'SDK
        //    espone come getter sul prototipo: Object.keys quelle non le vede, ed e' un
        //    modo silenzioso di non trovare un dato che c'e'.
        const gia = visti || new Set();
        if (gia.has(o)) return '';
        gia.add(o);
        for (const k in o) {
            let v;
            try { v = o[k]; } catch { continue; }
            if (typeof v === 'string' && /lang|locale|idioma/i.test(k)) {
                const c = normLang(v);
                if (linguaValida(c)) return c;
            } else if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.nodeType !== 'number'
                && typeof v !== 'function') {
                const c = linguaDaOggetto(v, liv + 1, gia);
                if (c) return c;
            }
        }
        return '';
    }

    /* La lingua nel pannello sta in un "chip" delle Impostazioni del conducente: icona di
       traduzione e scritta "Espanol (A. Latina)" DENTRO LO STESSO elemento. Per ogni elemento
       si prova il testo suo (senza quello dei figli), il testo intero se e' corto e gli
       attributi dove i componenti del WME mettono la scritta; e si entra anche negli shadow
       DOM dei componenti wz-. */
    function testiDi(el) {
        const fuori = [];
        let proprio = '';
        el.childNodes.forEach(n => { if (n.nodeType === 3) proprio += ' ' + n.nodeValue; });
        proprio = normalizza(proprio);
        if (proprio) fuori.push(proprio);
        const tutto = normalizza(el.textContent || '');
        if (tutto && tutto !== proprio && tutto.length <= 48) fuori.push(tutto);
        if (el.getAttribute) ['label', 'title', 'aria-label', 'tooltip', 'text', 'value'].forEach(a => {
            const v = normalizza(el.getAttribute(a) || '');
            if (v) fuori.push(v);
        });
        return fuori;
    }
    function* elementiDi(radice) {
        const pila = [radice];
        while (pila.length) {
            const r = pila.pop();
            for (const el of r.querySelectorAll('*')) {
                yield el;
                if (el.shadowRoot) pila.push(el.shadowRoot);
            }
        }
    }
    const NON_ETICHETTE = /^(script|style|textarea|input|select|option|svg|path)$/i;
    function linguaDalPannello() {
        const form = formCommento();
        const zona = q(SEL.panel) || document.querySelector('.overlay-container wz-card[class^="panel"]')
            || (form && form.closest('wz-card')) || document.querySelector('.overlay-container');
        if (!zona) return '';
        for (const n of elementiDi(zona)) {
            if (NON_ETICHETTE.test(n.tagName || '')) continue;
            // la nostra barra, i messaggi e la descrizione non dicono la lingua del profilo
            if (n.closest && (n.closest('#wurt-bar') || n.closest('#wurt-conv') || n.closest('.comment-list')
                || n.closest('.new-comment-form') || n.closest('.description'))) continue;
            for (const t of testiDi(n)) {
                const c = linguaDaEtichetta(t);
                if (c) return c;
            }
        }
        return '';
    }

    // Quanto dice un codice: 2 = paese o alfabeto (es-PE, sr-Latn), 1 = area (es-419), 0 = solo lingua
    const precisione = c => { const p = partiCodice(c); return (p.script || /^[A-Z]{2}$/.test(p.regione)) ? 2 : (p.regione ? 1 : 0); };
    // Mette insieme le due fonti tenendo la piu' precisa: se i dati dicono es-PE e il pannello
    // solo "America Latina", resta il Peru'. A parita' vince il pannello.
    function linguaDiWaze() {
        const dati = linguaDaOggetto(urObj) || linguaDaOggetto(dettagli);
        const pannello = linguaDalPannello();
        if (dati && pannello && base(dati) === base(pannello)) {
            const pd = precisione(dati), pp = precisione(pannello);
            if (pd !== pp) return pd > pp ? dati : pannello;
            return pannello.indexOf('-') >= 0 ? pannello : dati;
        }
        return dati || pannello || '';
    }

    /* Le Impostazioni del conducente a volte si disegnano un attimo dopo l'apertura della UR,
       quando la lingua e' gia' stata indovinata dal testo. Appena la lingua dichiarata compare
       (o ne compare una piu' precisa: es-419 al posto di es), prende il posto dell'altra, e la
       risposta gia' tradotta nella casella viene rifatta nella lingua giusta. */
    function ricontrollaLingua() {
        if (urId == null || linguaScelta) return false;
        const ora = linguaDiWaze();
        if (!ora || ora === linguaWme) return false;
        if (linguaWme && (base(ora) !== base(linguaWme) || precisione(ora) <= precisione(linguaWme))) return false;
        const prima = linguaTarget();
        linguaWme = ora;
        if (linguaVista && base(linguaVista) === base(ora)) linguaVista = '';
        if (linguaTarget() === prima) return false;
        log(`lingua dichiarata trovata: ${ora} (prima ${prima || 'nessuna'})`);
        if (nonServe()) { smontaBarra(); return true; }
        const a = areaTesto();
        if (a && testoTradotto && testoItaliano && (a.value || '') === testoTradotto) {
            scriviArea(testoItaliano);
            ultimoValore = testoItaliano;
            testoTradotto = '';
            traduciCasella().catch(e => stato(e.message, 'ko'));
        }
        aggiornaBarra();
        return true;
    }

    function ricorda(c) {
        if (!c) return;
        settings.recenti = [c].concat((settings.recenti || []).filter(x => x !== c)).slice(0, 8);
        saveSettings();
    }

    /* ------------------------------------------------------------------ */
    /* Logo e stile                                                        */
    /* ------------------------------------------------------------------ */

    const LOGO_RAW = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="__W__" height="__W__" style="vertical-align:-__V__px">
  <defs><linearGradient id="wurtG" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#4f46e5"/><stop offset="1" stop-color="#0d9488"/></linearGradient></defs>
  <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#wurtG)"/>
  <circle cx="21" cy="20" r="10" fill="none" stroke="#ffffff" stroke-width="2.6"/>
  <path d="M11 20 H31" stroke="#ffffff" stroke-width="2.2"/>
  <ellipse cx="21" cy="20" rx="4.8" ry="10" fill="none" stroke="#ffffff" stroke-width="2.2"/>
  <path d="M26 28 H40 a3 3 0 0 1 3 3 v7 a3 3 0 0 1 -3 3 h-6 l-5 4 v-4 h-3 a3 3 0 0 1 -3 -3 v-7 a3 3 0 0 1 3 -3 z"
        fill="#ffffff" stroke="#1f2937" stroke-width="1.2"/>
  <path d="M28.5 34.5 h9" stroke="#4f46e5" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M28.5 38 h5.5" stroke="#0d9488" stroke-width="2.2" stroke-linecap="round"/>
</svg>`;
    const logo = (w, v) => LOGO_RAW.replace(/__W__/g, w).replace(/__V__/g, v);

    const CSS = `
#wurt-bar { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:10px 0 8px; padding:7px 9px;
  border:1px solid #e2e5ec; border-left:3px solid #4f46e5; border-radius:7px; background:#fbfbff;
  box-shadow:0 1px 3px rgba(17,24,39,.05); font-size:11px; line-height:1.3; color:#2b3138; font-family:inherit; }
#wurt-bar .wurt-name { font-weight:700; letter-spacing:.5px; color:#4f46e5; text-transform:uppercase; font-size:9.5px;
  margin-right:2px; }
#wurt-bar select.wurt-sel { font-size:11px; padding:2px 5px; border:1px solid #d3d7e0; border-radius:5px;
  background:#fff; max-width:140px; height:24px; color:#2b3138; }
.wurt-chip { border:1px solid #d3d7e0; background:#fff; color:#374151; border-radius:5px; padding:2px 9px;
  font-size:10.5px; cursor:pointer; height:24px; line-height:18px; transition:background .15s; }
.wurt-chip:hover { background:#f1f2f7; }
.wurt-chip.wurt-on { background:#4f46e5; border-color:#4f46e5; color:#fff; }
.wurt-chip.wurt-teal.wurt-on { background:#0d9488; border-color:#0d9488; }
.wurt-chip:disabled { opacity:.5; cursor:default; }
#wurt-bar .wurt-st { width:100%; margin:2px 0 0; font-size:10px; color:#6b7280; }
#wurt-bar.wurt-ridotta [data-b="lingua"], #wurt-bar.wurt-ridotta [data-b="auto"],
#wurt-bar.wurt-ridotta [data-b="traduci"], #wurt-bar.wurt-ridotta [data-b="it"] { display:none; }
#wurt-bar .wurt-st.wurt-ko { color:#b91c1c; font-weight:600; }
#wurt-bar .wurt-st.wurt-ok { color:#0d9488; }
#wurt-conv { display:none; margin:8px 0 0; padding:8px 10px; border:1px solid #e2e5ec; border-left:3px solid #0d9488;
  border-radius:7px; background:#f7fdfc; }
#wurt-conv.wurt-vis { display:block; }
#wurt-conv > .wurt-tag { display:block; font-size:9px; font-weight:700; letter-spacing:.6px; text-transform:uppercase;
  color:#0d9488; margin-bottom:4px; }
#wurt-conv .wurt-tr { border-left:0; background:transparent; padding:3px 0; margin:0; border-top:1px dashed #dbeeeb; }
#wurt-conv .wurt-tr:first-of-type { border-top:0; }
.wurt-tr { margin:2px 0 8px 10px; padding:5px 8px; border-left:2px solid #0d9488; background:#f3fbfa; border-radius:5px;
  font-size:11.5px; line-height:1.4; color:#1f2d33; white-space:pre-wrap; }
.wurt-tr .wurt-tag { display:inline-block; min-width:18px; font-size:11px; font-weight:700; letter-spacing:.4px;
  text-transform:uppercase; color:#0d9488; margin-right:6px; font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",inherit; }
#wurt-conv .wurt-chi { font-weight:700; color:#0f766e; margin-right:5px; }
.wurt-tr.wurt-attesa { color:#8a919a; font-style:italic; }
`;

    function mettiStile() {
        if (document.getElementById('wurt-css')) return;
        const s = document.createElement('style');
        s.id = 'wurt-css';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    /* ------------------------------------------------------------------ */
    /* Barra dentro il pannello UR                                         */
    /* ------------------------------------------------------------------ */

    async function montaBarra() {
        if (nonServe()) { smontaBarra(); return; }     // lingua che conosci: niente barra
        let form = null;
        for (let i = 0; i < 25 && !form; i++) { form = formCommento(); if (!form) await sleep(120); }
        // Senza casella (UR chiusa, fuori dalla tua area): barra ridotta sopra i messaggi, con
        // lo stato e il pulsante per ritradurre. Prima non compariva niente.
        let dove = form, ridotta = false;
        if (!form) {
            const lista = listaCommenti();
            dove = lista || descrizioneEl();
            ridotta = true;
            if (!dove || !dove.parentElement) { log('pannello UR diverso dal previsto: niente barra'); return; }
        }
        mettiStile();
        if (document.getElementById('wurt-bar')) { aggiornaBarra(); return; }

        const box = document.createElement('div');
        box.id = 'wurt-bar';
        box.innerHTML = `${logo(14, 3)}<span class="wurt-name">${SIGLA}</span>
<select class="wurt-sel" data-b="lingua" title="Lingua in cui parte la risposta"></select>
<button class="wurt-chip" data-b="auto" title="Traduci da solo prima di inviare (vale anche per le risposte pronte di URC-E)">auto</button>
<button class="wurt-chip wurt-teal" data-b="traduci" title="Traduci adesso quello che c'e' nella casella">traduci</button>
<button class="wurt-chip" data-b="it" title="Rimetti il testo italiano nella casella">IT</button>
<button class="wurt-chip" data-b="riconv" title="Ritraduci tutta la discussione">\u21bb</button>
<span class="wurt-st" data-b="st"></span>`;
        const convBox = document.createElement('div');
        convBox.id = 'wurt-conv';

        if (ridotta && !listaCommenti()) {
            dove.parentElement.insertBefore(box, dove.nextSibling);
            box.parentElement.insertBefore(convBox, box.nextSibling);
        } else {
            dove.parentElement.insertBefore(convBox, dove);
            dove.parentElement.insertBefore(box, dove);
        }
        if (ridotta) box.classList.add('wurt-ridotta');
        barra = box; b = {};
        box.querySelectorAll('[data-b]').forEach(el => { b[el.getAttribute('data-b')] = el; });
        b.conv = convBox;

        riempiLingue();
        b.lingua.addEventListener('change', () => {
            linguaScelta = b.lingua.value;   // vuoto = torna al riconoscimento automatico
            if (linguaScelta) ricorda(linguaScelta);
            testoTradotto = '';
            aggiornaBarra();
        });
        b.auto.addEventListener('click', () => { settings.autoOut = !settings.autoOut; saveSettings(); aggiornaBarra(); });
        b.traduci.addEventListener('click', () => traduciCasella().catch(e => stato(e.message, 'ko')));
        b.it.addEventListener('click', ripristinaItaliano);
        b.riconv.addEventListener('click', ritraduciTutto);
        aggiornaBarra();
        agganciaCasella();
    }

    // Il menu' segue l'ordine di scelta: prima quella in uso su questa UR, poi quelle
    // che usi di piu', poi tutte le altre in ordine alfabetico.
    const opz = (c, marca) => `<option value="${esc(c)}">${esc(etichettaLingua(c) + (marca ? ' \u2014 ' + marca : ''))}</option>`;
    function riempiLingue() {
        if (!b.lingua) return;
        const t = linguaTarget();
        const recenti = (settings.recenti || []).filter(c => c && c !== t).slice(0, 6);
        const firma = t + '|' + recenti.join(',');
        if (b.lingua.dataset.firma === firma) { b.lingua.value = linguaScelta || t || ''; return; }
        const usate = new Set([t].concat(recenti).filter(Boolean));
        const altre = LINGUE.map(l => l[0]).filter(c => !usate.has(c))
            .sort((a, c) => nomeLingua(a).localeCompare(nomeLingua(c), 'it'));
        let html = '<option value="">riconoscila da sola</option>';
        if (t) html += `<optgroup label="su questa UR">${opz(t, origineLingua())}</optgroup>`;
        if (recenti.length) html += `<optgroup label="usate di recente">${recenti.map(c => opz(c)).join('')}</optgroup>`;
        html += `<optgroup label="tutte le lingue">${altre.map(c => opz(c)).join('')}</optgroup>`;
        b.lingua.innerHTML = html;
        b.lingua.dataset.firma = firma;
        b.lingua.value = linguaScelta || t || '';
    }

    function aggiornaBarra() {
        if (!barra || !document.body.contains(barra)) return;
        const t = linguaTarget();
        riempiLingue();
        b.auto.classList.toggle('wurt-on', !!settings.autoOut);
        b.riconv.style.display = settings.autoIn ? '' : 'none';
        b.it.disabled = !testoItaliano;
        const ridotta = barra.classList.contains('wurt-ridotta');
        stato(t ? `${bandiera(t)} ${ridotta ? 'conversazione in' : 'verso'} ${nomeLingua(t)} \u00b7 ${origineLingua()} \u00b7 ${nomeMotore()}${viaRiserva()}${ridotta ? ' \u00b7 qui non puoi scrivere' : ''}`.trim()
            : 'lingua da riconoscere: la trovo io al primo messaggio');
    }

    function stato(msg, tipo) {
        if (!b.st) return;
        b.st.className = 'wurt-st' + (tipo ? ' wurt-' + tipo : '');
        b.st.textContent = msg;
        b.st.title = msg;
    }

    function smontaBarra() {
        // il pannello viene riusato per la UR successiva: le traduzioni vecchie se ne vanno
        // con la barra, altrimenti resterebbero appiccicate sotto i testi nuovi
        document.querySelectorAll('.wurt-tr').forEach(r => r.remove());
        document.getElementById('wurt-bar')?.remove();
        document.getElementById('wurt-conv')?.remove();
        barra = null; b = {};
    }

    /* ------------------------------------------------------------------ */
    /* Casella di scrittura: traduzione e invio                            */
    /* ------------------------------------------------------------------ */

    function agganciaCasella() {
        const a = areaTesto();
        if (!a || a.dataset.wurt === '1') return;
        a.dataset.wurt = '1';
        a.setAttribute('dir', 'auto');   // arabo, ebraico e persiano vanno letti da destra
        ultimoValore = a.value || '';
        a.addEventListener('input', () => {
            const v = a.value || '';
            const salto = v.length - ultimoValore.length;
            ultimoValore = v;
            if (!v.trim()) { testoTradotto = ''; testoItaliano = ''; aggiornaBarra(); return; }
            // salto grosso = risposta pronta appena inserita (URC-E, incolla): la traduco subito
            if (settings.autoOut && settings.anteprimaSubito && !nonServe() && salto > 20 && v !== testoTradotto) {
                clearTimeout(timerBox);
                timerBox = setTimeout(() => traduciCasella().catch(e => stato(e.message, 'ko')), 350);
            }
        });
    }

    // Traduce quello che c'e' nella casella e lo rimette al posto suo.
    // Se la casella contiene gia' una traduzione con del testo nuovo in coda (modalita'
    // "append" di URC-E) traduce solo la coda, per non ripassare due volte sulla stessa frase.
    // Una traduzione della casella per volta: se premi Invia mentre quella automatica e'
    // ancora in corso, il secondo giro non ne apre un altro ma aspetta il primo.
    let lavoroCasella = null;
    function traduciCasella() {
        if (lavoroCasella) return lavoroCasella;
        lavoroCasella = giroCasella().finally(() => { lavoroCasella = null; });
        return lavoroCasella;
    }

    async function giroCasella() {
        const a = areaTesto();
        if (!a) throw new Error('casella non trovata');
        const valore = a.value || '';
        if (!valore.trim()) throw new Error('niente da tradurre');
        const tgt = await assicuraLingua();
        if (loConosco(tgt)) { stato(`UR in ${nomeLingua(tgt).toLowerCase()}, una lingua che conosci: scrivi e invia come sempre`); return valore; }
        if (valore === testoTradotto) return valore;

        let testa = '', daTradurre = valore;
        if (testoTradotto && valore.startsWith(testoTradotto)) {
            testa = testoTradotto;
            daTradurre = valore.slice(testoTradotto.length);
            if (!daTradurre.trim()) { return valore; }
        }
        testoItaliano = testa ? (testoItaliano + daTradurre) : valore;

        stato('traduco\u2026');
        b.traduci.disabled = true;
        try {
            // quello che stai per inviare passa davanti alla conversazione e aspetta al massimo 45 s
            const opzU = { uscita: true, prio: PRIO_INVIO, pazienza: 45000 };
            const serveNota = !testa && settings.notaTrad;
            let r = null, nota = null;
            // Prima volta in questa lingua con un motore AI: messaggio e riga "tradotto
            // automaticamente" partono insieme, una richiesta invece di due.
            const kNota = chiaveTr(motore(), 'it', tgt, NOTA_TRAD, true);
            const kTesto = chiaveTr(motore(), settings.mia, tgt, daTradurre.trim(), true);
            if (motoreAI() && serveNota && !cacheGet(kNota) && !cacheGet(kTesto)) {
                try {
                    const x = await traduciBlocchi([daTradurre.trim(), NOTA_TRAD], settings.mia, tgt, opzU);
                    if (x.testi[1]) { cacheSet(kNota, x.testi[1], 'it'); nota = { t: x.testi[1] }; }
                    if (x.testi[0] && intoccabiliSalvi(daTradurre, x.testi[0])) { cacheSet(kTesto, x.testi[0], settings.mia); r = { t: x.testi[0] }; }
                } catch (e) {
                    if (!settings.ripiegoGoogle || tipoErrore(e) === 'chiave') throw e;
                    avvisoMotore = nomeMotore() + ' non ha risposto (' + String(e.message || e).slice(0, 70) + '): uso Google';
                    log(avvisoMotore);
                    r = { t: await googleAPezzi(daTradurre, settings.mia, tgt) };
                    nota = { t: (await trGoogle(NOTA_TRAD, 'it', tgt)).t };
                }
            }
            if (!r) r = await traduciTesto(daTradurre, settings.mia, tgt, opzU);
            if (serveNota && !nota) nota = await traduciPezzo(NOTA_TRAD, 'it', tgt, opzU);
            let fuori = (testa ? testa + r.t : r.t).trim();
            if (!testa) {
                const coda = [];
                if (nota) coda.push(nota.t.trim());
                if (settings.allegaIt) coda.push('\u2014\u2014\u2014\n' + valore.trim());
                if (coda.length) fuori += '\n\n' + coda.join('\n\n');
            }
            if (fuori.length > 2000) throw new Error('testo troppo lungo per il WME (oltre 2000 caratteri)');
            // Se intanto la casella e' cambiata (commento partito, testo sostituito) non si
            // scrive piu' niente: e' cosi' che nascevano i messaggi doppi.
            const ora = areaTesto();
            if (!ora || (ora.value || '') !== valore) { stato('casella cambiata: traduzione annullata'); return valore; }
            scriviArea(fuori);
            ultimoValore = fuori;
            testoTradotto = fuori;
            ricorda(tgt);
            // Quando il messaggio comparira' nella conversazione, la sua riga in italiano c'e'
            // gia': e' quello che hai scritto tu. Nessuna richiesta per ritradurlo.
            const itaPieno = testa ? (ultimoItaPieno || testoItaliano) + daTradurre
                : valore.trim() + (nota ? '\n\n' + NOTA_TRAD : '');
            ultimoItaPieno = itaPieno;
            cacheSet(chiaveInviato(fuori), itaPieno.trim(), settings.mia);
            if (avvisoMotore) { stato(avvisoMotore, 'ko'); avvisoMotore = ''; }
            else stato(`tradotto in ${nomeLingua(tgt)} \u00b7 ${nomeMotore()}${viaRiserva()}`, 'ok');
            aggiornaBarra();
            return fuori;
        } catch (e) {
            stato('traduzione fallita: ' + (e.message || e), 'ko');
            throw e;
        } finally { b.traduci.disabled = false; }
    }

    function ripristinaItaliano() {
        if (!testoItaliano) return;
        scriviArea(testoItaliano);
        ultimoValore = testoItaliano;
        testoTradotto = '';
        stato('rimesso il testo italiano: correggilo e premi traduci');
        aggiornaBarra();
    }

    // Nessun commento esce senza passare di qui: vale per il pulsante Invia del WME e
    // per il doppio clic di URC-E, che quel pulsante lo clicca da solo.
    let invioInCorso = false;
    async function gestisciInvio(e) {
        const t = e.target;
        if (!t || typeof t.closest !== 'function') return;
        const bottone = t.closest('.send-button');
        if (!bottone || !bottone.closest('.new-comment-form')) return;
        if (passaInvio) { passaInvio = false; return; }
        // niente barra = lo script non sta lavorando su questa UR (lingua che conosci,
        // pannello non riconosciuto, evento di apertura mai arrivato): giu' le mani dall'invio
        if (!document.getElementById('wurt-bar') || urId == null) return;
        const a = areaTesto();
        if (!a) return;
        const valore = (a.value || '').trim();
        if (!valore) return;
        // clic ripetuti mentre sta ancora traducendo: se ne prende uno solo, niente raffiche
        if (invioInCorso) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); return; }
        if (!settings.autoOut) { dopoInvio(); return; }
        if (nonServe()) { dopoInvio(); return; }                        // lingua che conosci: non mi intrometto
        if (valore === (testoTradotto || '').trim()) { dopoInvio(); return; }   // gia' tradotto: passa
        if (saltaUnaVolta) { saltaUnaVolta = false; dopoInvio(); stato('inviato senza traduzione', 'ko'); return; }

        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        invioInCorso = true;
        try {
            await traduciCasella();
            await sleep(150);
            passaInvio = true;
            const inv = q(SEL.invia);
            if (inv) inv.click(); else passaInvio = false;
            dopoInvio();
        } catch (err) {
            saltaUnaVolta = true;
            const perche = String((err && err.message) || err || '').slice(0, 110);
            stato(`traduzione fallita${perche ? ' (' + perche + ')' : ''}: premi di nuovo Invia per mandare il testo italiano`, 'ko');
        } finally { invioInCorso = false; }
    }

    // Dopo un invio si azzera tutto e si spegne qualsiasi traduzione in attesa, altrimenti
    // quella che era gia' partita tornerebbe a scrivere nella casella appena svuotata.
    function dopoInvio() {
        clearTimeout(timerBox);
        testoTradotto = ''; testoItaliano = ''; ultimoValore = ''; ultimoItaPieno = '';
        setTimeout(() => { const a = areaTesto(); if (a) ultimoValore = a.value || ''; }, 300);
    }

    /* ------------------------------------------------------------------ */
    /* Conversazione: si traduce TUTTO                                     */
    /* ------------------------------------------------------------------ */

    /* Regola unica, niente eccezioni:
       - se la UR e' in una lingua che leggi da solo, lo script non compare proprio;
       - altrimenti compare e traduce ogni messaggio della discussione, dal primo
         all'ultimo, senza guardare chi l'ha scritto o cosa c'e' scritto dentro.
       La lingua di partenza e' sempre quella della UR: niente riconoscimento
       automatico che scambia per italiano le frasi piene di nomi di strade. */

    let giroGen = -1, giroDaRifare = false, timerRiprova = null, tentativiConv = 0;
    let generazione = 0;      // cambia a ogni UR: il lavoro rimasto a meta' sulla UR di prima non scrive piu' niente
    let prontaConv = true;    // appena aperta la UR si aspetta che il pannello sia completo
    let rifaiDaCapo = false;  // pulsante di ritraduzione: niente memoria, traduzione nuova

    // La memoria di quello che si legge non dipende dalla lingua dichiarata: quando la lingua
    // si precisa (es -> es-419) i messaggi gia' tradotti non si richiedono.
    const chiaveIn = testo => chiaveTr(motore(), '*', settings.mia, testo, false);
    // I messaggi mandati da te: testo tradotto -> l'italiano che avevi scritto
    const chiaveInviato = testo => hash('inviato|' + settings.mia + '|' + normalizza(testo));
    function giaTradotto(testo, da, soloTuoi) {
        const tuo = cacheGet(chiaveInviato(testo));
        if (tuo && tuo.t) return tuo.t;
        if (soloTuoi) return '';
        const c = cacheGet(chiaveIn(testo)) || cacheGet(chiaveTr(motore(), da, settings.mia, testo, false));
        return (c && c.t) ? c.t : '';
    }

    /* Le modifiche fatte dallo script (righe tradotte, il loro testo, la barra) non devono far
       ripartire la traduzione. Prima si guardava solo l'elemento aggiunto: scrivere dentro una
       riga ("traduco...", il testo tradotto, l'errore) aggiunge un nodo di testo, che non veniva
       riconosciuto come nostro, e ogni scrittura faceva partire un giro nuovo. Con un errore
       503 i tre tentativi per messaggio si bruciavano in pochi secondi, insieme alla quota. */
    const NOSTRI = '.wurt-tr, #wurt-bar, #wurt-conv';
    const nostro = n => {
        if (!n) return false;
        const el = n.nodeType === 1 ? n : n.parentElement;
        return !!(el && el.closest && el.closest(NOSTRI));
    };
    const soloNostri = mutazioni => mutazioni.every(m => nostro(m.target)
        || (Array.prototype.every.call(m.addedNodes, nostro)
            && Array.prototype.every.call(m.removedNodes, n => n.nodeType === 1 && n.matches && n.matches(NOSTRI))));

    // Il testo di un messaggio: si clona la voce, si buttano via titolo, data e le
    // nostre righe, e si prende quel che resta. Ogni blocco interno diventa una riga,
    // cosi' due messaggi appiccicati non si fondono in una frase sola.
    function testoDiVoce(voce) {
        if (!voce || !voce.cloneNode) return '';
        // la descrizione della UR: il testo vero lo da' l'SDK, il pannello solo come ripiego
        if (voce.closest && voce.closest('.description')) {
            const d = testoDescrizione();
            const pannello = testoDescrizione(true);
            // ci si fida del modello solo se combacia con quello che il pannello mostra
            if (d && (!pannello || d.slice(0, 25) === pannello.slice(0, 25))) return d;
            if (pannello) return pannello;
        }
        const copia = voce.cloneNode(true);
        copia.querySelectorAll('.wurt-tr, .comment-title, .date, time, .wurt-riga').forEach(el => el.remove());
        const figli = Array.prototype.slice.call(copia.children);
        const pezzi = figli.length
            ? figli.map(el => normalizza(el.textContent || '')).filter(Boolean)
            : [normalizza(copia.textContent || '')];
        let t = pezzi.join('\n').trim();
        if (!t) {   // tutto dentro al titolo: si prende la voce intera meno il titolo
            const titolo = voce.querySelector ? voce.querySelector('.comment-title') : null;
            t = normalizza(voce.textContent || '');
            if (titolo) t = normalizza(t.replace(normalizza(titolo.textContent || ''), ''));
        }
        return t;
    }

    const rigaDi = voce => {
        const dopo = voce.nextElementSibling;
        return (dopo && dopo.classList && dopo.classList.contains('wurt-tr')) ? dopo : null;
    };

    function nuovaRiga(voce) {
        const riga = document.createElement('div');
        riga.className = 'wurt-tr';
        riga.setAttribute('dir', 'auto');
        if (voce.parentElement) voce.parentElement.insertBefore(riga, voce.nextSibling);
        else voce.appendChild(riga);
        return riga;
    }

    function scriviRiga(riga, testo) {
        riga.className = 'wurt-tr';
        riga.innerHTML = `<span class="wurt-tag" title="${esc('in ' + nomeLingua(settings.mia))}">${esc(segnoLingua(settings.mia))}</span>${esc(testo)}`;
    }

    async function traduciConversazione() {
        if (!settings.autoIn || nonServe() || !prontaConv) return;
        if (giroGen === generazione) { giroDaRifare = true; return; }
        const mio = generazione;
        giroGen = mio;
        try { await giroConversazione(mio); }
        finally {
            if (giroGen === mio) {
                giroGen = -1;
                if (giroDaRifare) { giroDaRifare = false; setTimeout(() => traduciConversazione().catch(() => { }), 300); }
            }
        }
    }

    // Da tradurre: prima la descrizione della UR (se c'e'), poi i messaggi.
    function elementiDaTradurre() {
        const fuori = [];
        const desc = descrizioneEl();
        if (desc && normalizza(desc.textContent || '').length > 2) fuori.push(desc);
        return fuori.concat(vociCommento());
    }

    /* Un giro sulla discussione: descrizione e TUTTI i messaggi, di chiunque siano.
       1) quello che si sa gia' non costa niente: righe gia' fatte, memoria, messaggi mandati
          da te (la loro riga e' l'italiano che hai scritto);
       2) il resto, con un motore AI, parte in UNA richiesta;
       3) se il servizio e' sovraccarico o al limite si aspetta e si riprova da soli, con
          attese crescenti, senza contarlo come errore: prima dopo tre tentativi (bruciati in
          pochi secondi) il messaggio restava non tradotto per sempre. */
    async function giroConversazione(mio) {
        const vivo = () => mio === generazione;
        const voci = elementiDaTradurre();
        if (!voci.length) { await conversazioneDiScorta(mio); return; }
        const da = linguaTarget() || 'auto';
        const mia = settings.mia;
        const nuova = rifaiDaCapo; rifaiDaCapo = false;
        let tradotti = 0, mancanti = 0, attesa = 0, motivo = '';

        const fatta = (x, t) => {
            if (!vivo()) return;
            x.riga.dataset.k = x.k;
            scriviRiga(x.riga, t);
            x.st.errori = 0; statoMsg.set(x.k, x.st);
            tradotti++;
        };
        const fallita = (x, err) => {
            if (!vivo()) return;
            const msg = (err && err.message) || String(err);
            x.riga.className = 'wurt-tr wurt-attesa';
            if (tipoErrore(err) === 'chiave') {              // niente ritentativi: serve la chiave
                x.st.errori = 3;
                x.riga.textContent = msg;
                stato(msg, 'ko');
            } else if (transitorio(err)) {                     // si aspetta, non e' un errore vero
                mancanti++; motivo = msg;
                attesa = Math.max(attesa, err.riprovaFra || attesaSuggerita(err) || 0);
                x.riga.textContent = 'in attesa \u2014 ' + msg;
            } else {
                x.st.errori++; mancanti++;
                x.riga.textContent = x.st.errori >= 3
                    ? 'traduzione non riuscita: ' + msg + ' (premi \u21bb per riprovare)'
                    : 'traduzione non riuscita, riprovo\u2026';
            }
            statoMsg.set(x.k, x.st);
        };

        // 1) quello che si sa gia'
        const daFare = [];
        for (const voce of voci) {
            const testo = testoDiVoce(voce);
            if (!testo || testo.length < 2) continue;
            const k = hash(testo);
            let riga = rigaDi(voce);
            if (riga && riga.dataset.k === k) { tradotti++; continue; }     // gia' fatta, testo invariato
            const st = statoMsg.get(k) || { errori: 0 };
            if (st.errori >= 3 && riga) continue;                            // ci ha gia' provato tre volte
            if (!riga) riga = nuovaRiga(voce);
            const x = { testo, k, riga, st };
            const noto = giaTradotto(testo, da, nuova);
            if (noto) { fatta(x, noto); continue; }
            riga.className = 'wurt-tr wurt-attesa';
            if (!/^in attesa/.test(riga.textContent || '')) riga.textContent = 'traduco\u2026';
            daFare.push(x);
        }

        // 2) il resto
        if (daFare.length && vivo()) {
            if (motoreAI()) {
                stato(daFare.length > 1 ? `traduco ${daFare.length} testi in una richiesta sola\u2026` : 'traduco\u2026');
                try {
                    const r = await traduciBlocchi(daFare.map(x => x.testo), da, mia, { prio: PRIO_CONVERSAZIONE, pazienza: 90000 });
                    const resto = [];
                    daFare.forEach((x, i) => {
                        const t = r.testi[i];
                        if (!t) { resto.push(x); return; }
                        cacheSet(chiaveIn(x.testo), t, r.lingue[i] || (da === 'auto' ? '' : da));
                        fatta(x, t);
                    });
                    // lingua non dichiarata da Waze: la dice il modello, senza una richiesta a parte
                    if (vivo() && !linguaTarget()) {
                        const conta = {};
                        r.lingue.forEach(l => { if (l && linguaValida(l) && base(l) !== base(mia)) conta[l] = (conta[l] || 0) + 1; });
                        const top = Object.keys(conta).sort((p, s) => conta[s] - conta[p])[0];
                        if (top) { linguaVista = top; aggiornaBarra(); }
                    }
                    // blocchi saltati anche al secondo giro (succede di rado): con l'errore del
                    // giro se c'era, altrimenti uno per uno
                    if (resto.length && r.errore) resto.forEach(x => fallita(x, r.errore));
                    else {
                        for (let i = 0; i < resto.length && vivo(); i++) {
                            const x = resto[i];
                            try {
                                const t = (await traduciPezzo(x.testo, da, mia, { prio: PRIO_CONVERSAZIONE, senzaMemoria: nuova })).t.trim();
                                cacheSet(chiaveIn(x.testo), t, da);
                                fatta(x, t);
                            } catch (e) {
                                resto.slice(i).forEach(y => fallita(y, e));
                                break;
                            }
                        }
                    }
                } catch (e) {
                    if (settings.ripiegoGoogle && tipoErrore(e) !== 'chiave') {
                        avvisoMotore = nomeMotore() + ' non ha risposto (' + String(e.message || e).slice(0, 70) + '): uso Google';
                        log(avvisoMotore);
                        for (const x of daFare) {
                            if (!vivo()) break;
                            try { fatta(x, await googleAPezzi(x.testo, da, mia)); } catch (e2) { fallita(x, e2); }
                        }
                    } else daFare.forEach(x => fallita(x, e));
                }
            } else {
                // Google, DeepL, MyMemory: quattro alla volta
                const coda = daFare.slice();
                const operaio = async () => {
                    for (let x = coda.shift(); x; x = coda.shift()) {
                        if (!vivo()) return;
                        try {
                            const r = await traduciTesto(x.testo, da, mia, { senzaMemoria: nuova });
                            const t = r.t || x.testo;
                            cacheSet(chiaveIn(x.testo), t, r.d || da);
                            fatta(x, t);
                        } catch (e) { fallita(x, e); }
                    }
                };
                await Promise.all(Array.from({ length: Math.min(4, daFare.length) }, operaio));
            }
        }

        // 3) com'e' andata
        if (!vivo()) return;
        ultimoConteggio = { voci: voci.length, tradotti, mancanti, da, modello: motoreAI() ? (ultimoModello || modello()) : motore() };
        clearTimeout(timerRiprova);
        if (mancanti) {
            tentativiConv++;
            const fra = Math.max(attesa, Math.min(60000, 5000 * Math.pow(2, tentativiConv - 1)));
            stato(`${tradotti} testi su ${tradotti + mancanti}${motivo ? ' \u00b7 ' + motivo : ''} \u00b7 riprovo fra ${Math.ceil(fra / 1000)} s`, 'ko');
            timerRiprova = setTimeout(() => { if (vivo()) traduciConversazione().catch(() => { }); }, fra);
        } else {
            tentativiConv = 0;
            const senzaChiave = MOTORI[motore()].chiave && !chiave();
            if (!senzaChiave) aggiornaBarra();
            if (avvisoMotore) { stato(avvisoMotore, 'ko'); avvisoMotore = ''; }
        }
    }

    // Se nel pannello non si trova proprio niente, la discussione tradotta finisce nel
    // riquadro sopra la casella, presa dai dati della UR: cosi' non si perde comunque nulla.
    async function conversazioneDiScorta(mio) {
        if (!b.conv || !dettagli || !Array.isArray(dettagli.comments) || !dettagli.comments.length) return;
        const da = linguaTarget() || 'auto';
        const testi = dettagli.comments.map(c => String(c.text || '').trim()).filter(Boolean);
        if (!testi.length) return;
        const firma = String(urId) + '|' + hash(testi.join('|'));
        if (b.conv.dataset.firma === firma) return;
        b.conv.dataset.firma = firma;
        b.conv.classList.add('wurt-vis');
        b.conv.innerHTML = '<div class="wurt-tag">conversazione in italiano</div>';
        const scrivi = (riga, t) => { riga.innerHTML = `<span class="wurt-tag">${esc(segnoLingua(settings.mia))}</span>${esc(t)}`; };
        const righe = testi.map(() => {
            const riga = document.createElement('div');
            riga.className = 'wurt-tr';
            riga.setAttribute('dir', 'auto');
            riga.textContent = 'traduco\u2026';
            b.conv.appendChild(riga);
            return riga;
        });
        const note = testi.map(t => giaTradotto(t, da, false));
        note.forEach((t, i) => { if (t) scrivi(righe[i], t); });
        const daFare = testi.map((t, i) => i).filter(i => !note[i]);
        if (!daFare.length) return;
        try {
            if (motoreAI()) {
                const r = await traduciBlocchi(daFare.map(i => testi[i]), da, settings.mia, { prio: PRIO_CONVERSAZIONE });
                if (mio !== generazione) return;
                daFare.forEach((i, n) => {
                    const t = r.testi[n];
                    if (t) { cacheSet(chiaveIn(testi[i]), t, da); scrivi(righe[i], t); }
                    else righe[i].textContent = 'traduzione non riuscita: premi \u21bb';
                });
            } else {
                for (const i of daFare) {
                    if (mio !== generazione) return;
                    try { const r = await traduciTesto(testi[i], da, settings.mia); scrivi(righe[i], r.t || testi[i]); }
                    catch (err) { righe[i].textContent = 'traduzione non riuscita: ' + (err.message || err); }
                    await sleep(120);
                }
            }
        } catch (err) {
            if (mio !== generazione || !b.conv) return;
            b.conv.dataset.firma = '';      // al prossimo giro si riprova
            daFare.forEach(i => { righe[i].textContent = 'traduzione non riuscita: ' + (err.message || err); });
            if (transitorio(err)) {
                clearTimeout(timerRiprova);
                timerRiprova = setTimeout(() => { if (mio === generazione) traduciConversazione().catch(() => { }); },
                    Math.max(15000, err.riprovaFra || 0));
            }
        }
    }

    // Ripulisce tutto e rifa' la discussione da capo, con una traduzione NUOVA: se premi il
    // pulsante e' perche' quella di prima non ti convince, e la memoria la ridarebbe uguale.
    function ritraduciTutto() {
        const dentro = riquadroConversazione() || document;
        dentro.querySelectorAll('.wurt-tr').forEach(r => { if (!r.closest('#wurt-conv')) r.remove(); });
        const desc = descrizioneEl();
        if (desc && rigaDi(desc)) rigaDi(desc).remove();
        statoMsg = new Map();
        tentativiConv = 0;
        clearTimeout(timerRiprova);
        rifaiDaCapo = true;
        if (b.conv) { b.conv.dataset.firma = ''; b.conv.innerHTML = ''; b.conv.classList.remove('wurt-vis'); }
        stato('ritraduco la discussione\u2026');
        traduciConversazione().catch(e => stato(e.message, 'ko'));
    }

    function osservaConversazione() {
        const lista = listaCommenti() || q(SEL.conversazione);
        if (!lista) return;
        if (osservaCommenti) osservaCommenti.disconnect();
        osservaCommenti = new MutationObserver(mutazioni => {
            // i cambiamenti che facciamo noi (le righe tradotte e il loro testo) non contano
            if (soloNostri(mutazioni)) return;
            clearTimeout(timerIn);
            timerIn = setTimeout(() => { traduciConversazione().catch(() => { }); agganciaCasella(); }, 400);
        });
        osservaCommenti.observe(lista, { childList: true, subtree: true });
    }

    /* ------------------------------------------------------------------ */
    /* Scheda URT nel pannello Script                                      */
    /* ------------------------------------------------------------------ */

    const CSS_TAB = `
#wurt-tab { font-size:12px; color:#1f2937; padding:4px 10px 22px; max-width:100%; overflow-x:hidden; }
#wurt-tab, #wurt-tab * { box-sizing:border-box; }
#wurt-tab .wurt-top { display:flex; align-items:center; gap:10px; margin:8px 0 2px; padding:12px 13px; border-radius:12px;
  background:linear-gradient(100deg,#312e81,#0f766e); color:#fff; box-shadow:0 2px 6px rgba(49,46,129,.22); }
#wurt-tab .wurt-top .n { font-weight:700; font-size:14px; letter-spacing:.3px; }
#wurt-tab .wurt-top .d { font-size:10.5px; opacity:.85; margin-top:1px; }
#wurt-tab .wurt-top .v { margin-left:auto; font-size:9.5px; background:rgba(255,255,255,.2); border-radius:999px; padding:2px 8px; }
#wurt-tab .wurt-sez { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:13px 14px 14px; margin:12px 0;
  box-shadow:0 1px 4px rgba(17,24,39,.05); }
#wurt-tab h5 { display:block; margin:0 0 10px; font-size:10px; font-weight:700; letter-spacing:1.1px; text-transform:uppercase;
  color:#4f46e5; border-bottom:1px solid #eceef3; padding-bottom:6px; }
#wurt-tab .r { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px dashed #eef0f4; }
#wurt-tab .r:last-child { border-bottom:0; padding-bottom:0; }
#wurt-tab .r.wurt-primo { padding-top:0; }
#wurt-tab .r label { flex:1; margin:0; font-weight:400; line-height:1.35; }
#wurt-tab .r small { display:block; color:#6b7280; font-size:10px; margin-top:2px; line-height:1.4; }
#wurt-tab select, #wurt-tab input[type=text], #wurt-tab input[type=password] { width:100%; font-size:12px; padding:7px 9px;
  border:1px solid #d3d7e0; border-radius:8px; background:#fff; color:#1f2937; }
#wurt-tab select:focus, #wurt-tab input:focus { border-color:#4f46e5; outline:none; box-shadow:0 0 0 3px rgba(79,70,229,.12); }
#wurt-tab input[type=checkbox] { accent-color:#4f46e5; width:17px; height:17px; flex:none; margin:0; }
#wurt-tab input[type=number] { font-size:12px; padding:6px 8px; border:1px solid #d3d7e0; border-radius:8px; }
#wurt-tab .wurt-chip { height:28px; padding:4px 12px; font-size:11.5px; border-radius:7px; }
#wurt-tab .wurt-chips { display:flex; flex-wrap:wrap; gap:5px; }
#wurt-tab .wurt-lingua { display:inline-flex; align-items:center; gap:6px; background:#eef2ff; border:1px solid #dde2fb;
  color:#3730a3; border-radius:999px; padding:3px 10px; font-size:10.5px; }
#wurt-tab .wurt-lingua.wurt-fissa { background:#f3f4f6; border-color:#e5e7eb; color:#4b5563; }
#wurt-tab .wurt-lingua .wurt-x { cursor:pointer; font-weight:700; color:#6366f1; }
#wurt-tab .wurt-lingua .wurt-x:hover { color:#312e81; }
#wurt-tab .nota { color:#6b7280; font-size:10.5px; line-height:1.5; margin:8px 0 2px; }
#wurt-tab .r .nota { margin:0; }
#wurt-tab .guida p { color:#374151; font-size:11.5px; line-height:1.6; margin:9px 0; }
#wurt-tab .guida p:first-child { margin-top:0; }
#wurt-tab .guida b { color:#111827; }
#wurt-tab .k { color:#4f46e5; font-weight:800; margin-right:2px; }
#wurt-tab .pie { margin:14px 0 0; padding:11px 13px; background:#f8f9fc; border:1px solid #eceef3; border-radius:12px;
  color:#6b7280; font-size:10px; line-height:1.7; }
#wurt-tab a { color:#4f46e5; text-decoration:underline; }
`;

    let tui = {};
    // Nella scheda le lingue stanno in ordine alfabetico italiano: qui si sceglie una volta sola.
    const elencoLingue = () => LINGUE.map(l => l[0])
        .sort((a, c) => nomeLingua(a).localeCompare(nomeLingua(c), 'it'))
        .map(c => `<option value="${c}">${esc(etichettaLingua(c))}</option>`).join('');

    async function costruisciTab() {
        const { tabLabel, tabPane } = await sdk.Sidebar.registerScriptTab();
        tabLabel.innerHTML = `${logo(17, 4)} <span>${SIGLA}</span>`;
        tabLabel.title = SCRIPT_NAME;
        mettiStile();
        const s = document.createElement('style'); s.textContent = CSS_TAB; document.head.appendChild(s);

        const d = document.createElement('div');
        d.id = 'wurt-tab';
        d.innerHTML = `
<div class="wurt-top">${logo(26, 6)}<div><div class="n">UR Translator</div>
  <div class="d">traduce le UR dentro il pannello &middot; ${AUTORE}</div></div><span class="v">v${VERSION}</span></div>

<div class="wurt-sez">
<h5>1 &middot; Motore di traduzione</h5>
<div class="r wurt-primo"><select data-t="motore">${attivi().map(k => `<option value="${k}">${esc(MOTORI[k].n)}</option>`).join('')}</select></div>
<div class="nota" data-t="notaMotore"></div>
<div class="r" data-t="rigaChiave"><input type="password" data-t="chiave" placeholder="incolla qui la chiave" autocomplete="off"></div>
<div class="r" data-t="rigaModello"><label>Modello<small>lascialo com'\u00e8 se non sai cosa cambiare</small></label>
  <input type="text" data-t="modello" autocomplete="off" style="max-width:190px"></div>
<div class="r" data-t="rigaInvio"><label>Modello per quello che invii<small>se vuoi un modello diverso per i messaggi al segnalante; vuoto = lo stesso</small></label>
  <input type="text" data-t="modelloInvio" autocomplete="off" style="max-width:190px"></div>
<div class="r" data-t="rigaRiserve"><label>Modelli di riserva<small>ognuno ha la sua quota gratuita: entrano quando quello scelto \u00e8 al limite, sovraccarico o ha finito la quota del giorno; separali con la virgola</small></label>
  <input type="text" data-t="riserve" autocomplete="off" style="max-width:190px"></div>
<div class="r" data-t="rigaRiserveAuto"><label>Cerca da solo altre riserve<small>se anche quelle sopra sono ferme, prova gli altri modelli di testo della tua chiave Groq</small></label><input type="checkbox" data-t="riserveAuto"></div>
<div class="r" data-t="rigaCorsa"><label>Se il modello tarda, parte anche la riserva<small>vale la prima risposta corretta: non resti mai ad aspettare</small></label><input type="checkbox" data-t="corsa"></div>
<div class="r" data-t="rigaRpm"><label>Richieste al minuto, al massimo<small>per ogni modello, sotto il limite del piano gratuito di Groq (30, lo vedi nella pagina Limits della console)</small></label>
  <input type="number" data-t="rpm" min="1" max="60" style="max-width:72px"></div>
<div class="nota" data-t="statoModelli"></div>
<div class="r"><label>Se nessuna AI risponde, usa Google<small>ultima risorsa, di serie spento: traduce peggio delle AI</small></label><input type="checkbox" data-t="ripiegoGoogle"></div>
<div class="r"><button class="wurt-chip" data-t="prova">prova il motore</button><span class="nota" data-t="esito"></span></div>
</div>

<div class="wurt-sez">
<h5>2 &middot; Lingue</h5>
<div class="r wurt-primo"><label>Io leggo e scrivo in</label><select data-t="mia" style="max-width:170px">${elencoLingue()}</select></div>
<div class="r"><label>Altre lingue che capisci<small>sulle UR in queste lingue lo script non compare</small></label></div>
<div class="r"><select data-t="nuovaConosco" style="max-width:170px">${elencoLingue()}</select>
  <button class="wurt-chip" data-t="aggiungiConosco">aggiungi</button></div>
<div class="r"><div class="wurt-chips" data-t="elencoConosco"></div></div>
<div class="r"><label>Se la lingua non si capisce<small>di solito non serve: la lingua di ogni UR arriva da Waze</small></label>
  <select data-t="ripiego" style="max-width:170px"><option value="">riconoscila dal testo</option>${elencoLingue()}</select></div>
</div>

<div class="wurt-sez">
<h5>3 &middot; Automatismi</h5>
<div class="r wurt-primo"><label>Traduci prima di inviare<small>vale anche per le risposte pronte di URC-E, compreso il doppio clic</small></label><input type="checkbox" data-t="autoOut"></div>
<div class="r"><label>Traduci subito la risposta pronta<small>appena entra nella casella, cos\u00ec la rileggi prima di mandarla</small></label><input type="checkbox" data-t="anteprimaSubito"></div>
<div class="r"><label>Traduci la conversazione<small>la riga in italiano sotto la descrizione e sotto ogni messaggio</small></label><input type="checkbox" data-t="autoIn"></div>
<div class="r"><label>Riga &laquo;tradotto automaticamente&raquo;<small>in coda a quello che mandi, nella lingua del segnalante</small></label><input type="checkbox" data-t="notaTrad"></div>
<div class="r"><label>Allega il testo italiano<small>in coda al messaggio tradotto</small></label><input type="checkbox" data-t="allegaIt"></div>
<div class="r"><label>Bandierine al posto delle sigle<small>su Windows compaiono come due lettere</small></label><input type="checkbox" data-t="bandiere"></div>
</div>

<div class="wurt-sez">
<h5>Come si usa</h5>
<div class="guida">
<p><span class="k">1.</span> <b>Una volta sola:</b> scegli il motore qui sopra, incolla la chiave e premi
<b>prova il motore</b>. Google Traduttore e MyMemory funzionano anche senza chiave.</p>
<p><span class="k">2.</span> <b>Apri una UR</b> in una lingua che non conosci: sotto la descrizione e sotto ogni
messaggio compare la traduzione in italiano, e sopra la casella dei commenti la barra <b>${SIGLA}</b>.</p>
<p><span class="k">3.</span> <b>Scrivi in italiano</b>, oppure scegli una risposta pronta di URC-E: il testo viene
tradotto appena entra nella casella, cos\u00ec lo rileggi prima di mandarlo.</p>
<p><span class="k">4.</span> <b>Premi Invia</b> (o fai il doppio clic di URC-E). Se il testo non era ancora tradotto,
viene tradotto e poi inviato. Se la traduzione non riesce il messaggio <b>non parte</b>: premendo Invia una
seconda volta parte in italiano.</p>
<p><span class="k">5.</span> <b>La barra ${SIGLA}:</b> il men\u00f9 cambia la lingua di risposta per quella UR;
<b>auto</b> accende o spegne la traduzione prima dell'invio; <b>traduci</b> ritraduce la casella; <b>IT</b>
rimette il tuo testo italiano per correggerlo; <b>\u21bb</b> ritraduce tutta la discussione.
Scorciatoia <b>ALT + T</b>: traduci la casella.</p>
<p><span class="k">6.</span> Sulle UR in italiano, o nelle lingue che hai aggiunto fra quelle che capisci, lo script
non compare e l'invio resta com'\u00e8.</p>
<p class="nota">La traduzione \u00e8 fedele: dice quello che hai scritto, senza aggiungere n\u00e9 togliere.
Le variabili di URC-E ($URD$, $USERNAME$...) e i link non vengono toccati. Rileggi sempre, soprattutto i nomi
di strada. Se qualcosa non torna, apri la console del browser (F12) e scrivi <b>wurtDiag()</b>.</p>
</div>
</div>

<div class="wurt-sez">
<h5>Manutenzione</h5>
<div class="r wurt-primo"><span class="nota" style="flex:1" data-t="statoCache"></span><button class="wurt-chip" data-t="svuota">svuota memoria</button></div>
</div>

<div class="pie">${logo(12, 2)} <b>${SCRIPT_NAME}</b> &middot; &copy; 2026 <b>${AUTORE_FULL}</b> (${AUTORE}) &middot;
codice <a href="${CODE_LIC_URL}" target="_blank" rel="noopener noreferrer">GPL-3.0-or-later</a> &middot;
<a href="${GUIDA_URL}" target="_blank" rel="noopener noreferrer">guida</a> &middot;
Slack <a href="${SLACK_URL}" target="_blank" rel="noopener noreferrer">@${AUTORE}</a><br>
Progetto indipendente, non collegato a Waze n&eacute; a URComments-Enhanced.</div>`;
        tabPane.appendChild(d);
        d.querySelectorAll('[data-t]').forEach(el => { tui[el.getAttribute('data-t')] = el; });

        tui.motore.value = motore();
        tui.mia.value = settings.mia;
        tui.ripiego.value = settings.ripiego;
        ['autoOut', 'autoIn', 'notaTrad', 'allegaIt', 'anteprimaSubito', 'bandiere', 'ripiegoGoogle', 'riserveAuto', 'corsa'].forEach(k => {
            tui[k].checked = !!settings[k];
            tui[k].addEventListener('change', () => {
                settings[k] = tui[k].checked; saveSettings();
                if (k === 'bandiere') { if (b.lingua) delete b.lingua.dataset.firma; rifaiElenchi(); }
                aggiornaBarra();
            });
        });
        tui.motore.addEventListener('change', () => { settings.motore = tui.motore.value; saveSettings(); sincronizza(); aggiornaBarra(); });
        tui.chiave.addEventListener('change', () => { settings.chiavi[motore()] = tui.chiave.value.trim(); saveSettings(); });
        tui.modello.addEventListener('change', () => { settings.modelli[motore()] = tui.modello.value.trim(); saveSettings(); disegnaModelli(); });
        tui.modelloInvio.addEventListener('change', () => { settings.modelliInvio[motore()] = tui.modelloInvio.value.trim(); saveSettings(); disegnaModelli(); });
        tui.riserve.addEventListener('change', () => {
            settings.riserve[motore()] = elencoModelli(tui.riserve.value).join(', ');
            tui.riserve.value = settings.riserve[motore()];
            saveSettings(); disegnaModelli();
        });
        tui.rpm.value = settings.rpm || CONFIG.richiesteAlMinuto;
        tui.rpm.addEventListener('change', () => {
            settings.rpm = Math.max(1, Math.min(60, parseInt(tui.rpm.value, 10) || CONFIG.richiesteAlMinuto));
            tui.rpm.value = settings.rpm; saveSettings();
        });
        tui.mia.addEventListener('change', () => { settings.mia = tui.mia.value; saveSettings(); disegnaConosciute(); });
        tui.ripiego.addEventListener('change', () => { settings.ripiego = tui.ripiego.value; saveSettings(); });
        tui.aggiungiConosco.addEventListener('click', () => {
            const c = tui.nuovaConosco.value;
            if (c && c !== settings.mia && !settings.conosco.includes(c)) {
                settings.conosco.push(c); saveSettings(); disegnaConosciute(); aggiornaBarra();
            }
        });
        disegnaConosciute();
        tui.prova.addEventListener('click', prova);
        tui.svuota.addEventListener('click', () => { cacheSvuota(); contaCache(); });
        sincronizza();
        contaCache();
    }

    // Quando si accendono o spengono le bandierine, i menu' vanno riscritti
    function rifaiElenchi() {
        if (tui.mia) { const v = tui.mia.value; tui.mia.innerHTML = elencoLingue(); tui.mia.value = v; }
        if (tui.ripiego) { const v = tui.ripiego.value; tui.ripiego.innerHTML = '<option value="">riconoscila dal testo</option>' + elencoLingue(); tui.ripiego.value = v; }
        if (tui.nuovaConosco) { const v = tui.nuovaConosco.value; tui.nuovaConosco.innerHTML = elencoLingue(); tui.nuovaConosco.value = v; }
        disegnaConosciute();
    }

    // Le lingue che leggi da solo: la tua e' fissa, le altre si tolgono con la crocetta.
    function disegnaConosciute() {
        if (!tui.elencoConosco) return;
        tui.elencoConosco.innerHTML = `<span class="wurt-lingua wurt-fissa">${esc(etichettaLingua(settings.mia))} \u00b7 la tua</span>`
            + settings.conosco.filter(c => c !== settings.mia)
                .map(c => `<span class="wurt-lingua">${esc(etichettaLingua(c))}<span class="wurt-x" data-c="${esc(c)}" title="togli">&times;</span></span>`).join('');
        tui.elencoConosco.querySelectorAll('.wurt-x').forEach(x => x.addEventListener('click', () => {
            settings.conosco = settings.conosco.filter(c => c !== x.getAttribute('data-c'));
            saveSettings(); disegnaConosciute(); aggiornaBarra();
        }));
    }

    // Mostra, per il motore scelto, cosa serve e dove si prende la chiave
    function sincronizza() {
        const m = motore();
        const info = MOTORI[m];
        tui.notaMotore.innerHTML = esc(info.nota || '')
            + (info.link ? ` <a href="${info.link}" target="_blank" rel="noopener noreferrer">Prendi la chiave</a>` : '');
        tui.rigaChiave.style.display = info.chiave ? '' : 'none';
        tui.rigaModello.style.display = info.ai ? '' : 'none';
        tui.rigaRpm.style.display = info.ai ? '' : 'none';
        tui.rigaRiserve.style.display = info.ai ? '' : 'none';
        tui.rigaRiserveAuto.style.display = info.ai ? '' : 'none';
        tui.rigaCorsa.style.display = info.ai ? '' : 'none';
        tui.rigaInvio.style.display = info.ai ? '' : 'none';
        tui.chiave.value = settings.chiavi[m] || '';
        tui.modello.value = modello(m);
        tui.modelloInvio.value = modelloInvio(m);
        tui.riserve.value = riserveManuali(m).join(', ');
        tui.esito.textContent = '';
        disegnaModelli();
    }

    // Come stanno i modelli adesso: pronto, a riposo per sovraccarico, senza quota per oggi
    function disegnaModelli() {
        if (!tui.statoModelli) return;
        const m = motore();
        if (!MOTORI[m] || !MOTORI[m].ai) { tui.statoModelli.textContent = ''; return; }
        const coppie = [];
        const add = (mm, x) => { if (x && !coppie.some(c => c.m === mm && c.mod === x)) coppie.push({ m: mm, mod: x }); };
        add(m, modelloInvio(m)); add(m, modello(m)); riserveManuali(m).forEach(x => add(m, x));
        Object.keys(fermi).forEach(k => {
            const i = k.indexOf('|');
            if (fermi[k].fino > Date.now() && MOTORI[k.slice(0, i)] && MOTORI[k.slice(0, i)].ai) add(k.slice(0, i), k.slice(i + 1));
        });
        const righe = coppie.map(c => {
            const x = etichetta(m, c);
            const f = fermo(c.m, c.mod);
            if (!f) return x + ': pronto';
            if (f.perche === 'giorno') return x + ': quota finita, torna alle ' + alle(f.fino);
            if (f.perche === 'inesistente') return x + ': non disponibile';
            if (f.perche === 'chiave') return x + ': chiave non valida';
            return x + ': sovraccarico, a riposo fino alle ' + new Date(f.fino).toLocaleTimeString('it-IT');
        });
        const sec = ms => (ms / 1000).toFixed(1).replace('.', ',') + ' s';
        const medie = coppie.filter(c => tempoDi(c.m, c.mod)).map(c => etichetta(m, c) + ' ~' + sec(tempoDi(c.m, c.mod)));
        const extra = [];
        if (medie.length) extra.push('tempi medi: ' + medie.join(', '));
        if (chiave('groq')) {
            const mods = coppie.map(c => c.mod);
            const lim = mods.filter(x => limiti[x] && limiti[x].rpd != null && limiti[x].richiesteRestano != null)
                .map(x => `${x} ${limiti[x].richiesteRestano}/${limiti[x].rpd}`);
            if (lim.length) extra.push('richieste rimaste oggi: ' + lim.join(', '));
            const tok = mods.map(x => [x, tokenGroq(86400000, x)]).filter(x => x[1]).map(x => `${x[0]} ${x[1].toLocaleString('it-IT')}`);
            if (tok.length) extra.push('token usati nelle ultime 24 ore: ' + tok.join(', '));
        }
        tui.statoModelli.textContent = righe.join(' \u00b7 ') + (ultimoModello ? ' \u00b7 ultima risposta da ' + ultimoModello : '')
            + (extra.length ? ' \u2014 ' + extra.join(' \u00b7 ') : '');
    }
    const contaCache = () => { if (tui.statoCache) tui.statoCache.textContent = Object.keys(cache).length + ' traduzioni tenute in memoria'; };

    async function prova() {
        tui.prova.disabled = true;
        tui.esito.textContent = 'provo\u2026';
        // la prova riparte da zero: modelli a riposo riattivati e niente risposta dalla memoria
        fermi = {}; salvaFermi(); quote.clear();
        try {
            const r = await traduciPezzo('La strada \u00e8 chiusa per lavori.', settings.mia, settings.mia === 'en' ? 'it' : 'en',
                { senzaMemoria: true, prio: PRIO_INVIO, pazienza: 30000 });
            tui.esito.textContent = 'funziona' + (motoreAI() && ultimoModello ? ' (' + ultimoModello + ')' : '') + ': ' + r.t.slice(0, 50);
        } catch (e) { tui.esito.textContent = 'errore: ' + (e.message || e); }
        finally { tui.prova.disabled = false; contaCache(); disegnaModelli(); }
    }

    /* ------------------------------------------------------------------ */
    /* Avvio                                                               */
    /* ------------------------------------------------------------------ */

    const sdkPromise = (typeof unsafeWindow !== 'undefined' && unsafeWindow.SDK_INITIALIZED)
        ? unsafeWindow.SDK_INITIALIZED : (window.SDK_INITIALIZED || null);
    if (sdkPromise) sdkPromise.then(avvia).catch(e => console.error(`${SCRIPT_NAME}: SDK KO`, e));
    else console.error(`${SCRIPT_NAME}: SDK_INITIALIZED assente.`);

    async function avvia() {
        const gw = (typeof unsafeWindow !== 'undefined' && unsafeWindow.getWmeSdk) ? unsafeWindow.getWmeSdk
            : (typeof getWmeSdk === 'function' ? getWmeSdk : null);
        if (!gw) return;
        sdk = gw({ scriptId: SCRIPT_ID, scriptName: SCRIPT_NAME });
        if (!sdk.State || !sdk.State.isReady || !sdk.State.isReady()) await sdk.Events.once({ eventName: 'wme-ready' });
        try { const i = sdk.State.getUserInfo(); me = (i && i.userName) || ''; } catch { /* niente */ }
        log(`avviato v${VERSION}${me ? ' \u00b7 ' + me : ''} \u00b7 motore ${nomeMotore()}`);

        await costruisciTab();

        // Un solo ascoltatore, in fase di cattura: intercetta sia il clic tuo sia il clic
        // che URC-E fa da solo sul pulsante Invia.
        document.addEventListener('click', gestisciInvio, true);

        aggancia('wme-update-request-panel-opened', e => { if (e && e.updateRequestId != null) apriUR(e.updateRequestId); });
        aggancia('wme-issue-tracker-panel-opened', e => {
            const id = e && (e.id != null ? e.id : (e.issueId != null ? e.issueId : e.updateRequestId));
            const tipo = e && (e.type || e.issueType || e.panelType);
            if (id != null && (!tipo || String(tipo).toLowerCase().indexOf('update') >= 0)) apriUR(id);
        });
        aggancia('wme-issue-tracker-panel-closed', () => chiudiUR());

        // Rete di sicurezza: se il pannello UR c'e' ma la barra no (script caricato con la UR
        // gia' aperta, oppure il WME ha ridisegnato), la rimette.
        let t = null;
        const zona = q('.overlay-container') || document.getElementById('panel-container') || document.body;
        new MutationObserver(mutazioni => {
            if (soloNostri(mutazioni)) return;
            clearTimeout(t);
            t = setTimeout(async () => {
                const aperto = pannelloAperto();
                if (!aperto) { if (barra) chiudiUR(); return; }
                if (await controllaPannello()) return;
                // la casella e' comparsa dopo la barra ridotta (pannello lento a disegnarsi):
                // si passa alla barra completa, senza toccare le traduzioni gia' fatte
                const ora = document.getElementById('wurt-bar');
                if (ora && ora.classList.contains('wurt-ridotta') && formCommento()) {
                    ora.remove(); document.getElementById('wurt-conv')?.remove();
                    barra = null; b = {};
                    await montaBarra();
                    return;
                }
                // la riga con la lingua del conducente puo' arrivare adesso
                if (ricontrollaLingua() && document.getElementById('wurt-bar')) traduciConversazione().catch(() => { });
                if (urId != null && !nonServe() && !document.getElementById('wurt-bar')) {
                    await montaBarra();
                    osservaConversazione();
                    traduciConversazione().catch(() => { });
                }
            }, 350);
        }).observe(zona, { childList: true, subtree: true });

        scorciatoia();

        // Da console: wurtDiag() dice cosa vede lo script nel pannello, messaggio per messaggio.
        const diag = () => {
            const voci = elementiDaTradurre();
            const righe = voci.map((v, i) => ({
                n: i + 1,
                tag: (v.tagName || '').toLowerCase() + (v.className ? '.' + String(v.className).split(' ')[0] : ''),
                testo: testoDiVoce(v).slice(0, 60),
                tradotto: !!(v.nextElementSibling && v.nextElementSibling.classList
                    && v.nextElementSibling.classList.contains('wurt-tr'))
            }));
            const info = {
                ur: urId,
                motore: motore() + (motoreAI() ? ' \u00b7 ' + modello() : ''),
                chiave: MOTORI[motore()].chiave ? (chiave() ? 'presente' : 'MANCANTE') : 'non serve',
                linguaUR: linguaWme || '(non dichiarata)',
                linguaDaiDati: linguaDaOggetto(urObj) || '(niente)',
                linguaDaiDettagli: linguaDaOggetto(dettagli) || '(niente)',
                campiSdk: urObj ? Object.keys(urObj).join(', ') : '(oggetto UR non nel modello)',
                preferenzeSdk: (urObj && urObj.userPreferences) ? JSON.stringify(urObj.userPreferences) : '(assenti)',
                linguaDalPannello: linguaDalPannello() || '(niente)',
                linguaRiconosciuta: linguaVista || '(non serve)',
                linguaUsata: linguaTarget(),
                laConosco: nonServe(),
                barraVisibile: !!document.getElementById('wurt-bar'),
                descrizione: (testoDescrizione() || '(nessuna)').slice(0, 60),
                messaggiNellaUR: (dettagli && dettagli.comments) ? dettagli.comments.length : 0,
                vociNelPannello: voci.length,
                righeTradotte: document.querySelectorAll('.wurt-tr').length,
                conteggio: ultimoConteggio,
                modelli: motoreAI() ? {
                    scelto: modello(),
                    perLInvio: modelloInvio() || '(lo stesso)',
                    riserve: riserveManuali(motore()).join(', ') || '(nessuna)',
                    corsaConLaRiserva: !!settings.corsa,
                    tempiMedi: Object.assign({}, tempi),
                    limitiVeri: JSON.parse(JSON.stringify(limiti)),
                    groqToken24h: tokenGroq(86400000),
                    ultimeScelte: DECISIONI.slice(-10),
                    riserveAutomatiche: !!settings.riserveAuto,
                    ultimaRisposta: ultimoModello || '(nessuna)',
                    aRiposo: Object.keys(fermi).filter(k => fermi[k].fino > Date.now())
                        .map(k => `${k} \u00b7 ${fermi[k].perche} fino alle ${new Date(fermi[k].fino).toLocaleTimeString('it-IT')}`),
                    richiesteUltimoMinuto: Array.from(quote.keys()).map(k => `${k}: ${quota(k).orari.filter(x => Date.now() - x < 60000).length}/${tettoRpm()}`),
                    inFila: fila.length
                } : '(motore non AI)' 
            };
            console.log(`${SCRIPT_NAME} v${VERSION}`, info);
            console.table(righe);
            return info;
        };
        try { (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window).wurtDiag = diag; } catch { window.wurtDiag = diag; }
    }

    async function apriUR(id) {
        urId = Number(id);
        generazione++; prontaConv = false; giroDaRifare = false; rifaiDaCapo = false; tentativiConv = 0;
        clearTimeout(timerRiprova); clearTimeout(timerIn);
        urObj = null; dettagli = null;
        statoMsg = new Map(); ultimoConteggio = null;
        linguaWme = ''; linguaVista = ''; linguaScelta = '';
        testoTradotto = ''; testoItaliano = ''; ultimoItaPieno = ''; saltaUnaVolta = false;
        smontaBarra();
        const questa = urId;

        // 1) la lingua della UR: prima dai dati, poi da come il WME la scrive nel pannello.
        //    Se il pannello non e' ancora disegnato si riprova per un attimo: sono letture
        //    locali, non costano niente, e sono sempre meglio di un tiro a indovinare.
        const leggi = () => {
            try { urObj = sdk.DataModel.MapUpdateRequests.getById({ mapUpdateRequestId: urId }) || urObj; } catch { /* non ancora nel modello */ }
            return linguaDiWaze();
        };
        linguaWme = leggi();
        for (let i = 0; i < 8 && !linguaWme; i++) { await sleep(120); if (urId !== questa) return; linguaWme = leggi(); }

        // 2) i messaggi partono a scaricarsi ORA ma non si sta ad aspettarli: la descrizione
        //    ce l'abbiamo gia' e il pannello i commenti li disegna per conto suo.
        const dett = Promise.resolve()
            .then(() => sdk.DataModel.MapUpdateRequests.getUpdateRequestDetails({ mapUpdateRequestId: urId }))
            .then(d => { if (urId === questa) dettagli = d; return d; })
            .catch(e => { log('dettagli UR non letti', e && e.message); return null; });

        // 3) la lingua la dice Waze, dal profilo del segnalante: e' quella giusta, varianti
        //    comprese (es-419, pt-BR, en-US). Solo se Waze non la dichiara la si riconosce
        //    dal testo, e in quel caso si parte dalla descrizione, che c'e' subito.
        if (!linguaWme) {
            let suo = testoDescrizione();
            if (!suo) { await dett; if (urId !== questa) return; suo = testoDelSegnalante(); }
            if (suo) {
                const d = await rilevaLingua(suo);
                if (urId !== questa) return;
                if (d) linguaVista = d;
            }
        }

        // 4) lingua che leggi da solo -> lo script non compare proprio
        if (nonServe()) {
            prontaConv = true;
            log(`UR ${urId} in ${nomeLingua(linguaTarget())}: la conosci, non mi faccio vedere`);
            return;
        }

        // 5) la barra si monta subito: nelle UR chiuse la casella dei commenti non c'e' proprio.
        osservaConversazione();
        montaBarra().then(() => { if (urId === questa) { aggiornaBarra(); ultimaFirma = firmaPannello(); } });

        // 6) la conversazione si traduce quando il pannello e' completo: dati della UR arrivati
        //    (2,5 s al massimo) e mezzo secondo di calma. Prima partiva subito con la sola
        //    descrizione e poi di nuovo con i messaggi: due richieste dove ne basta una.
        //    Quando arrivano i dati si ricontrolla anche la lingua (a volte la UR entra nel
        //    modello un attimo dopo).
        const datiOk = dett.then(() => { if (urId === questa) ricontrollaLingua(); });
        let sonda = null;
        const via = () => {
            clearInterval(sonda);
            if (urId !== questa || prontaConv) return;
            prontaConv = true;
            traduciConversazione().catch(e => log('traduzione conversazione', e && e.message));
        };
        // Si parte appena i messaggi sono nel pannello e non cambiano per 300 ms (il WME li
        // disegna tutti insieme), oppure appena arrivano i dati della UR: prima si aspettavano
        // sempre i dati e mezzo secondo in piu', un secondo e mezzo buttato su ogni UR.
        let contati = -1, fermi3 = 0;
        sonda = setInterval(() => {
            if (urId !== questa || prontaConv) { clearInterval(sonda); return; }
            const n = vociCommento().length;
            if (n > 0 && n === contati) { if (++fermi3 >= 3) via(); }
            else { fermi3 = 0; contati = n; }
        }, 100);
        Promise.race([datiOk.then(() => sleep(150)), sleep(2500)]).then(via);
        datiOk.then(() => { if (urId === questa && prontaConv) traduciConversazione().catch(() => { }); });
    }

    /* Il pannello puo' cambiare UR senza avvisare: con "Avanti", o quando il WME riusa lo
       stesso riquadro. Se cambia il numero della UR si riparte da capo; se cambia solo il
       contenuto si rifa' la scelta della lingua leggendo il pannello. */
    let ultimaFirma = '';
    async function controllaPannello() {
        const nuovo = idDalPannello();
        if (nuovo && nuovo !== urId) { await apriUR(nuovo); ultimaFirma = firmaPannello(); return true; }
        if (!barra) return false;
        const ora = firmaPannello();
        if (ora === ultimaFirma) return false;
        ultimaFirma = ora;
        if (nuovo) return false;                       // stessa UR, solo un messaggio nuovo
        const primaDesc = testoDescrizione(true);
        if (!primaDesc || primaDesc.slice(0, 25) === String((urObj && urObj.description) || '').slice(0, 25)) return false;
        // e' un'altra UR e il numero non si legge: si riparte dal testo che si vede
        log('il pannello mostra un\u2019altra UR: rifaccio la lingua sul testo');
        generazione++; prontaConv = true; tentativiConv = 0; clearTimeout(timerRiprova);
        urObj = null; dettagli = null; statoMsg = new Map();
        linguaWme = ''; linguaVista = ''; linguaScelta = '';
        document.querySelectorAll('.wurt-tr').forEach(r => r.remove());
        const nuovaUr = (() => { try { return sdk.DataModel.MapUpdateRequests.getById({ mapUpdateRequestId: urId }); } catch { return null; } })();
        if (nuovaUr && nuovaUr.userPreferences) linguaWme = normLang(nuovaUr.userPreferences.language);
        if (!linguaWme) { const d = await rilevaLingua(primaDesc); if (d) linguaVista = d; }
        if (nonServe()) { smontaBarra(); return true; }
        await montaBarra();
        aggiornaBarra();
        osservaConversazione();
        traduciConversazione().catch(() => { });
        return true;
    }

    function chiudiUR() {
        ultimaFirma = '';
        generazione++; prontaConv = true; tentativiConv = 0;
        clearTimeout(timerRiprova); clearTimeout(timerIn);
        if (osservaCommenti) { osservaCommenti.disconnect(); osservaCommenti = null; }
        smontaBarra();
        urId = null; urObj = null; dettagli = null;
        statoMsg = new Map(); ultimoConteggio = null;
        testoTradotto = ''; testoItaliano = ''; ultimoValore = ''; ultimoItaPieno = '';
        linguaWme = ''; linguaVista = ''; linguaScelta = '';
    }

    function aggancia(eventName, eventHandler) {
        try { sdk.Events.on({ eventName, eventHandler }); }
        catch (e) { log(`evento ${eventName} non disponibile`, e && e.message); }
    }

    function scorciatoia() {
        const cb = () => { if (document.getElementById('wurt-bar')) traduciCasella().catch(e => stato(e.message, 'ko')); };
        const prove = [
            () => sdk.Shortcuts.createShortcut({ shortcutId: 'wurt-traduci', description: 'UR Translator: traduci la casella', shortcutKeys: 'A+t', callback: cb }),
            () => sdk.Shortcuts.createShortcut({ shortcutId: 'wurt-traduci', description: 'UR Translator: traduci la casella', shortcutKeys: null, callback: cb })
        ];
        for (const p of prove) { try { p(); return; } catch { /* prossima */ } }
    }
})();