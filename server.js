// server.js

// 1. IMPORTATIONS ET CONFIGURATION INITIALE
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Définition du port : utilise la variable d'environnement de l'hébergeur (process.env.PORT) ou le port 3000 par défaut
const PORT = process.env.PORT || 3000;

// Configuration de Socket.IO, cruciale pour l'hébergement
const io = new Server(server, {
    // CORS est obligatoire si le client (HTML) est servi depuis une adresse différente
    // En développement, '*' autorise toutes les connexions. À remplacer par l'URL de votre site en production.
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// État Global du Jeu (sera stocké sur le serveur)
let joueurs = {}; // Stockera { id_socket: { nom: 'Alice', niveau: 5, reponse: '...' } }
let partieEnCours = false;
let themeActuel = null;


// 2. EXPRESS : SERVIR LES FICHIERS STATIQUES
// Cela permet à Express d'envoyer votre HTML, CSS et JS (client) aux téléphones
app.use(express.static(path.join(__dirname, 'public')));

// Assurez-vous d'avoir un dossier 'public' contenant votre index.html et vos fichiers JS/CSS client
// --- FONCTIONS DE LOGIQUE DU JEU ---

// 1. Algorithme de mélange de Fisher-Yates (pour garantir une répartition aléatoire équitable)
function melanger(tableau) {
    for (let i = tableau.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tableau[i], tableau[j]] = [tableau[j], tableau[i]];
    }
    return tableau;
}

// 2. Fonction pour attribuer un rôle aléatoire et secret (de 1 à N)
function distribuerNiveauxSecrets() {
    const idsJoueurs = Object.keys(joueurs);
    const nombreDeJoueurs = idsJoueurs.length;

    // Crée les niveaux de 1 jusqu'au nombre de joueurs
    const niveauxDisponibles = Array.from({ length: nombreDeJoueurs }, (_, i) => i + 1);
    
    // Mélange et distribue les niveaux
    const niveauxSecrets = melanger(niveauxDisponibles);

    idsJoueurs.forEach((socketId, index) => {
        const niveauSecret = niveauxSecrets[index];
        
        // Stocke le niveau sur le serveur
        joueurs[socketId].niveauSecret = niveauSecret;

        // ENVOI CIBLÉ : Envoie le niveau secret UNIQUEMENT au joueur concerné
        io.to(socketId).emit('votre_niveau_secret', niveauSecret);
    });
    
    // Vous devez définir ici le thème, ou le recevoir du Capitaine
    themeActuel = choisirTheme(); // <--- Vous devrez coder cette fonction
    io.emit('nouveau_theme_annonce', themeActuel); 
    
    console.log(`Niveaux secrets distribués à ${nombreDeJoueurs} joueurs.`);
}

// Fonction placeholder pour choisir un thème (vous la remplacerez par votre liste de thèmes)
function choisirTheme() {
    const themes = [
        "Décrivez une émotion de 1 (légère) à 10 (intense).",
        "Décrivez un animal de 1 (minuscule) à 10 (gigantesque).",
        "Décrivez votre dernier repas de 1 (dégoûtant) à 10 (divin)."
    ];
    return themes[Math.floor(Math.random() * themes.length)];
}


// 3. SOCKET.IO : GESTION DES CONNEXIONS ET DE LA LOGIQUE
io.on('connection', (socket) => {
    console.log(`[CONNEXION] Nouvelle connexion : ${socket.id}`);

    // --- A. GESTION DES JOUEURS ---
    
    // Événement 1 : Le client s'enregistre avec son nom
    socket.on('rejoindre_partie', (nomJoueur) => {
        // Ajouter le nouveau joueur à la liste
        joueurs[socket.id] = { 
            id: socket.id, 
            nom: nomJoueur, 
            niveauSecret: null, 
            reponse: null 
        };
        
        // Mettre à jour tous les clients sur l'état des joueurs
        io.emit('liste_joueurs_mise_a_jour', Object.values(joueurs));
    });

    // Événement 2 : Un joueur se déconnecte
    socket.on('disconnect', () => {
        console.log(`[DÉCONNEXION] Déconnexion : ${socket.id}`);
        delete joueurs[socket.id];
        // Notifier tous les joueurs restants
        io.emit('liste_joueurs_mise_a_jour', Object.values(joueurs));
    });

    // --- B. LOGIQUE DU JEU (À COMPLÉTER) ---
    // Côté Serveur, dans la section io.on('connection', (socket) => { ... }
    
    // Événement 3 : Le Capitaine lance un nouveau tour
    socket.on('lancer_tour', () => {
        const nombreDeJoueurs = Object.keys(joueurs).length;
        
        if (!partieEnCours && nombreDeJoueurs >= 2) { // Assurez-vous d'avoir assez de joueurs
            partieEnCours = true;
            distribuerNiveauxSecrets(); // <-- Appel de la fonction
        } else {
             // Envoi d'une erreur au client (facultatif)
             socket.emit('erreur', "Pas assez de joueurs ou partie déjà en cours.");
        }
    });

    // ... le reste de votre code socket.on ...
    
    // Événement 3 : Le Capitaine lance un nouveau tour
    socket.on('lancer_tour', () => {
        if (!partieEnCours) {
            // Ici, vous ajouterez la fonction qui :
            // 1. Choisit le thème (themeActuel)
            // 2. Attribue les niveaux secrets (joueurs[id].niveauSecret)
            // 3. Envoie le niveau secret UNIQUEMENT au joueur concerné (io.to(socket.id).emit(...))
            
            console.log("Nouveau tour lancé. Logique à implémenter.");
            partieEnCours = true;
            io.emit('theme_annonce', themeActuel); // Envoie le thème à tout le monde
        }
    });
    // Côté Serveur (dans io.on('connection', (socket) => { ... })

    // Événement 4 : Réception de la réponse d'un joueur
    socket.on('soumettre_reponse', (data) => {
        // data contient { niveau: monNiveauSecret, texte: reponse }
        const joueur = joueurs[socket.id];
        
        if (joueur && partieEnCours && !joueur.reponse) {
            joueur.reponse = { 
                texte: data.texte, 
                niveauAttendu: data.niveau 
            };
            
            console.log(`Réponse de ${joueur.nom} reçue.`);
            
            // Vérifier si toutes les réponses sont là
            verifierFinReponses(); 
        }
    });
});

// Côté Serveur (Fonction à ajouter au bas du fichier, avant server.listen)

function verifierFinReponses() {
    const tousLesJoueurs = Object.values(joueurs);
    const joueursAyantRepondu = tousLesJoueurs.filter(j => j.reponse !== null);
    
    // Si le nombre de joueurs avec une réponse est égal au nombre total de joueurs
    if (joueursAyantRepondu.length === tousLesJoueurs.length) {
        console.log("Toutes les réponses ont été reçues. Début de la phase de tri.");
        partieEnCours = false; // Fin de la phase de réponse

        // Séparation des réponses pour le tri (sans révéler le niveau secret)
        const reponsesPourTri = tousLesJoueurs.map(j => ({
            nom: j.nom,
            texte: j.reponse.texte,
            id: j.id // On garde l'ID pour la vérification future
        }));

        // Choisir un Capitaine aléatoire
        const capitaineId = tousLesJoueurs[Math.floor(Math.random() * tousLesJoueurs.length)].id;
        
        // Envoi des données pour la phase de tri
        io.emit('debut_phase_tri', {
            capitaineId: capitaineId,
            reponses: reponsesPourTri
        });
    }
}

// 4. DÉMARRAGE DU SERVEUR
server.listen(PORT, () => {
    console.log(`Serveur de jeu démarré et écoutant sur le port : ${PORT}`);
});
