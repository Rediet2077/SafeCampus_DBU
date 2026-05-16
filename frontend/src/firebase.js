import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCdK1l-gU2P92eVoo33w-Op056qZ00IbYk",
  authDomain: "safecampus-3ea51.firebaseapp.com",
  projectId: "safecampus-3ea51",
  storageBucket: "safecampus-3ea51.firebasestorage.app",
  messagingSenderId: "685810029933",
  appId: "1:685810029933:web:d82267920ff9283ecb3664"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firestore database
export const db = getFirestore(app);

// Firebase Authentication
export const auth = getAuth(app);