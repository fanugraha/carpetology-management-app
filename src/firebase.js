import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // eslint-disable-line no-unused-vars

export const auth = getAuth(app);
export const db = getFirestore(app);