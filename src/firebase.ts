import { initializeApp } from 'firebase/app'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

// Web API keys are public identifiers, not secrets — access is governed by
// the Firestore security rules in firestore.rules.
const firebaseConfig = {
  apiKey: 'AIzaSyCmSuWqmgMh0DXuG0j4rw6oSMjfK5pKf6Y',
  authDomain: 'tjek-ind-maagen.firebaseapp.com',
  projectId: 'tjek-ind-maagen',
  storageBucket: 'tjek-ind-maagen.firebasestorage.app',
  messagingSenderId: '985796055858',
  appId: '1:985796055858:web:a2aa987501e0e8c3c4fd2b',
}

const app = initializeApp(firebaseConfig)

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
