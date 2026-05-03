// src/firebase.js
// Firebase v9 modular SDK setup
// Initializes app, Firestore, and Authentication for the project.

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyArKjlgUdVNpTqCmQxfEpqZPaXdj2DSqjM",
  authDomain: "cardioapp-a4541.firebaseapp.com",
  projectId: "cardioapp-a4541",
  storageBucket: "cardioapp-a4541.appspot.com",
  messagingSenderId: "655326657091",
  appId: "1:655326657091:web:f35e0e13148b48db1032f6",
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize and export services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Optional: export the app instance if other modules need it
export default app;
