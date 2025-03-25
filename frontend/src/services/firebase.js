import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCQbP85KXkMRCq_aoUzuczP-6JAUJEC9Iw",
    authDomain: "survey-impower.firebaseapp.com",
    projectId: "survey-impower",
    storageBucket: "survey-impower.firebasestorage.app",
    messagingSenderId: "801055193453",
    appId: "1:801055193453:web:dbf03865c52ffa4c3f8264"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export { storage };