const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const conversationHistory = new Map();
let apiInstance = null;

// Initialiser l'API
function initAPI(api) {
    apiInstance = api;
}

async function uploadImageToCatbox(imageUrl) {
    try {
        console.log('📥 Téléchargement de l\'image depuis:', imageUrl);

        const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: Infinity,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const imageBuffer = Buffer.from(imageResponse.data);
        console.log('✅ Image téléchargée, taille:', imageBuffer.length, 'bytes');

        const formData = new FormData();
        formData.append('reqtype', 'fileupload');
        formData.append('fileToUpload', imageBuffer, {
            filename: 'image.jpg',
            contentType: imageResponse.headers['content-type'] || 'image/jpeg'
        });

        console.log('📤 Upload vers catbox.moe...');
        const uploadResponse = await axios.post('https://catbox.moe/user/api.php', formData, {
            headers: formData.getHeaders(),
            timeout: 30000,
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });

        const publicUrl = uploadResponse.data.trim();

        if (!publicUrl.startsWith('https://')) {
            console.error('❌ Réponse invalide de catbox:', publicUrl);
            throw new Error('Service d\'hébergement indisponible');
        }

        console.log('✅ Image uploadée avec succès:', publicUrl);
        return publicUrl;
    } catch (error) {
        console.error('❌ Erreur lors de l\'upload de l\'image:', error.message);
        throw new Error(`Impossible d'uploader l'image: ${error.message}`);
    }
}

function convertMathSubscript(text) {
    const subscriptMap = {
        '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
        'a': 'ₐ', 'b': '♭', 'c': '𝒸', 'd': '𝒹', 'e': 'ₑ', 'f': '𝒻', 'g': 'ℊ', 'h': '𝒽', 'i': 'ᵢ', 'j': 'ⱼ',
        'k': '𝓀', 'l': '𝓁', 'm': 'ℳ', 'n': 'ₙ', 'o': 'ℴ', 'p': '𝓅', 'q': '𝓆', 'r': '𝓇', 's': '𝓈', 't': '𝓉',
        'u': '𝓊', 'v': '𝓋', 'w': '𝓌', 'x': '𝓍', 'y': '𝓎', 'z': '𝓏',
        'A': 'ᴬ', 'B': 'ᴮ', 'C': 'ᶜ', 'D': 'ᴰ', 'E': 'ᴱ', 'F': 'ᶠ', 'G': 'ᴳ', 'H': 'ᴴ', 'I': 'ᴵ', 'J': 'ᴶ',
        'K': 'ᴷ', 'L': 'ᴸ', 'M': 'ᴹ', 'N': 'ᴺ', 'O': 'ᴼ', 'P': 'ᴾ', 'Q': 'Q', 'R': 'ᴿ', 'S': 'ˢ', 'T': 'ᵀ',
        'U': 'ᵁ', 'V': 'ⱽ', 'W': 'ᵂ', 'X': 'ˣ', 'Y': 'ʸ', 'Z': 'ᶻ',
        '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾'
    };
    return text.replace(/([a-zA-Z])_([0-9a-zA-Z])/g, (match, p1, p2) => {
        return p1 + (subscriptMap[p2] || p2);
    });
}

function convertToBold(text) {
    const boldMap = {
        'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉',
        'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓',
        'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
        'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣',
        'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭',
        'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
        '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
    };
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += boldMap[text[i]] || text[i];
    }
    return result;
}

