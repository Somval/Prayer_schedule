import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Replace with the values from Firebase Console -> Project Settings -> Your apps -> Web app
const firebaseConfig = {
  apiKey: "AIzaSyCSVfnbqrtAVRRdTXC5PZhBiIthIQ8MYuM",
  authDomain: "prayer-schedule-66bd8.firebaseapp.com",
  projectId: "prayer-schedule-66bd8",
  storageBucket: "prayer-schedule-66bd8.appspot.com",
  messagingSenderId: "442927809925",
  appId: "1:442927809925:web:0523d12640c11cb483b0ec",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
