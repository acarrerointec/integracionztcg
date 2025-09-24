// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB3aZwf-rfgALpY17PJNkTsb0oZeg5fr7s",
  authDomain: "zabbixintecgs.firebaseapp.com",
  projectId: "zabbixintecgs",
  storageBucket: "zabbixintecgs.firebasestorage.app",
  messagingSenderId: "694425511313",
  appId: "1:694425511313:web:4959c01e32a498611fa630",
  measurementId: "G-DQF6PXV24K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Inicializar el servicio de autenticación


export { auth }; // Exportar el servicio de autenticación
