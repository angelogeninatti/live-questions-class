/**
 * Prepara gli emulatori locali per provare l'app senza toccare il progetto reale:
 * crea l'account del docente con lo stesso UID scritto in `isHost()` dentro `firebase.rules`.
 *
 * Uso (con gli emulatori già avviati da `npm run emulators`):
 *   npm run seed:emulator
 * Poi avvia l'app con `VITE_USE_EMULATORS=true npm run dev` e accedi come
 * docente@example.com / password123.
 */
import { readFileSync } from 'node:fs';

const PROJECT_ID = 'demo-quiz';
const AUTH_EMULATOR = 'http://127.0.0.1:9099';
const RULES = readFileSync('firebase.rules', 'utf8');
const HOST_UID = /request\.auth\.uid == '([^']+)'/.exec(RULES)?.[1] ?? 'INSERISCI_QUI_UID_DOCENTE';
const EMAIL = 'docente@example.com';
const PASSWORD = 'password123';

// L'emulatore di Auth accetta chiamate "amministrative" con il token fittizio `owner`.
const response = await fetch(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
  body: JSON.stringify({ localId: HOST_UID, email: EMAIL, password: PASSWORD }),
});

if (response.ok) {
  console.log(`Account docente creato: ${EMAIL} / ${PASSWORD} (uid ${HOST_UID})`);
} else {
  const text = await response.text();
  if (text.includes('DUPLICATE')) console.log('Account docente già presente.');
  else throw new Error(`Creazione non riuscita (${response.status}): ${text}`);
}
