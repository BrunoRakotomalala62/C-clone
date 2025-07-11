
const axios = require('axios');

module.exports = {
    name: 'photo',
    description: 'Recherche et envoie des images basées sur le texte saisi',
    async execute(api, event, args) {
        const prompt = args.join(' ');
        
        if (!prompt) {
            api.sendMessage("Veuillez entrer un terme de recherche.\nUsage: photo <votre recherche>", event.threadID, event.messageID);
            return;
        }

        api.sendMessage("🔍 Recherche en cours... Je vais vous envoyer les images.", event.threadID, event.messageID);

        try {
            const query = encodeURIComponent(prompt);
            const apiUrl = `https://recherche-photo.vercel.app/recherche?photo=${query}&page=1`;
            
            const response = await axios.get(apiUrl);
            const images = response.data.images;

            if (images && images.length > 0) {
                for (let i = 0; i < images.length; i++) {
                    const imageUrl = images[i];
                    
                    try {
                        // Récupérer l'image en tant que stream
                        const imageStream = await axios.get(imageUrl, { responseType: 'stream' });
                        
                        // Envoyer le message avec l'image
                        api.sendMessage({
                            attachment: imageStream.data
                        }, event.threadID);
                    } catch (imageError) {
                        console.error("Erreur lors du téléchargement de l'image:", imageError);
                        api.sendMessage(`Impossible de télécharger l'image: ${imageUrl}`, event.threadID);
                    }

                    // Attendre une seconde avant d'envoyer la prochaine image
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                api.sendMessage("✅ Toutes les images ont été envoyées.", event.threadID);
            } else {
                api.sendMessage("❌ Aucune image trouvée pour votre recherche.", event.threadID);
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des images:", error);
            api.sendMessage("Désolé, une erreur s'est produite lors du traitement de votre demande.", event.threadID, event.messageID);
        }
    }
};
