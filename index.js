const login = require('ws3-fca');
const fs = require('fs');
const axios = require('axios');
const config = require('./config.json');
const path = require('path');
const express = require('express');
const app = express();
const port = 5000;

// Charger les commandes
const commands = {};
const commandFiles = fs.readdirSync(path.join(__dirname, 'cmds')).filter(f => f.endsWith('.js'));

commandFiles.forEach(file => {
    const command = require(`./cmds/${file}`);
    commands[command.name] = command;
});

// Charger le module maj depuis auto/
const maj = require('./auto/maj');

// Object pour suivre les commandes actives par utilisateur
let activeCommands = {};

// Charger l'appState depuis les variables d'environnement
let appState = null;
try {
    const appstateEnv = process.env.APPSTATE;
    if (appstateEnv) {
        appState = JSON.parse(appstateEnv);
        console.log('✅ Appstate chargé avec succès depuis les variables d\'environnement.');
    } else {
        console.log('❌ APPSTATE non trouvé dans les variables d\'environnement.');
    }
} catch (error) {
    console.error('❌ Erreur lors du parsing de l\'appstate:', error);
}

// Démarrer le serveur Express avant de connecter le bot
app.listen(port, '0.0.0.0', () => {
    console.log(`Le serveur fonctionne sur http://0.0.0.0:${port}`);
    startAutoPing();
});

if (appState) {
    login({ appState }, (err, api) => {
        if (err) return console.error("Erreur de connexion :", err);

        api.setOptions({
            forceLogin: true,
            listenEvents: true,
            logLevel: "silent",
            selfListen: false
        });

        function handleMessage(event) {
            const prefix = config.prefix;
            const message = event.body;
            const senderId = event.senderID;
            const attachments = event.attachments || [];
            const threadID = event.threadID;

            console.log(`[MESSAGE] ${senderId}: "${message}" (attachments: ${attachments.length})`);

            // Vérifier si l'utilisateur a une commande active
            if (activeCommands[senderId]) {
                const activeCommand = activeCommands[senderId];
                if (message.toLowerCase() === "stop") {
                    delete activeCommands[senderId];
                    api.sendMessage(`La commande ${activeCommand} a été désactivée avec succès.`, threadID);
                    return;
                } else if (commands[activeCommand]) {
                    return commands[activeCommand].execute(api, event, [message]);
                }
            }

            // Vérifier s'il s'agit d'une commande avec un préfixe
            if (message.startsWith(prefix)) {
                const args = message.slice(prefix.length).split(/ +/);
                const commandName = args.shift().toLowerCase();

                if (commands[commandName]) {
                    if (commandName === "help") {
                        return commands[commandName].execute(api, event, args);
                    }

                    activeCommands[senderId] = commandName;
                    return commands[commandName].execute(api, event, args);
                }
            }

            // Vérifier si c'est une image
            if (attachments.length > 0 && attachments[0].type === 'photo') {
                console.log(`[IMAGE] Traitement image pour ${senderId}`);
                const imageUrl = attachments[0].url;
                maj.handleImageMessage(api, senderId, threadID, imageUrl);
                return;
            }

            // Par défaut, envoyer à maj (réponse automatique)
            console.log(`[AUTO-RESPONSE] Envoi à maj pour ${senderId}`);
            maj.handleTextMessage(api, senderId, threadID, message);
        }

        api.listen((err, event) => {
            if (err) {
                console.error("Erreur de connexion :", err);
                return;
            }
            if (event.type === "message") {
                console.log(`[EVENT] Message reçu de ${event.senderID}`);
                handleMessage(event);
            }
        });
    });
} else {
    console.log("Bot not started - APPSTATE secret is required for Facebook Messenger login.");
}

app.get("/", (req, res) => {
    res.send("Bot is running");
});

// Endpoint de santé pour le ping automatique
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Système d'auto-ping pour garder le bot actif 24/7
function startAutoPing() {
    const PING_INTERVAL = 15 * 60 * 1000; // 15 minutes
    
    async function sendPing() {
        try {
            const domain = process.env.REPLIT_DOMAINS || `localhost:${port}`;
            const pingUrl = `http://${domain}/health`;
            
            const response = await axios.get(pingUrl, { timeout: 5000 });
            console.log(`🔵 [AUTO-PING] ${new Date().toISOString()} - Bot actif ✅`);
        } catch (error) {
            console.log(`🔴 [AUTO-PING] Erreur: ${error.message}`);
        }
    }
    
    setTimeout(() => {
        console.log("🟢 [AUTO-PING] Système d'auto-ping activé - Bot restera actif 24/7");
        sendPing();
    }, 60000);
    
    setInterval(sendPing, PING_INTERVAL);
}
