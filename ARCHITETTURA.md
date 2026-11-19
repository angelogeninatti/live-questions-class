# Architettura

Web app per quiz in aula, in stile Kahoot. Il docente proietta le domande, gli studenti rispondono dal telefono e la soluzione viene rivelata in diretta. Ogni quiz ha poi una pagina di ripasso permanente. Il sito è statico (React + TypeScript su GitHub Pages) e tutti i dati stanno su **Cloud Firestore**. Non c'è un server scritto da noi: le **regole di sicurezza** di Firestore decidono chi può leggere e scrivere cosa.

## Struttura del codice

```
src/
  types.ts        modello dati: formato del file JSON e documenti di Firestore
  firebase.ts     inizializzazione di Firebase (configurazione da variabile d'ambiente)
  App.tsx         routing a hash: #/play?quiz=ID, #/host, #/review?quiz=ID
  views/          StudentView, HostView (+ host/LibraryPage, host/GamePage), ReviewView
  components/     componenti di presentazione: QuestionCard, AnswerChart, Timer, QRCodeBox, ...
  hooks/          letture in tempo reale: useActiveGame, useAnswers, usePlayers, useQuizLibrary, ...
  lib/            logica senza interfaccia:
                    db.ts               percorsi tipizzati dei documenti
                    quizValidation.ts   schema zod del file di upload
                    quizActions.ts, gameActions.ts, studentActions.ts   tutte le scritture
                    scoring.ts, csv.ts, nickname.ts                     funzioni pure
firebase.rules    regole di sicurezza (testate in tests/firestore-rules.test.ts)
```

Il codice segue una regola semplice: **gli hook leggono, `lib/*Actions.ts` scrive, i componenti mostrano**. Ogni lettura è un abbonamento `onSnapshot`. Quando il docente scrive su Firestore, tutti i client in ascolto si aggiornano da soli, senza bisogno di un server che inoltri i messaggi.

## Dati su Firestore

| Percorso | Contenuto | Chi legge | Chi scrive |
|---|---|---|---|
| `quizzes/{quizId}` | titolo, domande e opzioni (senza soluzioni), `reviewPublished` | docente; studenti solo se il quiz è in onda; chiunque se `reviewPublished` | docente |
| `quizzes/{quizId}/private/solutions` | risposte corrette e spiegazioni | docente; chiunque **solo se** `reviewPublished` è `true` | docente |
| `config/activeGame` | `{ gameId, quizId }` della partita in onda | docente | docente |
| `live/{quizId}` | `{ gameId }`, esiste solo per il quiz in onda | utenti autenticati che conoscono l'id (nessun elenco) | docente |
| `config/moderation` | parole vietate nei nickname | utenti autenticati | docente |
| `games/{gameId}` | fase, domanda corrente, soluzioni già rivelate, classifica | utenti autenticati | docente |
| `games/{gameId}/players/{uid}` | nickname | il diretto interessato, docente | lo studente crea solo il proprio |
| `games/{gameId}/nicknames/{nome}` | "prenotazione" del nickname, per l'unicità | utenti autenticati | lo studente, solo se libero |
| `games/{gameId}/questions/{qId}/answers/{uid}` | opzione scelta e ora del server | il diretto interessato, docente | lo studente: una volta sola, solo a domanda aperta |

Gli id dei quiz hanno 10 caratteri casuali, generati con `crypto.getRandomValues` (circa 10^15 combinazioni). Sono brevi da condividere ma impossibili da indovinare.

## Flusso di una domanda

```
docente: "Avvia domanda"   → games/{id}.status = "open", openedAt[q] = ora del server
studenti: vedono la domanda → creano answers/{uid} (le regole controllano fase, tempo, opzione)
docente: vede il grafico crescere (onSnapshot sulle risposte); a tempo scaduto chiude da solo
docente: "Rivela soluzione" → copia la soluzione in games/{id}.revealed[q] e aggiorna la classifica
studenti: confrontano la propria risposta con revealed[q] → "Corretto!" / "Sbagliato"
```

## Scelte principali

- **Firestore invece di Realtime Database.** Sul piano gratuito il Realtime Database accetta al massimo 100 connessioni simultanee: una classe di 100 studenti, più proiettore e telefono del docente, le supererebbe. Firestore non ha questo limite e le sue regole possono confrontare più documenti tra loro (ad esempio: "la risposta è accettata solo se la partita è nella fase `open`").
- **Soluzioni separate dalla parte pubblica.** Gli studenti scaricano solo testi e opzioni. Le soluzioni stanno in un documento a parte, che le regole rendono leggibile solo dopo la pubblicazione. Durante la partita, la soluzione di una domanda arriva agli studenti solo quando il docente la rivela. Ispezionare la rete o il database non serve a scoprirla prima.
- **Pubblicare il ripasso è un interruttore.** Il campo `reviewPublished` del quiz attiva o disattiva la lettura delle soluzioni. Nessun dato viene copiato e non serve un nuovo deploy.
- **Un link per quiz.** Gli studenti entrano da `#/play?quiz=ID`. Il quiz in onda è scritto in `config/activeGame`, che legge solo il docente, e in `live/{quizId}`, che gli studenti possono leggere solo conoscendo l'id: le regole non permettono di elencare la collezione. Così chi non ha il link non scopre quale partita è in onda, e il link si può preparare su Moodle prima della lezione.
- **Identità degli studenti.** Ogni studente entra con un account anonimo di Firebase, che il browser ricorda. Se ricarica la pagina ritrova lo stesso uid, quindi la sua partita e le risposte già date.
- **Integrità del punteggio.** L'ora di ogni risposta è quella del server: le regole impongono `answeredAt == request.time`. Il docente calcola la classifica da zero a ogni rivelazione, con una funzione pura (`computeLeaderboard`), poi la copia nel documento della partita. Così il risultato resta coerente anche quando si torna indietro di una domanda.
- **Nickname.** Un nickname è unico se il documento `nicknames/{nome}` si riesce a creare: due studenti non possono crearlo entrambi. Le parole vietate non stanno nel repository, che è pubblico, ma su Firestore. L'app le confronta in modo tollerante (accenti, cifre al posto di lettere, lettere ripetute). Le regole ripetono il controllo parola per parola, nel caso qualcuno scriva nel database senza passare dall'app. Resta comunque la possibilità di espellere un partecipante.
- **Routing a hash** (`#/...`). GitHub Pages serve solo file statici. Con l'hash il server riceve sempre `index.html`, quindi ricaricare una pagina non dà mai 404.
- **Validazione dell'upload con zod.** Lo schema è annotato con i tipi di `types.ts`: se tipi e schema divergono, il compilatore segnala l'errore. Il file viene validato per intero prima di qualsiasi scrittura su Firestore.

## Verifiche

- `npm run test:rules` avvia l'emulatore di Firestore ed esegue 28 test delle regole (lettura delle soluzioni, risposte doppie o fuori tempo, nickname duplicati o vietati, ...).
- `npm run emulators`, poi `npm run seed:emulator` e `npm run dev:emulator`: l'app gira in locale, senza toccare il progetto reale.
- `npm run simulate -- 50 --quiz=ID` fa entrare 50 studenti simulati, che rispondono a ogni domanda.