function convertCharToSubscript(char) {
    const subscriptMap = {
        '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
        'a': 'ₐ', 'b': '♭', 'c': '𝒸', 'd': '𝒹', 'e': 'ₑ', 'f': '𝒻', 'g': 'ℊ', 'h': '𝒽', 'i': 'ᵢ', 'j': 'ⱼ',
        'k': '𝓀', 'l': '𝓁', 'm': 'ℳ', 'n': 'ₙ', 'o': 'ℴ', 'p': '𝓅', 'q': '𝓆', 'r': '𝓇', 's': '𝓈', 't': '𝓉',
        'u': '𝓊', 'v': '𝓋', 'w': '𝓌', 'x': '𝓍', 'y': '𝓎', 'z': '𝓏',
        'A': 'ᴬ', 'B': 'ᴮ', 'C': 'ᶜ', 'D': 'ᴰ', 'E': 'ᴱ', 'F': 'ᶠ', 'G': 'ᴳ', 'H': 'ᴴ', 'I': 'ᴵ', 'J': 'ᴶ',
        'K': 'ᴷ', 'L': 'ᴸ', 'M': 'ᴹ', 'N': 'ᴺ', 'O': 'ᴼ', 'P': 'ᴾ', 'Q': 'Q', 'R': 'ᴿ', 'S': 'ˢ', 'T': 'ᵀ',
        'U': 'ᵁ', 'V': 'ⱽ', 'W': 'ᵂ', 'X': 'ˣ', 'Y': 'ʸ', 'Z': 'ᶻ',
        '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾'
    };
    return subscriptMap[char] || char;
}

function replaceBranding(text) {
    let result = text;
    result = result.replace(/Claude/gi, '🍟Cours mathématiques et PC Madagascar✅');
    result = result.replace(/Anthropic/gi, '👉Bruno Rakotomalala ✅');
    return result;
}

function formatText(text) {
    let formattedText = text.replace(/^#{1,6}\s+/gm, '');
    formattedText = formattedText.replace(/([a-zA-Z])\^([a-zA-Z0-9])/g, (match, p1, p2) => {
        return p1 + convertCharToSubscript(p2);
    });
    formattedText = convertMathSubscript(formattedText);
    formattedText = formattedText.replace(/\*\*([^*]+)\*\*/g, (match, p1) => {
        return convertToBold(p1);
    });
    return formattedText;
}

async function chat(prompt, uid) {
    try {
        const API_ENDPOINT = "https://rapido.zetsu.xyz/api/anthropic";
        const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
        const API_KEY = 'rapi_4806a41790cd4a83921d56b667ab3f16';

        console.log(`[CHAT] Appel API pour: "${prompt.substring(0, 50)}..."`);

        const params = {
            q: prompt,
            uid: uid,
            model: DEFAULT_MODEL,
            image: '',
            max_tokens: '',
            apikey: API_KEY
        };

        const response = await axios.get(API_ENDPOINT, {
            params: params,
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8'
            }
        });
        const result = response.data;

        console.log(`[CHAT] Réponse reçue: ${JSON.stringify(result).substring(0, 100)}`);

        if (!result || !result.response) {
            throw new Error(result?.error || 'Aucune réponse reçue de l\'API');
        }

        const formatted = replaceBranding(formatText(result.response));
        console.log(`[CHAT] Réponse formatée: "${formatted.substring(0, 50)}..."`);
        return formatted;
    } catch (error) {
        console.error('❌ Erreur chat Anthropic:', error.message);
        throw error;
    }
}

async function chatWithMultipleImages(prompt, uid, imageUrls) {
    try {
        const API_ENDPOINT = "https://rapido.zetsu.xyz/api/anthropic";
        const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
        const API_KEY = 'rapi_4806a41790cd4a83921d56b667ab3f16';

        const imageUrl = imageUrls[0];
        const finalPrompt = prompt && prompt.trim() !== "" ? prompt : "Décrivez bien cette photo";

        const params = {
            q: finalPrompt,
            uid: uid,
            model: DEFAULT_MODEL,
            image: imageUrl,
            max_tokens: '',
            apikey: API_KEY
        };

        const response = await axios.get(API_ENDPOINT, {
            params: params,
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8'
            }
        });
        const result = response.data;

        if (!result || !result.response) {
            throw new Error(result?.error || 'Aucune réponse reçue de l\'API');
        }

        return replaceBranding(formatText(result.response));
    } catch (error) {
        console.error('❌ Erreur chat avec images Anthropic:', error.message);
        throw error;
    }
}

