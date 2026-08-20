# Struttura progetto — Larys Document Editor

```
.
├── package.json
├── package-lock.json
├── neutralino.config.json
├── .gitignore
├── LICENSE
├── structure.md
│
└── resources/
    ├── index.html
    │
    ├── assets/
    │   └── logo.png                 # icona app (finestra) + logo copertina/PDF
    │
    ├── icons/
    │   ├── appIcon.png               # non più referenziata da neutralino.config.json
    │   ├── logo.gif
    │   └── trayIcon.png
    │
    ├── css/
    │   ├── base.css
    │   ├── toolbar.css
    │   ├── content.css
    │   ├── modal.css
    │   └── pdf.css
    │
    └── js/
        ├── neutralino.js             # scaricato dal CLI (`neu update`), non versionato
        ├── main.js                   # entry point: bind eventi, avvia autosave, primo render
        ├── state.js                  # store osservabile + mutatori dello stato documento
        ├── utils.js                  # helper condivisi (observable, registry, dnd, dom lookup)
        │
        ├── components/
        │   ├── render.js              # orchestratore: cover + toolbar + sezioni + tema
        │   ├── content.js             # campi copertina (titolo/eyebrow/meta)
        │   ├── toolbar.js             # temi, nuovo/salva/carica documento
        │   ├── documentControls.js    # aggiungi sezione/firma, apri riordino, apri TOC settings
        │   ├── confirmModal.js        # modale conferma generico (promise-based)
        │   ├── reorderModal.js        # modale drag&drop riordino (sezioni/contenuti/liste)
        │   ├── listSettingsModal.js   # modale stile elenco puntato/numerato
        │   ├── tocSettingsModal.js    # modale posizione indice nel PDF
        │   └── tutorialModal.js       # guida utente in-app
        │
        ├── sections/
        │   ├── sectionManager.js      # CRUD blocchi/content-item, registry tipi di contenuto
        │   ├── sectionEvents.js       # delega eventi click/input dentro #content
        │   ├── listManager.js         # CRUD voci di elenco (nesting, stile, riordino)
        │   ├── imageEvents.js         # eventi toolbar immagini (pick/align/resize)
        │   │
        │   └── render/
        │       ├── sectionRenderer.js       # render sezioni/firme + dispatcher content-item
        │       ├── contentItemRenderers.js  # render per tipo (paragrafo/lista/immagine/tabella/sottosezione)
        │       ├── containerRenderer.js     # barra "aggiungi contenuto" + gap di inserimento
        │       ├── indexRenderer.js         # render indice (TOC) a schermo
        │       └── pdfRenderer.js           # render HTML per l'esportazione PDF (Paged.js)
        │
        ├── services/
        │   ├── storage.js             # salva/carica bozza (.larys), autosalvataggio
        │   ├── manageImages.js        # import immagini da disco → data URL
        │   └── pdfExport.js           # orchestrazione esportazione PDF (Paged.js + print)
        │
        └── vendor/
            ├── jszip.min.js
            └── paged.polyfill.js
```

## Note

- **`resources/js/neutralino.js`** non va versionato né copiato a mano in modo definitivo: è il CLI (`neu update`) a scaricarlo in base a `cli.clientVersion` in `neutralino.config.json`. È per questo che è in `.gitignore`.
- **`resources/js/vendor/*`** (JSZip, Paged.js) sono invece gestiti a mano: nessun processo li scarica o li aggiorna automaticamente.
- Il formato di salvataggio bozza è **`.larys`** (zip rinominato: `document.json` + cartella `images/`), gestito interamente da `services/storage.js`.