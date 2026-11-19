/**
 * Due hook generici su cui si appoggiano tutti gli altri: si "abbonano" a un documento
 * o a una collezione con `onSnapshot` e restituiscono sempre l'ultima versione dei dati.
 * Quando il componente sparisce, l'abbonamento viene chiuso (la funzione restituita
 * da `onSnapshot` è proprio quella di pulizia richiesta da `useEffect`).
 */
import { useEffect, useState } from 'react';
import {
  onSnapshot,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type FirestoreError,
} from 'firebase/firestore';

/** Stato di una lettura in tempo reale. `data: null` significa "il documento non esiste". */
export type DocState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T | null }
  | { status: 'error'; error: FirestoreError };

export type CollectionState<T> =
  | { status: 'loading' }
  | { status: 'ready'; items: { id: string; data: T }[] }
  | { status: 'error'; error: FirestoreError };

/** Risultato memorizzato insieme al percorso a cui si riferisce. */
interface Stored<S> {
  path: string;
  state: S;
}

/**
 * Segue in tempo reale un documento. Con `ref === null` non legge nulla
 * e risponde "documento inesistente".
 */
export function useDocument<T extends DocumentData>(ref: DocumentReference<T, DocumentData> | null): DocState<T> {
  const path = ref?.path ?? null;
  const [stored, setStored] = useState<Stored<DocState<T>> | null>(null);

  useEffect(() => {
    if (ref === null) return;
    return onSnapshot(
      ref,
      (snapshot) => setStored({ path: ref.path, state: { status: 'ready', data: snapshot.data() ?? null } }),
      (error) => setStored({ path: ref.path, state: { status: 'error', error } }),
    );
    // Il riferimento è un oggetto nuovo a ogni render, il percorso invece no:
    // ci abboniamo di nuovo solo quando cambia il documento da seguire.
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  if (path === null) return { status: 'ready', data: null };
  // Finché non arriva il primo dato del NUOVO percorso, siamo in caricamento
  // (evita di mostrare per un attimo i dati del documento precedente).
  if (stored === null || stored.path !== path) return { status: 'loading' };
  return stored.state;
}

/** Segue in tempo reale tutti i documenti di una collezione. */
export function useCollection<T extends DocumentData>(ref: CollectionReference<T, DocumentData> | null): CollectionState<T> {
  const path = ref?.path ?? null;
  const [stored, setStored] = useState<Stored<CollectionState<T>> | null>(null);

  useEffect(() => {
    if (ref === null) return;
    return onSnapshot(
      ref,
      (snapshot) =>
        setStored({
          path: ref.path,
          state: { status: 'ready', items: snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() })) },
        }),
      (error) => setStored({ path: ref.path, state: { status: 'error', error } }),
    );
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  if (path === null) return { status: 'ready', items: [] };
  if (stored === null || stored.path !== path) return { status: 'loading' };
  return stored.state;
}
