import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAN_pojET8emgPPP0ZxknYx-wi2pOEoypY",
  authDomain: "retail-store-app-226ad.firebaseapp.com",
  projectId: "retail-store-app-226ad",
  storageBucket: "retail-store-app-226ad.firebasestorage.app",
  messagingSenderId: "117275994900",
  appId: "1:117275994900:web:5d7e22424a3dc497aa7001"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };