const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const API_BASE = 'https://youtube-api-milay.vercel.app';
const MP3_API_BASE = 'https://norch-project.gleeze.com/api/ytmp3';
const MP4_API_BASE = 'https://norch-project.gleeze.com/api/ytdl';

const VIDEOS_PER_PAGE = 10;
const userSessions = new Map();

const SEARCH_MESSAGES = [
    "✨ Voici les pépites que j'ai dénichées pour toi",
    "🌟 J'ai trouvé ces merveilles musicales",
    "💎 Découvre ces trésors YouTube",
    "🔥 Voilà ce que YouTube a de meilleur à t'offrir"
];

const DOWNLOAD_MESSAGES = [
    "🚀 C'est parti ! Je t'envoie ça tout de suite",
    "⚡ Préparation en cours... Ça arrive !",
    "📦 Je m'occupe de tout, patience...",
    "📥 Téléchargement lancé ! Reste connecté"
];

function getRandomMessage(messages) {
    return messages[Math.floor(Math.random() * messages.length)];
}

module.exports = {
  name: "youtube",
  description: "Rechercher et télécharger des vidéos YouTube",
  role: 0,
  author: "Vercel / Norch",
  execute: async (api, event, args) => {
    const senderId = event.senderID;
    const threadID = event.threadID;

    const sendMessage = async (id, msg) => {
      return new Promise((resolve, reject) => {
        api.sendMessage(msg, id, (err, info) => {
          if (err) {
            console.error("SendMessage Error:", err);
            reject(err);
          } else {
            resolve(info);
          }
        });
      });
    };

    try {
        const prompt = args.join(" ");
        const input = (typeof prompt === 'string') ? prompt.trim() : '';
        const session = userSessions.get(senderId) || {};

        if (session.pendingDownloadLink) {
            const answer = input.toLowerCase();
            if (answer === 'oui' || answer === 'yes') {
                await sendMessage(threadID, `🔗 Voici votre lien de téléchargement direct :\n${session.lastDownloadUrl}`);
                userSessions.delete(senderId);
            } else if (answer === 'non' || answer === 'no') {
                await sendMessage(threadID, "D'accord ! N'hésitez pas si vous avez besoin d'autre chose. 😊");
                userSessions.delete(senderId);
            }
            return;
        }

        if (session.pendingFormat && session.selectedVideo) {
            const format = input.toLowerCase();
            if (format === '-v' || format === 'video') {
                await handleVideoDownload(senderId, threadID, session.selectedVideo, 'MP4', sendMessage);
            } else if (format === '-a' || format === 'audio') {
                await handleVideoDownload(senderId, threadID, session.selectedVideo, 'MP3', sendMessage);
            } else if (format === '-i' || format === 'info') {
                await handleInfoDisplay(threadID, session.selectedVideo, sendMessage);
                userSessions.delete(senderId);
            } else {
                await sendMessage(threadID, "❌ Format invalide. Choisis : -v (vidéo), -a (audio) ou -i (infos)");
            }
            return;
        }

        if (/^\d+$/.test(input) && session.allVideos) {
            const index = parseInt(input) - 1;
            const pageVideos = getVideosForPage(session.allVideos, session.currentPage || 1);
            
            if (index >= 0 && index < pageVideos.length) {
                const selectedVideo = pageVideos[index];
                userSessions.set(senderId, { ...session, selectedVideo, pendingFormat: true });
                await sendMessage(threadID, `🎯 Tu as choisi : ${selectedVideo.title}\n\nQue veux-tu faire ?\n▶️ Tape -v pour la vidéo\n🎵 Tape -a pour l'audio\nℹ️ Tape -i pour les infos`);
            } else {
                await sendMessage(threadID, `❌ Numéro invalide. Choisis entre 1 et ${pageVideos.length}`);
            }
            return;
        }

        if (input.toLowerCase().startsWith('page ') && session.allVideos) {
            const page = parseInt(input.replace('page ', ''));
            const totalPages = Math.ceil(session.allVideos.length / VIDEOS_PER_PAGE);
            if (page >= 1 && page <= totalPages) {
                await displayPage(senderId, threadID, session.allVideos, page, session.query, sendMessage);
            } else {
                await sendMessage(threadID, `❌ Page invalide (1-${totalPages})`);
            }
            return;
        }

        if (input) {
            await handleVideoSearch(senderId, threadID, input, sendMessage);
        } else {
            await sendMessage(threadID, "🎬 𝗬𝗢𝗨𝗧𝗨Ｂ𝗘 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥 🎬\n━━━━━━━━━━━━━━━━━━━\nUtilisation : youtube <titre>");
        }

    } catch (error) {
        console.error('Erreur youtube:', error.message);
        await sendMessage(threadID, `❌ Une erreur est survenue.`);
    }
  }
};

