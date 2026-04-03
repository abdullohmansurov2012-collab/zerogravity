import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD34QFBGAaPk6YPgTa4-20d1U8AmzIFgg0",
  authDomain: "abdgpt.firebaseapp.com",
  projectId: "abdgpt",
  storageBucket: "abdgpt.firebasestorage.app",
  messagingSenderId: "501837774049",
  appId: "1:501837774049:web:592bca87aa0cb1817e0ba0",
  measurementId: "G-DQ2SGWFPF0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
