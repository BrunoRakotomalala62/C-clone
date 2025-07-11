const axios = require('axios');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

module.exports = {
    name: 'llama',
    description: 'Pose une question à l\'IA Blackbox',
    async execute(api, event, args) {
        const question = args.join(' ');

        if (!question) {
            api.sendMessage(`❓ Veuillez entrer une question.\n📌 Usage : ${config.prefix}mixtral <votre question>`, event.threadID, event.messageID);
            return;
        }

        const waitingMessage = "⏳✨ Laisse-moi réfléchir un instant... Je reviens avec une réponse magique ! ✨⏳";
        api.sendMessage(waitingMessage, event.threadID, async (err, info) => {
            try {
                const response = await axios.get(`https://xnil.xnil.unaux.com/xnil/blackbox?message=${encodeURIComponent(question)}`);
                
                if (response.data.status) {
                    api.sendMessage(`🤖💡 Bot Lycéens 💡🤖\n\n${response.data.response}`, event.threadID, event.messageID);
                } else {
                    api.sendMessage("❌ Oups ! Une erreur est survenue. Réessayez plus tard.", event.threadID, event.messageID);
                }
            } catch (error) {
                api.sendMessage("❌ Une erreur est survenue lors du traitement de votre demande.", event.threadID, event.messageID);
            }
        });
    }
};