async function handleVideoSearch(senderId, threadID, query, sendMessage) {
    await sendMessage(threadID, `🔍 Recherche de "${query}"...`);
    
    try {
        const searchUrl = `${API_BASE}/recherche?titre=${encodeURIComponent(query)}`;
        const response = await axios.get(searchUrl);
        
        if (response.data && response.data.videos && response.data.videos.length > 0) {
            const allVideos = response.data.videos;
            userSessions.set(senderId, {
                allVideos,
                query,
                currentPage: 1
            });
            await displayPage(senderId, threadID, allVideos, 1, query, sendMessage);
        } else {
            await sendMessage(threadID, `😔 Aucun résultat trouvé pour "${query}"`);
        }
    } catch (error) {
        console.error("Search API Error:", error.message);
        throw error;
    }
}

async function displayPage(senderId, threadID, allVideos, page, query, sendMessage) {
    const totalPages = Math.ceil(allVideos.length / VIDEOS_PER_PAGE);
    const pageVideos = getVideosForPage(allVideos, page);
    
    userSessions.set(senderId, { ...userSessions.get(senderId), currentPage: page });
    
    await sendMessage(threadID, `🎬 𝗥𝗘́𝗦𝗨𝗟𝗧𝗔𝗧𝗦 𝗬𝗢𝗨𝗧𝗨𝗕𝗘 🎬\n━━━━━━━━━━━━━━━━━━━\n🔎 "${query}"\n📄 Page ${page}/${totalPages}\n✨ ${getRandomMessage(SEARCH_MESSAGES)}`);

    for (let i = 0; i < pageVideos.length; i++) {
        const video = pageVideos[i];
        const displayNum = i + 1;
        const videoMsg = `┏━━━━━━━━━━━━━━━━━━━\n┃ ${displayNum}️⃣ ${video.title}\n┗━━━━━━━━━━━━━━━━━━━`;
        
        const imageUrl = `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`;
        
        try {
            // Séparer l'envoi du texte et de l'image pour plus de fiabilité sur Facebook
            await sendMessage(threadID, videoMsg);
            await sendMessage(threadID, {
                attachment: await getStream(imageUrl)
            });
        } catch (err) {
            console.error("Image attachment failed:", err.message);
            // On continue sans bloquer si une image échoue
        }
        
        await new Promise(resolve => setTimeout(resolve, 800)); // Augmenter légèrement le délai
    }

    let footer = `━━━━━━━━━━━━━━━━━━━\n📥 Envoie le numéro (1-${pageVideos.length}) pour choisir.\n`;
    if (page < totalPages) footer += `➡️ Tape "page ${page + 1}" pour la suite.`;
    if (page > 1) footer += `\n⬅️ Tape "page ${page - 1}" pour revenir.`;
    
    await sendMessage(threadID, footer);
}

async function getStream(url) {
    const res = await axios.get(url, { responseType: 'stream' });
    return res.data;
}

function getVideosForPage(allVideos, page) {
    const start = (page - 1) * VIDEOS_PER_PAGE;
    return allVideos.slice(start, start + VIDEOS_PER_PAGE);
}

async function handleVideoDownload(senderId, threadID, video, format, sendMessage) {
    await sendMessage(threadID, `${getRandomMessage(DOWNLOAD_MESSAGES)}\nFormat: ${format}`);
    
    const downloadApi = format === 'MP3' ? MP3_API_BASE : MP4_API_BASE;
    const downloadUrl = `${downloadApi}?url=${encodeURIComponent(video.url)}${format === 'MP4' ? '&format=360' : ''}`;
    
    try {
        const dlRes = await axios.get(downloadUrl);
        if (dlRes.data && dlRes.data.success && dlRes.data.result) {
            const directUrl = dlRes.data.result.downloadUrl;
            
            await sendMessage(threadID, {
                attachment: await getStream(directUrl)
            });

            userSessions.set(senderId, { 
                pendingDownloadLink: true, 
                lastDownloadUrl: directUrl 
            });
            
            setTimeout(async () => {
                await sendMessage(threadID, "✅ Fichier envoyé ! Souhaitez-vous également recevoir le lien de téléchargement direct ? (Répondez par Oui ou Non)");
            }, 2000);

        } else {
            throw new Error("Download API success=false");
        }
    } catch (e) {
        console.error("Download Error:", e.message);
        await sendMessage(threadID, "❌ Erreur lors du téléchargement. Le fichier est peut-être trop lourd.");
        userSessions.delete(senderId);
    }
}

async function handleInfoDisplay(threadID, video, sendMessage) {
    const info = `💠 𝗜𝗡𝗙𝗢𝗦 𝗩𝗜𝗗𝗘́𝗢 💠\n━━━━━━━━━━━━━━━━━━━\n📝 Titre : ${video.title}\n🆔 ID : ${video.videoId}\n🔗 Lien : ${video.url}`;
    await sendMessage(threadID, info);
}
