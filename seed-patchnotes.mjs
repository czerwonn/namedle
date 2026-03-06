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

const BASE = "/namedle/";

const PATCH_NOTES = [
  {
    version: "2.0",
    date: "04.03.2026",
    image: `${BASE}zdjecia/03.04-patchnotes.png`,
    changes: [
      "Długo wyczekiwane 2.0.",
      "Nowy tryb: Cytaty! Zgadnij kto to powiedział",
      "Piramidka przycisków: 4 tryby gry",
      "Passa wymaga ukończenia obu dziennych (klasyczny + cytaty)",
      "Wnioski o dodanie/zmienienie osoby/cytatu",
      "Nowa zakładka w leaderboardzie: Cytaty",
      "Zdjęcie poniżej jest przykładem jednego z 4 różnych opcji w kategorii +"
    ],
    createdAt: new Date("2026-03-04").getTime(),
  },
  {
    version: "1.52",
    date: "27.02.2026",
    changes: [
      "Naprawiono błąd z zapisywaniem karty po północy (jeśli ktoś miał otwartą kartę do po północy (np. 23:59->00:00), to gra się psuła.",
    ],
    createdAt: new Date("2026-02-27").getTime(),
  },
  {
    version: "1.51",
    date: "26.02.2026",
    changes: [
      "Wyświetlanie dziennej passy pod przyciskami trybu",
    ],
    createdAt: new Date("2026-02-26T12:00:00").getTime(),
  },
  {
    version: "1.5",
    date: "26.02.2026",
    changes: [
      "Dodano panel statystyk",
      "Leaderboard z 3 zakładkami: passa, rekord, nieskończony",
      "Dodano system passy (daily streak)",
      "Panel administracyjny",
      "Osoby przeniesione do bazy danych",
    ],
    createdAt: new Date("2026-02-26T06:00:00").getTime(),
  },
  {
    version: "1.4",
    date: "26.02.2026",
    changes: [
      "Dodano logowanie przez Discorda",
      "Globalny licznik wygranych",
      "Dodano leaderboard",
      "Naprawiono pozycje (tryb codzienny)",
    ],
    createdAt: new Date("2026-02-26").getTime(),
  },
  {
    version: "1.3",
    date: "26.02.2026",
    changes: [
      "Dodano licznik wygranych",
      "Dodano informację o pozycji osoby po rozwiązaniu namedle",
    ],
    createdAt: new Date("2026-02-25T18:00:00").getTime(),
  },
  {
    version: "1.2",
    date: "25.02.2026",
    changes: [
      "Dodano najpopularniejsze ksywki z serwera kropka",
      "Dodano wsparcie dla entera",
    ],
    createdAt: new Date("2026-02-25T12:00:00").getTime(),
  },
  {
    version: "1.1",
    date: "25.02.2026",
    changes: [
      "Dodano przycisk z patch notesami",
      "Zaaktualizowano dane o osobach",
      "Małe poprawki w kodzie",
    ],
    createdAt: new Date("2026-02-25T06:00:00").getTime(),
  },
  {
    version: "1.01",
    date: "24.02.2026",
    changes: [
      "Zmiany w danych o osobach",
      "Dodano tekst o przyszłych aktualizacjach",
    ],
    createdAt: new Date("2026-02-24T12:00:00").getTime(),
  },
  {
    version: "1.0",
    date: "24.02.2026",
    changes: [
      "Pierwsze wydanie Namedle!",
      "Tryb codzienny i nieskończony",
      "19 osób w bazie",
    ],
    createdAt: new Date("2026-02-24").getTime(),
  },
];

async function seed() {
  console.log(`Seeding ${PATCH_NOTES.length} patch notes to Firebase...`);
  for (const note of PATCH_NOTES) {
    const newRef = push(ref(db, "patchNotes"));
    await set(newRef, note);
    console.log(`  + v${note.version} (${note.date})`);
  }
  console.log("Done!");
  process.exit(0);
}

seed();
