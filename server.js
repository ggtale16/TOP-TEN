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

    // Événement 4 : Réception de la réponse d'un joueur
    socket.on('soumettre_reponse', (reponseJoueur) => {
        // Ici, vous ajouterez la logique pour stocker la réponse dans joueurs[socket.id].reponse
        // et vérifier si tous les joueurs ont répondu.
        console.log(`Réponse de ${joueurs[socket.id].nom} reçue : ${reponseJoueur}`);
        // ...
    });
});


// 4. DÉMARRAGE DU SERVEUR
server.listen(PORT, () => {
    console.log(`Serveur de jeu démarré et écoutant sur le port : ${PORT}`);
});