function cleanLatexSyntax(text) {
    return text
        .replace(/\$\$/g, "")
        .replace(/\$/g, "")
        .replace(/\\\(|\\\\\(|\\\\\\\(/g, "")
        .replace(/\\\)|\\\\\)|\\\\\\\)/g, "")
        .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2")
        .replace(/\\implies/g, "=>")
        .replace(/\\boxed\{([^{}]+)\}/g, "[$1]")
        .replace(/\\quad/g, " ")
        .replace(/\\cdot/g, "×")
        .replace(/\\times/g, "×")
        .replace(/\\div/g, "÷")
        .replace(/\\text\{([^{}]+)\}/g, "$1")
        .replace(/\\equiv[^\\]*\\pmod\{([^{}]+)\}/g, "≡ (mod $1)")
        .replace(/\\[a-zA-Z]+/g, "")
        .replace(/\\\\/g, "")
        .replace(/\{|\}/g, "");
}

function sendLongMessage(api, threadID, message) {
    return new Promise((resolve) => {
        const MAX_MESSAGE_LENGTH = 2000;

        if (message.length <= MAX_MESSAGE_LENGTH) {
            api.sendMessage(message, threadID, () => resolve());
            return;
        }

        let startIndex = 0;
        const messages = [];

        while (startIndex < message.length) {
            let endIndex = startIndex + MAX_MESSAGE_LENGTH;

            if (endIndex < message.length) {
                const separators = ['. ', ', ', ' ', '! ', '? ', '.\n', ',\n', '!\n', '?\n', '\n\n', '\n'];
                let bestBreakPoint = -1;

                for (const separator of separators) {
                    const lastSeparator = message.lastIndexOf(separator, endIndex);
                    if (lastSeparator > startIndex && (bestBreakPoint === -1 || lastSeparator > bestBreakPoint)) {
                        bestBreakPoint = lastSeparator + separator.length;
                    }
                }

                if (bestBreakPoint !== -1) {
                    endIndex = bestBreakPoint;
                }
            } else {
                endIndex = message.length;
            }

            messages.push(message.substring(startIndex, endIndex));
            startIndex = endIndex;
        }

        let index = 0;
        const sendNext = () => {
            if (index < messages.length) {
                api.sendMessage(messages[index], threadID, () => {
                    index++;
                    setTimeout(sendNext, 300);
                });
            } else {
                resolve();
            }
        };

        sendNext();
    });
}

const pendingImages = {};
const conversationHistoryOld = {};

