# Kuno-Beller-Digital 👶📊

## **Digitale, datenschutzkonforme Auswertung der Kuno Beller Entwicklungstabelle nach DDD/VSA**

Kuno-Beller-Digital ist eine moderne, browserbasierte Single Page Application (SPA), die pädagogischen Fachkräften hilft, die Kuno Beller Entwicklungstabellen effizient, digital und visuell ansprechend auszuwerten.

---

## 🌟 Vorteile der Anwendung

- **100% Datenschutz:** Die Anwendung benötigt keine Datenbank und keinen Backend-Server. Alle eingegebenen Daten und Entwicklungsstände werden ausschließlich im lokalen Speicher (`localStorage`) deines Browsers verarbeitet.
- **Progressive Web App (PWA):** Kann auf PCs, Android- und iOS-Geräten wie eine native App installiert und offline genutzt werden.
- **Automatisierte Auswertung:** Berechnet automatisch Basis, Decke und Durchschnittswerte strikt nach den Vorgaben des Kuno Beller Handbuchs.
- **Visuelles Entwicklungsprofil:** Generiert sofort ein übersichtliches Balkendiagramm (Chart.js), das kalendarisches Alter (Lebensalter-Linie) mit dem Entwicklungsstand abgleicht.
- **Nativer PDF-Export:** Hochwertiger, maßgeschneiderter Druck-Modus (A4-Querformat für das Profil, A4-Hochformat für den komprimierten Fragenkatalog).
- **JSON-Backups:** Speichere und lade den Fortschritt eines Kindes als `.kuno` (JSON) Datei auf dein Gerät.

---

## ⚠️ Wichtiger Hinweis: Die fehlende `questions.json`

Aus **urheberrechtlichen Gründen** darf der originale Fragenkatalog (die Items und Beispiele) der Kuno Beller Entwicklungstabelle nicht öffentlich in diesem Repository geteilt werden.

Damit die App funktioniert, musst du die Frage-Datenbank selbst erstellen.

1. Erstelle die Datei: `src/assets/data/questions.json`
2. Die Datei muss folgendes JSON-Struktur-Format aufweisen:

```json
{
  "Körperpflege": {
    "PHASE 1": [
      {
        "id": 1,
        "text": "Beruhigt sich nach dem Füttern.\nBsp.: Liegt da mit offenen Augen, lallt, schläft ein."
      },
      {
        "id": 2,
        "text": "Zeigt ruhige Aktivitäten, wenn es wach ist."
      }
    ],
    "PHASE 2": [
      // ... weitere Fragen
    ]
  },
  "Umgebungsbewusstsein": {
    "PHASE 1": [
       // ... weitere Fragen
    ]
  }
  // ... weitere Kategorien
}
```

*Tipp:* Trenne die eigentliche Frage und das "Bsp.:" mit einem Zeilenumbruch (`\n`), damit die App das Beispiel im UI automatisch als kleinen, grauen Hilfstext formatiert.

---

## 🛠️ Installationshinweise

Stelle sicher, dass **Node.js** (Version 20+) installiert ist.

1. **Repository klonen:**

   ```bash
   git clone https://github.com/RaptorXilef/kuno-bella-digital.git
   cd kuno-bella-digital
   ```

2. **Abhängigkeiten installieren:**

   ```bash
   npm install
   ```

3. **Entwicklungsserver starten (Localhost):**

   ```bash
   npm run dev
   ```

4. **Produktions-Build erstellen:**

   ```bash
   npm run build
   ```

   *Die fertigen, optimierten Dateien liegen anschließend im `/dist/` Ordner und können auf jeden beliebigen Webserver hochgeladen werden.*

---

## ⚖️ Rechtliches & Mitwirken

Dieses Projekt steht unter dem Copyleft-Prinzip (CC BY-SA 4.0 / GNU GPLv3-Geist).
Details dazu findest du in der [LICENSE.md](./LICENSE.md).

Wenn du an diesem Projekt mitwirken möchtest (Pull Requests, Bugfixes, Features):

- Lies dir bitte unsere [CONTRIBUTING.md](./CONTRIBUTING.md) durch.
- Akzeptiere zwingend die Contributor License Agreement in der [CLA.md](./CLA.md).
- Änderungen und Versionen werden in der [CHANGELOG.md](./CHANGELOG.md) dokumentiert.
