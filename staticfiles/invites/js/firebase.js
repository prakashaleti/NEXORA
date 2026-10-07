/**
 * firebase.js
 * Modular Firebase SDK v10+ initialization for NEXORA.
 * Exports Firestore db, Auth, and helper utilities.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    collection, 
    getDocs, 
    query, 
    where,
    orderBy, 
    serverTimestamp,
    writeBatch,
    Timestamp,
    runTransaction,
    onSnapshot,
    increment
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDTDHQk412wCI1uV8jkfxm6gOdcNMi83j4",
  authDomain: "nexora-18775.firebaseapp.com",
  projectId: "nexora-18775",
  storageBucket: "nexora-18775.firebasestorage.app",
  messagingSenderId: "1078719145094",
  appId: "1:1078719145094:web:0ec777bc53c0af5b7fdd07",
  measurementId: "G-3C901H74PN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export { 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    collection, 
    getDocs, 
    query, 
    where,
    orderBy, 
    serverTimestamp,
    writeBatch,
    Timestamp,
    runTransaction,
    onSnapshot,
    increment,
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
};

export default app;
