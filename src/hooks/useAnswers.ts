/** Risposte degli studenti, lette in tempo reale. */
import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { answerRef, answersCollection } from '../lib/db';
import type { Answer, AnswerWithUid } from '../types';
import { useDocument, type DocState } from './useFirestore';

/**
 * Per il docente: le risposte a TUTTE le domande della partita, raggruppate per domanda.
 * Serve un abbonamento per ogni domanda; Firestore li fa viaggiare tutti
 * sulla stessa connessione. Con le risposte di tutte le domande in memoria,
 * grafico, classifica ed esportazione CSV sono semplici calcoli.
 */
export function useAnswers(gameId: string | null, questionIds: readonly string[]): Record<string, AnswerWithUid[]> {
  const key = gameId === null ? '' : `${gameId}|${questionIds.join(',')}`;
  const [stored, setStored] = useState<{ key: string; answers: Record<string, AnswerWithUid[]> }>({
    key: '',
    answers: {},
  });

  useEffect(() => {
    if (gameId === null) return;
    const unsubscribes = questionIds.map((questionId) =>
      onSnapshot(answersCollection(gameId, questionId), (snapshot) => {
        const answers = snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
        // Aggiornamento "funzionale": parte sempre dallo stato più recente,
        // perché più abbonamenti possono aggiornarlo quasi in contemporanea.
        setStored((previous) => ({
          key,
          answers: { ...(previous.key === key ? previous.answers : {}), [questionId]: answers },
        }));
      }),
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return stored.key === key ? stored.answers : {};
}

/** Per lo studente: la propria risposta alla domanda indicata (`null` se non ha ancora risposto). */
export function useMyAnswer(gameId: string, questionId: string, uid: string): DocState<Answer> {
  return useDocument(answerRef(gameId, questionId, uid));
}
