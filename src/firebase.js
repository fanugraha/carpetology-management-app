// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // <-- Tambahkan ini untuk database
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCiwRciqd3D-r3cPpc6p_dBETMAV9tpUEU",
  authDomain: "carpetology-app.firebaseapp.com",
  projectId: "carpetology-app",
  storageBucket: "carpetology-app.firebasestorage.app",
  messagingSenderId: "637696108106",
  appId: "1:637696108106:web:db933bf9344d2cd50268b3",
  measurementId: "G-F467MPY0B2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Inisialisasi Firestore Database dan export agar bisa dipakai di file komponen
export const db = getFirestore(app);