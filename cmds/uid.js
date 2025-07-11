const axios = require("axios");

module.exports = {
    name: 'uid',
    description: "Voir l'ID Facebook d'un utilisateur",
    async execute(api, event, args) {
        // Fonction utilitaire pour trouver l'UID à partir d'un lien
        async function findUid(link) {
            try {
                const response = await axios.get(link);
                const html = response.data;
                const entityIdMatch = html.match(/"entity_id":"(\d+)"/);
                if (entityIdMatch) return entityIdMatch[1];
                
                const userIdMatch = html.match(/"userID":"(\d+)"/);
                if (userIdMatch) return userIdMatch[1];
                
                throw new Error("Impossible de trouver l'UID");
            } catch (err) {
                throw new Error(`Erreur lors de la récupération de l'UID: ${err.message}`);
            }
        }
        
        const regExCheckURL = /^(http|https):\/\/[^ "]+$/;

        // Si c'est une réponse à un message
        if (event.messageReply) {
            return api.getUserInfo(event.messageReply.senderID, (err, data) => {
                if (err) {
                    return api.sendMessage("Erreur lors de la récupération des informations utilisateur.", event.threadID);
                }
                api.sendMessage(`ID de l'utilisateur: ${event.messageReply.senderID}`, event.threadID, event.messageID);
            });
        }

        // Si aucun argument, afficher l'ID de l'expéditeur
        if (!args.length) {
            return api.getUserInfo(event.senderID, (err, data) => {
                if (err) {
                    return api.sendMessage("Erreur lors de la récupération de vos informations.", event.threadID);
                }
                api.sendMessage(`Votre ID: ${event.senderID}`, event.threadID, event.messageID);
            });
        }

        // Si c'est un lien
        if (args[0].match(regExCheckURL)) {
            let msg = '';
            for (const link of args) {
                try {
                    const uid = await findUid(link);
                    msg += `${link} => ${uid}\n`;
                } catch (e) {
                    msg += `${link} (ERREUR) => ${e.message}\n`;
                }
            }
            return api.sendMessage(msg, event.threadID, event.messageID);
        }

        // Si ce sont des mentions
        let msg = "";
        const mentions = event.mentions || {};
        for (const id in mentions) {
            msg += `${mentions[id].replace("@", "")}: ${id}\n`;
        }
        api.sendMessage(msg || "Merci de mentionner (@) l'utilisateur dont vous voulez voir l'ID ou ne rien mettre pour voir votre propre ID", event.threadID, event.messageID);
    }
};
