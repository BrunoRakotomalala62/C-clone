const axios = require('axios');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

module.exports = {
    name: 'traduction',
    description: 'Traduisez du texte instantanément dans la langue de votre choix ! 🌍✨',
    async execute(api, event, args) {
        const input = args.join(' ');

        if (!input) {
            api.sendMessage(`❓ Veuillez entrer un texte à traduire.
📌 Usage : ${config.prefix}traduction <texte> <langue>`, event.threadID, event.messageID);
            return;
        }

        const parts = input.split(' ');
        const langue = parts.pop(); // Dernier argument = langue cible
        const texte = parts.join(' '); // Le reste = texte à traduire

        if (!texte || !langue) {
            api.sendMessage("⚠️ Format incorrect ! Veuillez spécifier un texte suivi de la langue de traduction. Exemple : !traduction Bonjour le monde en", event.threadID, event.messageID);
            return;
        }

        const waitingMessage = "🌍✨ Laisse-moi transformer tes mots en une nouvelle langue... ⏳💫";
        api.sendMessage(waitingMessage, event.threadID, async (err, info) => {
            try {
                const response = await axios.get(`https://api-test-one-brown.vercel.app/translation?text=${encodeURIComponent(texte)}&langue=${langue}`);
                
                if (response.data.response) {
                    api.sendMessage(`📖✨ Traduction réussie ! ✨📖\n\n${response.data.response}`, event.threadID, event.messageID);
                } else {
                    api.sendMessage("❌ Oups ! Impossible d'obtenir une traduction. Réessayez plus tard.", event.threadID, event.messageID);
                }
            } catch (error) {
                api.sendMessage("❌ Une erreur est survenue lors de la traduction. Vérifiez la langue et réessayez !", event.threadID, event.messageID);
            }
        });
    }
};
