// Only the Firebase pieces the app uses (crew alerts in real time). Bundled by tools/vendor.js into
// assets/vendor/firebase/firebase.js, a single local ES module loaded on demand by assets/js/crew-link.js.
export { initializeApp } from "firebase/app";
export { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
export {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    collection,
    doc,
    addDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    query,
    where,
    serverTimestamp,
    arrayUnion,
    Timestamp
} from "firebase/firestore";
