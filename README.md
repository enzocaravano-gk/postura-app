# SPORTHUB — Analisi Posturale

App React per l'analisi posturale degli atleti con AI integrata (Claude Vision).

## Funzionalità
- Gestione anagrafica atleti
- Scheda posturale con 4 viste fotografiche (frontale, posteriore, laterale DX/SX)
- Analisi AI automatica delle foto tramite Claude Vision
- Storico sessioni per atleta
- Valutazione per distretto corporeo (8 aree)
- Backup/ripristino dati JSON
- Dati salvati in localStorage

## Deploy su Vercel
1. Carica questa cartella su GitHub
2. Vai su vercel.com → "New Project" → importa il repo
3. Vercel rileva automaticamente Vite → clicca Deploy

## Sviluppo locale
```bash
npm install
npm run dev
```

## Note
I dati vengono salvati nel localStorage del browser.
Esporta regolarmente un backup dal pulsante 🗄 nell'app.