async function handleTextMessage(api, senderId, threadID, message) {
    try {
        console.log(`[TEXT] Début traitement: ${senderId} - "${message.substring(0, 50)}..."`);
        
        if (!conversationHistoryOld[senderId]) {
            conversationHistoryOld[senderId] = {
                messages: [],
                hasImage: false,
                imageUrl: null
            };
        }

        if (message && message.toLowerCase() === 'clear') {
            delete conversationHistoryOld[senderId];
            delete pendingImages[senderId];
            api.sendMessage("🔄 Conversation réinitialisée avec succès!", threadID);
            return;
        }

        const hasImages = pendingImages[senderId] && pendingImages[senderId].length > 0;
        if ((!message || message.trim() === '') && !hasImages && !conversationHistoryOld[senderId].hasImage) {
            api.sendMessage("✨🧠 Bonjour! Je suis ✨AMPINGA AI🌟. Comment puis-je vous aider aujourd'hui? Posez-moi n'importe quelle question ou partagez une image pour que je puisse l'analyser!", threadID);
            return;
        }

        console.log(`[TEXT] Envoi message d'attente...`);
        api.sendMessage("✨🧠 Analyse en cours... AMPINGA AI réfléchit à votre requête! ⏳💫", threadID);

        let response;
        let imageUrls = pendingImages[senderId] || (conversationHistoryOld[senderId].imageUrl ? [conversationHistoryOld[senderId].imageUrl] : null);

        console.log(`[TEXT] Appel API... (imageUrls: ${imageUrls ? imageUrls.length : 0})`);

        if (imageUrls && imageUrls.length > 0) {
            try {
                console.log('📸 Traitement avec image(s):', imageUrls.length);
                response = await chatWithMultipleImages(message || "Décrivez ces photos", senderId, imageUrls);
                conversationHistoryOld[senderId].hasImage = true;
                conversationHistoryOld[senderId].imageUrl = imageUrls[0];
            } catch (error) {
                console.error("❌ Erreur image:", error.message);
                response = `Désolé, je n'ai pas pu traiter vos images.\n\nErreur: ${error.message}`;
                delete pendingImages[senderId];
                conversationHistoryOld[senderId].imageUrl = null;
                conversationHistoryOld[senderId].hasImage = false;
            }
        } else {
            try {
                console.log('💬 Appel chat()...');
                response = await chat(message, senderId);
                console.log('💬 Réponse chat reçue!');
                conversationHistoryOld[senderId].hasImage = false;
                conversationHistoryOld[senderId].imageUrl = null;
            } catch (error) {
                console.error("❌ Erreur chat:", error.message);
                response = `Désolé, je n'ai pas pu traiter votre demande.\n\nErreur: ${error.message}`;
            }
        }

        console.log(`[TEXT] Réponse finale reçue: ${response ? response.substring(0, 50) : 'VIDE'}`);

        if (!response) {
            api.sendMessage("⚠️ Aucune réponse reçue de l'API.", threadID);
            return;
        }

        const cleanedResponse = cleanLatexSyntax(response);

        const formattedResponse = `
✅ AMPINGA D'OR AI 🇲🇬
━━━━━━━━━━━━━━

✍️ Réponse 👇

${cleanedResponse}
━━━━━━━━━━━━━━━━━━
🧠 Powered by 👉@Bruno | Ampinga AI
`;

        console.log(`[TEXT] Envoi réponse longue...`);
        await sendLongMessage(api, threadID, formattedResponse);
        console.log(`[TEXT] Réponse envoyée!`);

        if (pendingImages[senderId]) {
            delete pendingImages[senderId];
        }

    } catch (error) {
        console.error("❌ Erreur AMPINGA AI:", error.message);
        api.sendMessage(`⚠️ OUPS! ERREUR TECHNIQUE ⚠️\n\nUne erreur s'est produite. Veuillez réessayer.`, threadID);
    }
}

async function handleImageMessage(api, senderId, threadID, imageUrl) {
    try {
        api.sendMessage("⏳ Traitement de votre image en cours...", threadID);

        console.log('🖼️ Réception image pour utilisateur:', senderId);
        console.log('📍 URL originale:', imageUrl);

        let publicImageUrl;
        try {
            publicImageUrl = await uploadImageToCatbox(imageUrl);
            console.log('✅ URL publique créée:', publicImageUrl);
        } catch (uploadError) {
            console.error('❌ Erreur upload catbox:', uploadError);
            api.sendMessage("❌ Désolé, je n'ai pas pu traiter votre image. Veuillez réessayer.", threadID);
            return;
        }

        if (!pendingImages[senderId]) {
            pendingImages[senderId] = [];
        }

        pendingImages[senderId].push(publicImageUrl);

        if (!conversationHistoryOld[senderId]) {
            conversationHistoryOld[senderId] = {
                messages: [],
                hasImage: false,
                imageUrl: null
            };
        }

        conversationHistoryOld[senderId].hasImage = true;
        conversationHistoryOld[senderId].imageUrl = publicImageUrl;

        api.sendMessage(`✨📸 Parfait ! J'ai bien reçu votre photo. 

Quelle est votre question concernant cette image ? 🔍

💡 Vous pouvez me demander de :
• Décrire cette photo en détail
• Identifier des éléments spécifiques
• Analyser le contenu
• Ou toute autre question !`, threadID);

    } catch (error) {
        console.error('Erreur image:', error.message);
        api.sendMessage("❌ Une erreur s'est produite. Veuillez réessayer.", threadID);
    }
}

module.exports = {
    name: 'maj',
    execute(api, event, args) {
        const message = args.join(' ') || event.body;
        handleTextMessage(api, event.senderID, event.threadID, message);
    },
    handleTextMessage,
    handleImageMessage
};
