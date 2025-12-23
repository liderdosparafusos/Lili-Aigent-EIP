
import { initializeApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, signOut } from 'firebase/auth';

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCApLTTnwqnYWcx9-_yFxlak8_wqVypX6o",
  authDomain: "lili-financeiro-contabil.firebaseapp.com",
  projectId: "lili-financeiro-contabil",
  storageBucket: "lili-financeiro-contabil.firebasestorage.app",
  messagingSenderId: "871653105100",
  appId: "1:871653105100:web:4878f49e1a01acd3a0d169"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

/**
 * CONFIGURAÇÃO DO FIRESTORE
 * Usamos experimentalForceLongPolling para evitar o erro "Could not reach Cloud Firestore backend"
 * comum em ambientes com firewalls ou instabilidades de WebSocket.
 */
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

export const auth = getAuth(app);

/**
 * Utilitário de Sanitização Global
 * Resolve o erro "Uncaught TypeError: Converting circular structure to JSON"
 * Garantindo que apenas dados puros sejam enviados ao Firestore, limpando referências circulares 
 * e convertendo objetos especiais (como Timestamps) em strings.
 */
export function sanitizeData(data: any): any {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;

  const cache = new WeakSet();
  
  const process = (val: any): any => {
    // Se for nulo ou não for objeto, retorna o valor original
    if (val === null || typeof val !== 'object') return val;

    // Proteção contra referências circulares
    if (cache.has(val)) return "[Circular]";
    cache.add(val);

    // Tratamento especial para Timestamps do Firebase
    if (typeof val.toDate === 'function') {
      return val.toDate().toISOString();
    }

    // Tratamento de Arrays
    if (Array.isArray(val)) {
      return val.map(item => process(item));
    }

    // Se não for um objeto literal (POJO), evitamos enviar para o Firestore
    // para prevenir o erro de estrutura circular do SDK (ex: DocumentReference)
    if (val.constructor && val.constructor.name !== 'Object') {
        // Se tiver toJSON (como objetos de data), usa ele
        if (typeof val.toJSON === 'function') return val.toJSON();
        // Se for uma data, ISO string
        if (val instanceof Date) return val.toISOString();
        // Caso contrário, ignora para evitar crash
        return null;
    }

    const output: any = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        const result = process(val[key]);
        if (result !== undefined) {
          output[key] = result;
        }
      }
    }
    return output;
  };

  return process(data);
}

// Helper para resetar autenticação
export const logout = async () => {
    try {
        await signOut(auth);
    } catch (e) {
        console.error("Erro ao fazer logout", e);
    }
};

// Helper para garantir autenticação antes de operações
export const ensureAuth = async () => {
  if (auth.currentUser) return auth.currentUser;
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error("Erro Crítico: Falha na Autenticação Anônima.", error);
    throw new Error("Falha na autenticação. Verifique se o 'Provedor Anônimo' está ativado no Firebase Console.");
  }
};
