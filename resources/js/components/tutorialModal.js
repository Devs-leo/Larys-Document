
const overlay = document.createElement('div');
overlay.className = 'confirm-modal-overlay tutorial-modal-overlay';
overlay.innerHTML = `
  <div class="confirm-modal tutorial-modal">
    <h3>Guida all'uso — Editor Documenti Larys</h3>
    <div class="tutorial-modal-body">

      <section>
        <h4>✏️ Come si modifica il testo</h4>
        <p>Ogni testo del documento (titolo, paragrafi, voci di elenco, celle
        della tabella...) si modifica <strong>cliccandoci sopra direttamente</strong>,
        proprio come in un documento Word: appare il cursore lampeggiante e
        puoi scrivere.</p>
        <ul>
          <li><strong>1 click</strong> → posiziona il cursore nel punto esatto.</li>
          <li><strong>2 click veloci (doppio click)</strong> → seleziona <strong>una parola</strong> intera.</li>
          <li><strong>3 click veloci (triplo click)</strong> → seleziona <strong>tutta la frase/paragrafo</strong> in cui hai cliccato.</li>
        </ul>
        <p>Una volta selezionato il testo evidenziato in blu, puoi cancellarlo
        con il tasto <em>Canc</em>/<em>Backspace</em> oppure iniziare subito a
        scrivere per sostituirlo.</p>
        <p>Una volta selezionato una parola oppure un testo premendo la combinazione di tasti: <strong>ctrl+b</strong> ottengo il testo in grassetto; 
        <strong>ctrl+i</strong> ottengo il testo in corsivo</p>
        <p>Se un campo è vuoto, l'app mostra un piccolo testo grigio corsivo
        (es. <em>"Scrivi qui il testo del paragrafo…"</em>) solo per farti
        capire cosa scrivere: <strong>non è testo vero</strong>, sparisce da
        solo appena inizi a digitare e non serve cancellarlo a mano.</p>
      </section>

      <section>
        <h4>📄 La copertina</h4>
        <p>In cima al documento trovi tre campi cliccabili: il
        <strong>titolo</strong> grande, il <strong>sottotitolo</strong> e la
        riga con <strong>autore e data</strong>. Si modificano cliccandoci
        sopra come qualsiasi altro testo.</p>
      </section>

      <section>
        <h4>📑 L'indice del documento</h4>
        <p>L'indice (la lista con i puntini che porta al titolo di ogni
        sezione) <strong>si crea da solo</strong>: non va scritto a mano.
        Basta dare un titolo alle sezioni e alle eventuali sottosezioni, e
        l'indice si aggiorna automaticamente, con il rientro giusto per le
        sottosezioni.</p>
        <p>Sopra l'indice trovi due pulsanti:</p>
        <ul>
          <li><strong>⚙ (rotellina)</strong> → apre una finestra per scegliere
          <em>dove</em> deve comparire l'indice nel PDF finale: subito dopo la
          copertina, oppure in fondo al documento.</li>
          <li><strong>⇅ (freccine su/giù)</strong> → apre la finestra per
          <strong>riordinare le sezioni</strong> del documento (vedi il
          capitolo "Riordinare le cose" più sotto).</li>
        </ul>
      </section>

      <section>
        <h4>➕ Aggiungere una sezione</h4>
        <p>In fondo al documento trovi due pulsanti:</p>
        <ul>
          <li><strong>Aggiungi Sezione</strong> → crea una nuova sezione con
          un titolo e uno spazio dove inserire contenuti.</li>
          <li><strong>Aggiungi Sezione Destra</strong> → crea un blocco di
          testo allineato a destra, pensato per una <strong>firma</strong>
          (luogo, data, firma) in fondo al documento. Non compare
          nell'indice, non ha titolo: è solo per quello.</li>
        </ul>
        <p>Ogni sezione, in fondo, ha un pulsante <strong>"Elimina sezione"</strong>:
        l'app chiede sempre conferma prima di cancellare davvero, così non si
        perde nulla per sbaglio.</p>
      </section>

      <section>
        <h4>🧩 Cosa puoi mettere dentro una sezione</h4>
        <p>Dentro ogni sezione (o sottosezione) trovi una barra di pulsanti
        per aggiungere contenuti. Ogni pulsante aggiunge un blocco diverso
        <strong>alla fine</strong> della sezione:</p>
        <ul>
          <li><strong>+ Paragrafo</strong> → un blocco di testo normale.</li>
          <li><strong>+ Elenco</strong> → una lista puntata o numerata (vedi
          sotto come funziona nel dettaglio, è la parte più delicata).</li>
          <li><strong>+ Immagine</strong> → una foto/immagine da sola, con
          didascalia opzionale.</li>
          <li><strong>+ Immagine + testo</strong> → un'immagine affiancata a
          un testo, come in una brochure.</li>
          <li><strong>+ Tabella</strong> → una tabella con righe e colonne,
          le cui celle si modificano cliccandoci sopra come un testo
          qualsiasi.</li>
          <li><strong>+ Sottosezione</strong> → un titolo più piccolo dentro
          la sezione, per suddividere ulteriormente l'argomento (si possono
          annidare sottosezioni dentro altre sottosezioni, fino a due
          livelli).</li>
        </ul>
        <p><strong>Vuoi inserire un blocco non alla fine ma in mezzo ad altri
        due già esistenti?</strong> Passa il mouse (o tocca, su schermo
        touch) esattamente nello spazio tra i due blocchi: comparirà un
        piccolo pulsante <strong>"+"</strong> a forma di pillola. Cliccandolo
        si apre la stessa barra di scelta, e il nuovo blocco verrà inserito
        proprio in quel punto, non in fondo.</p>
      </section>

      <section>
        <h4>• Elenchi puntati: la differenza tra "+ voce" e il "+" piccolo</h4>
        <p>Questa è la parte che genera più dubbi, quindi spieghiamola bene
        con un esempio. Un elenco è fatto di righe (voci); ogni voce può
        avere delle <strong>sotto-voci</strong> rientrate sotto di lei, un
        po' come un elenco puntato con dei sotto-punti dentro un documento
        Word.</p>
        <p>Ci sono due pulsanti diversi, e fanno due cose diverse:</p>
        <ul>
          <li><strong>"+ voce"</strong> (il pulsante grande, in alto
          all'elenco) → aggiunge <strong>una nuova riga allo stesso
          livello</strong> delle altre, in fondo all'elenco. Usalo quando
          vuoi aggiungere un nuovo punto "principale" alla lista.</li>
          <li><strong>"+"</strong> (il pulsantino piccolo accanto a
          <em>ogni singola voce</em>) → aggiunge una <strong>sotto-voce
          rientrata sotto quella voce specifica</strong>, non in fondo a
          tutto l'elenco. Usalo quando vuoi spiegare/dettagliare meglio
          <em>solo quel punto lì</em>, con una riga più in piccolo sotto di
          esso.</li>
        </ul>
        <p>In pratica: <strong>"+ voce" allunga la lista verso il basso</strong>,
        mentre <strong>il "+" a fianco di una voce la fa "ramificare" verso
        destra</strong>, creando un sotto-elenco dentro quella voce. Si può
        annidare fino a due livelli di sotto-voci, poi il pulsantino "+"
        scompare da solo perché non si può andare oltre.</p>
        <p>Ogni livello dell'elenco (quello principale, e ogni sotto-elenco)
        ha una sua <strong>rotellina ⚙</strong> per scegliere lo stile dei
        pallini/numeri (pallino pieno, cerchietto, quadratino, numeri,
        lettere...) — lo stile si sceglie livello per livello, cambiarlo su
        un sotto-elenco non tocca gli altri livelli. Accanto alla rotellina
        c'è anche una <strong>⇅</strong> per riordinare le voci di quel
        livello (vedi capitolo successivo).</p>
      </section>

      <section>
        <h4>🖼️ Immagini: caricare, allineare, ridimensionare</h4>
        <p>Dentro un blocco immagine (da sola o affiancata al testo) trovi
        una barra di controlli sopra la foto:</p>
        <ul>
          <li><strong>🖼️ Immagine</strong> → apre la finestra per scegliere
          la foto dal computer.</li>
          <li><strong>Sinistra / Centro / Destra</strong> → allinea
          l'immagine nella pagina (per il blocco "Immagine + testo" ci sono
          solo Sinistra/Destra, per decidere da che lato mettere la foto
          rispetto al testo).</li>
          <li><strong>-50%</strong> → dimezza la dimensione dell'immagine.</li>
          <li><strong>1:1 (Reset)</strong> → riporta l'immagine alla sua
          dimensione originale.</li>
          <li><strong>x2</strong> → raddoppia la dimensione dell'immagine.</li>
          <li><strong>Max</strong> → allarga l'immagine a tutta la larghezza
          disponibile nella pagina.</li>
          <li><strong>⚙️ Avanzate</strong> → apre un piccolo pannello dove
          puoi scrivere <strong>a mano la larghezza esatta in pixel</strong>,
          se le dimensioni preimpostate non bastano. Se imposti una
          larghezza più grande di quella originale della foto, l'app ti
          avvisa con un messaggio giallo/rosso che l'immagine potrebbe
          diventare sgranata.</li>
        </ul>
        <p>Sotto l'immagine c'è la <strong>didascalia</strong>: un testo
        piccolo e opzionale, si scrive cliccandoci sopra come al solito.</p>
      </section>

      <section>
        <h4>🔀 Riordinare le cose (sezioni, contenuti, voci di elenco)</h4>
        <p>Ogni volta che vedi un pulsante <strong>⇅</strong> nell'app, fa
        sempre la stessa cosa: apre una finestra dove puoi
        <strong>trascinare</strong> gli elementi (tenendo premuto il mouse e
        spostandoli su o giù) per cambiarne l'ordine. Lo trovi in tre punti:</p>
        <ul>
          <li>Accanto all'indice → riordina <strong>le sezioni</strong> di
          tutto il documento.</li>
          <li>Sul bordo sinistro di ogni sezione (e di ogni sottosezione) →
          riordina <strong>i contenuti</strong> al suo interno (paragrafi,
          immagini, tabelle...).</li>
          <li>Accanto alla rotellina di un elenco → riordina <strong>le voci
          di quel livello</strong> dell'elenco.</li>
        </ul>
        <p><strong>Attenzione a un dettaglio importante:</strong> dentro
        questa finestra, ogni riga ha anche una piccola icona
        <strong>cestino</strong>. Cliccandola <strong>l'elemento viene
        cancellato subito e per sempre</strong> (dopo una conferma), anche se
        poi non premi "Salva". Il cestino non è "annullabile" chiudendo la
        finestra: chiedi sempre conferma quando cancelli qualcosa da lì,
        proprio perché è un'azione immediata.</p>
        <p>Il <strong>solo riordino</strong> (trascinare su/giù senza usare
        il cestino), invece, diventa definitivo solo se premi il pulsante
        <strong>"Salva"</strong> in basso nella finestra. Se invece premi la
        <strong>✕</strong> in alto a sinistra oppure "Annulla", il nuovo
        ordine viene scartato e tutto torna come prima (te lo chiede sempre
        conferma, per sicurezza).</p>
      </section>

      <section>
        <h4>🎨 Il tema del documento (colori)</h4>
        <p>Il pulsante <strong>Impostazioni</strong> in alto apre un
        pannello dove scegliere i colori del documento (usati su copertina,
        intestazioni e nel PDF finale):</p>
        <ul>
          <li><strong>Larys Navy</strong> / <strong>Neutro Grigio</strong> →
          due combinazioni di colore già pronte, basta cliccarci sopra.</li>
          <li><strong>Personalizzato</strong> → si attiva da solo appena
          tocchi manualmente uno dei due selettori colore sotto (colore
          primario e secondario), per scegliere le tue tonalità.</li>
        </ul>
        <p>Il pulsante <strong>Chiudi</strong> in fondo al pannello lo
        richiude.</p>
      </section>

      <section>
        <h4>💾 Salvare e riaprire una bozza</h4>
        <p>Il documento su cui stai lavorando <strong>non si salva da
        solo</strong>: va salvato manualmente, quando vuoi, con questi due
        pulsanti in alto:</p>
        <ul>
          <li><strong>Salva Bozza</strong> → salva tutto il documento (testi
          e immagini incluse) in un file sul computer, da riaprire in
          seguito o da mandare a un collega. Se qualcosa va storto compare
          un messaggio d'errore, il documento resta comunque aperto senza
          perdite.</li>
          <li><strong>Carica bozza</strong> → riapre un file di bozza salvato
          in precedenza, ripristinando il documento esattamente come
          l'avevi lasciato.</li>
        </ul>
        <p><strong>Nuovo documento</strong> invece cancella tutto e riparte
        da zero: te lo chiede sempre due volte prima di farlo davvero (una
        finestra di conferma), proprio per evitare di perdere per sbaglio un
        lavoro non ancora salvato.</p>
      </section>

      <section>
        <h4>🖨️ Esportare il PDF finale</h4>
        <p>Quando il documento è pronto, il pulsante <strong>Esporta
        pdf</strong> genera l'anteprima impaginata — con copertina, indice,
        intestazioni e piè di pagina su ogni pagina — pronta per essere
        salvata o stampata come PDF vero e proprio.</p>
      </section>

    </div>
    <div class="confirm-modal-actions">
      <button type="button" class="confirm-modal-cancel tutorial-modal-close">Ho capito, chiudi</button>
    </div>
  </div>`;
document.body.appendChild(overlay);

overlay.querySelector('.tutorial-modal-close').addEventListener('click', close);
overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
});

function close() {
    overlay.classList.remove('open');
}

/** Opens the app help/tutorial modal. */
export function showTutorialModal() {
    overlay.classList.add('open');
}