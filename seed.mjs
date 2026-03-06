import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, set } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAl8Wsyu4CUG2yjSwwwPyGDj6NMIxBeVt4",
  authDomain: "namedle-fabc2.firebaseapp.com",
  projectId: "namedle-fabc2",
  databaseURL: "https://namedle-fabc2-default-rtdb.europe-west1.firebasedatabase.app/",
  storageBucket: "namedle-fabc2.firebasestorage.app",
  messagingSenderId: "660495275706",
  appId: "1:660495275706:web:7aa3ffe30c06a37aa31483",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const FRIENDS = [
  { name: "axesi", image: "", skill: "mid", wzrost: "niski", region: "biedrusko", kortyzol: "niski", rokUrodzenia: "2010" },
  { name: "barwice", image: "", skill: "ass", wzrost: "sredni", region: "biedrusko", kortyzol: "niski", rokUrodzenia: "2010" },
  { name: "bluseq", image: "", skill: "mid", wzrost: "sredni", region: "biedrusko", kortyzol: "niski", rokUrodzenia: "2010" },
  { name: "criper", image: "", skill: "ass", wzrost: "sredni", region: "biedrusko", kortyzol: "wysoki", rokUrodzenia: "2010" },
  { name: "czerwony", image: "", skill: "goated", wzrost: "wysoki", region: "poznan", kortyzol: "wysoki", rokUrodzenia: "2008" },
  { name: "drbones", image: "", skill: "goated", wzrost: "niski", region: "potrzanowo", kortyzol: "niski", rokUrodzenia: "2008" },
  { name: "ecclestas", image: "", skill: "goated", wzrost: "wysoki", region: "poznan", kortyzol: "sredni", rokUrodzenia: "2007" },
  { name: "edek", image: "", skill: "goated", wzrost: "sredni", region: "czestochowa", kortyzol: "sredni", rokUrodzenia: "2005" },
  { name: "gierzek", image: "", skill: "ass", wzrost: "sredni", region: "poznan", kortyzol: "sredni", rokUrodzenia: "2007" },
  { name: "igorfrost", image: "", skill: "mid", wzrost: "wysoki", region: "potasze", kortyzol: "sredni", rokUrodzenia: "2007" },
  { name: "kasti", image: "", skill: "goated", wzrost: "niski", region: "biedrusko", kortyzol: "wysoki", rokUrodzenia: "2010" },
  { name: "kebcio", image: "", skill: "goated", wzrost: "sredni", region: "poznan", kortyzol: "niski", rokUrodzenia: "2007" },
  { name: "kokos", image: "", skill: "ass", wzrost: "niski", region: "potasze", kortyzol: "wysoki", rokUrodzenia: "2008" },
  { name: "rommatren", image: "", skill: "mid", wzrost: "sredni", region: "potrzanowo", kortyzol: "wysoki", rokUrodzenia: "2007" },
  { name: "stusiso", image: "", skill: "goated", wzrost: "wysoki", region: "biedrusko", kortyzol: "niski", rokUrodzenia: "2007" },
  { name: "szymon", image: "", skill: "mid", wzrost: "sredni", region: "poznan", kortyzol: "sredni", rokUrodzenia: "2007" },
  { name: "thefolt", image: "", skill: "ass", wzrost: "sredni", region: "poznan", kortyzol: "wysoki", rokUrodzenia: "2007" },
  { name: "unc", image: "", skill: "mid", wzrost: "wysoki", region: "plock", kortyzol: "sredni", rokUrodzenia: "2007" },
  { name: "wietek", image: "", skill: "mid", wzrost: "sredni", region: "poznan", kortyzol: "niski", rokUrodzenia: "2007" },
  { name: "stelerek", image: "", skill: "mid", wzrost: "wysoki", region: "gdansk", kortyzol: "wysoki", rokUrodzenia: "2006" },
  { name: "graceusz", image: "", skill: "ass", wzrost: "sredni", region: "kassel", kortyzol: "niski", rokUrodzenia: "2006" },
  { name: "mrkacper", image: "", skill: "mid", wzrost: "wysoki", region: "warszawa", kortyzol: "niski", rokUrodzenia: "2006" },
  { name: "demogames", image: "", skill: "mid", wzrost: "sredni", region: "wadowice", kortyzol: "niski", rokUrodzenia: "2003" },
  { name: "gandalf", image: "", skill: "mid", wzrost: "sredni", region: "tczew", kortyzol: "sredni", rokUrodzenia: "2005" },
  { name: "neira", image: "", skill: "ass", wzrost: "niski", region: "krakow", kortyzol: "wysoki", rokUrodzenia: "2006" },
  { name: "koko", image: "", skill: "ass", wzrost: "wysoki", region: "stargard", kortyzol: "niski", rokUrodzenia: "2009" },
];

async function seed() {
  console.log(`Seeding ${FRIENDS.length} friends to Firebase...`);
  for (const friend of FRIENDS) {
    const newRef = push(ref(db, "friends"));
    await set(newRef, friend);
    console.log(`  + ${friend.name}`);
  }
  console.log("Done!");
  process.exit(0);
}

seed();
