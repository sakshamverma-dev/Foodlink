import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCaK13dWC_aQcNw0WZdU-oLymo8SB3xsYY",
  authDomain: "foodlink-f6965.firebaseapp.com",
  projectId: "foodlink-f6965",
  storageBucket: "foodlink-f6965.firebasestorage.app",
  messagingSenderId: "506657453362",
  appId: "1:506657453362:web:0d6fd23190ab4b1a05932b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
