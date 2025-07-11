const axios = require('axios');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

module.exports = {
    name: 'claude',
    description: 'Pose une question à l\'IA Claude-3 Sonnet',
    async execute(api, event, args) {
        const question = args.join(' ');

        if (!question) {
            api.sendMessage(`❓ Veuillez entrer une question.\n📌 Usage : ${config.prefix}claude <votre question>`, event.threadID, event.messageID);
            return;
        }

        const waitingMessage = "💭✨ Réflexion en cours... Laisse-moi quelques instants pour t'offrir une réponse éblouissante ! 🌟🤖";
        api.sendMessage(waitingMessage, event.threadID, async (err, info) => {
            try {
                const response = await axios.get(`https://slogan-api.onrender.com/api/ai?model=claude-3-sonnet-20240229&system=You%20are%20a%20helpful%20assistant&question=${encodeURIComponent(question)}`);
                
                if (response.data.success) {
                    api.sendMessage(`🤖💡 Claude-3 Sonnet 💡🤖\n\n${response.data.response}`, event.threadID, event.messageID);
                } else {
                    api.sendMessage("❌ Oups ! Une erreur est survenue. Réessayez plus tard.", event.threadID, event.messageID);
                }
            } catch (error) {
                api.sendMessage("❌ Une erreur est survenue lors du traitement de votre demande.", event.threadID, event.messageID);
            }
        });
    }
};
