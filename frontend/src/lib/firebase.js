import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'

const firebaseConfig = {
  // Firebase web configuration identifies the public Firebase application; it
  // is intentionally safe to ship to the browser. Environment values can
  // override these defaults for staging or a future Firebase project.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA5YXamHiysRY2EygTvis3VPpi9bzXmbTA',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'pk-business-solution.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pk-business-solution',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'pk-business-solution.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '691374385601',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:691374385601:web:37828a0e1a1d677cd9e740',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-4ET6YRR27E',
}

function firebaseApp() {
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error('Google sign-in is not configured for this site')
  }

  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

export async function getGoogleIdToken() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const result = await signInWithPopup(getAuth(firebaseApp()), provider)
  return result.user.getIdToken()
}

export async function signOutFromFirebase() {
  if (!getApps().length) return
  await signOut(getAuth(getApp()))
}
