const login = require("ws3-fca");
const express = require("express");
const axios = require("axios");
const app = express();

// Charger la configuration depuis config.json
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", "utf8"));

// Charger appstate depuis les variables d'environnement
let appState = null;
const appstateEnv = process.env.APPSTATE;

if (!appstateEnv) {
    console.log("Warning: APPSTATE environment variable is not set. Bot login disabled - server running in status-only mode.");
} else {
    try {
        appState = JSON.parse(appstateEnv);
        console.log("Appstate chargé avec succès depuis les variables d'environnement.");
    } catch (error) {
        console.error("Échec du chargement de l'appstate depuis l'environnement", error);
    }
}

const port = config.port || 3000;

// Charger les commandes depuis le dossier cmds
const commandFiles = fs.readdirSync('./cmds').filter(file => file.endsWith('.js'));
const commands = {};
commandFiles.forEach(file => {
    const command = require(`./cmds/${file}`);
    commands[command.name] = command;
});

// Charger le module maj depuis auto/
const maj = require('./auto/maj');

// Object pour suivre les commandes actives par utilisateur
let activeCommands = {};

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

            // Vérifier si l'utilisateur a une commande active
            if (activeCommands[senderId]) {
                const activeCommand = activeCommands[senderId];
                if (message.toLowerCase() === "stop") {
                    // Désactiver la commande active pour l'utilisateur
                    delete activeCommands[senderId];
                    api.sendMessage(`La commande ${activeCommand} a été désactivée avec succès.`, event.threadID);
                    return;
                } else if (commands[activeCommand]) {
                    // Continuer la conversation avec la commande active
                    return commands[activeCommand].execute(api, event, [message]);
                }
            }

            // Vérifier s'il s'agit d'une commande avec un préfixe
            if (message.startsWith(prefix)) {
                const args = message.slice(prefix.length).split(/ +/);
                const commandName = args.shift().toLowerCase();

                if (commands[commandName]) {
                    if (commandName === "help") {
                        // La commande help n'a pas besoin d'une commande stop
                        return commands[commandName].execute(api, event, args);
                    }

                    // Définir une commande active pour l'utilisateur
                    activeCommands[senderId] = commandName;

                    // Exécuter la commande sélectionnée
                    return commands[commandName].execute(api, event, args);
                } else {
                    // Si la commande n'existe pas, utiliser l'API Gemini
                    api.sendMessage("⏳ Veuillez patienter un instant pendant que l'IA traite votre demande...", event.threadID);
                    axios.post('https://gemini-sary-prompt-espa-vercel-api.vercel.app/api/gemini', {
                        prompt: message,
                        customId: senderId
                    }).then(response => {
                        api.sendMessage(response.data.message, event.threadID);
                    }).catch(err => console.error("Erreur API :", err));
                }
            }

            // Si le message contient des pièces jointes, les traiter avec l'API Gemini
            if (attachments.length > 0 && attachments[0].type === 'photo') {
                api.sendMessage("⏳💫 Veuillez patienter un instant pendant que Bruno analyse votre image...", event.threadID);

                const imageUrl = attachments[0].url;
                axios.post('https://gemini-sary-prompt-espa-vercel-api.vercel.app/api/gemini', {
                    link: imageUrl,
                    prompt: "Analyse du texte de l'image pour détection de mots-clés",
                    customId: senderId
                }).then(ocrResponse => {
                    const ocrText = ocrResponse.data.message || "";
                    const hasExerciseKeywords = /(\d+\)|[a-zA-Z]\)|Exercice)/.test(ocrText);
                    const prompt = hasExerciseKeywords
                        ? "Faire cet exercice et donner la correction complète de cet exercice"
                        : "Décrire cette photo";

                    return axios.post('https://gemini-sary-prompt-espa-vercel-api.vercel.app/api/gemini', {
                        link: imageUrl,
                        prompt,
                        customId: senderId
                    });
                }).then(response => {
                    api.sendMessage(response.data.message, event.threadID);
                }).catch(err => console.error("Erreur OCR ou réponse :", err));
            } else if (!message.startsWith(prefix)) {
                // Si aucun préfixe, utiliser maj.js comme fallback automatique
                return maj.execute(api, event, [message]);
            }
        }

        api.listenMqtt((err, event) => {
            if (err) return console.error("Erreur de connexion MQTT :", err);
            if (event.type === "message") handleMessage(event);
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
    // Ping toutes les 15 minutes (900 secondes)
    const PING_INTERVAL = 15 * 60 * 1000; // 15 minutes
    
    // Fonction pour envoyer le ping
    async function sendPing() {
        try {
            // Récupérer le domaine depuis l'environnement Replit
            const domain = process.env.REPLIT_DOMAINS || `localhost:${port}`;
            const pingUrl = `http://${domain}/health`;
            
            const response = await axios.get(pingUrl, { timeout: 5000 });
            console.log(`🔵 [AUTO-PING] ${new Date().toISOString()} - Bot actif ✅`);
        } catch (error) {
            console.log(`🔴 [AUTO-PING] Erreur: ${error.message}`);
        }
    }
    
    // Premier ping après 1 minute
    setTimeout(() => {
        console.log("🟢 [AUTO-PING] Système d'auto-ping activé - Bot restera actif 24/7");
        sendPing();
    }, 60000);
    
    // Puis pingue toutes les 15 minutes
    setInterval(sendPing, PING_INTERVAL);
}

app.listen(port, "0.0.0.0", () => {
    console.log(`Le serveur fonctionne sur http://0.0.0.0:${port}`);
    
    // Démarrer le système d'auto-ping
    startAutoPing();
});
