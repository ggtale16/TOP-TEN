// client.js

const socket = io(); // La connexion est établie ici

let monNiveauSecret = null;
let monNom = null; // Stocke le nom de ce joueur


// --- A. GESTION DES CONNEXIONS ET NOMS ---

function soumettreNom() {
    const inputElement = document.getElementById('nom_input');
    monNom = inputElement.value;
    
    if (monNom) {
        // Envoi de l'événement au serveur (voir server.js)
        socket.emit('rejoindre_partie', monNom);
        // Mettre à jour l'interface (masquer l'écran d'enregistrement, afficher l'écran d'attente)
        document.getElementById('ecran_enregistrement').style.display = 'none';
        document.getElementById('ecran_attente').style.display = 'block';
    }
}

// Le serveur informe ce client du niveau secret qui lui est attribué
socket.on('votre_niveau_secret', (niveau) => {
    monNiveauSecret = niveau;
    document.getElementById('niveau_secret_affichage').textContent = niveau;
    // Afficher l'écran de réponse et masquer l'écran d'attente
    document.getElementById('ecran_attente').style.display = 'none';
    document.getElementById('ecran_reponse').style.display = 'block';
});

// Le serveur annonce le thème à tout le monde
socket.on('nouveau_theme_annonce', (theme) => {
    document.getElementById('theme_actuel').textContent = theme;
});

// Le serveur envoie la liste des joueurs
socket.on('liste_joueurs_mise_a_jour', (joueurs) => {
    // Ici, vous mettrez à jour la liste des joueurs connectés dans votre UI
    const liste = document.getElementById('liste_joueurs_ui');
    liste.innerHTML = '';
    joueurs.forEach(j => {
        const li = document.createElement('li');
        li.textContent = j.nom;
        liste.appendChild(li);
    });
});


// --- B. GESTION DU JEU ---

function soumettreReponse() {
    const reponse = document.getElementById('reponse_input').value;
    if (reponse && monNiveauSecret) {
        // Envoi de la réponse au serveur
        socket.emit('soumettre_reponse', { niveau: monNiveauSecret, texte: reponse });
        document.getElementById('ecran_reponse').style.display = 'none';
        document.getElementById('ecran_attente_reponses').style.display = 'block';
    }
}

// Fonction pour que le joueur désigné comme Capitaine lance le tour
function lancerTour() {
    // Le code du client du Capitaine envoie le signal au serveur
    socket.emit('lancer_tour');
}
