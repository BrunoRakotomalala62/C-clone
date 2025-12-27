const axios = require('axios');
const conversationHistory = new Map();

// Fonction pour convertir uniquement les notations mathématiques avec underscore en subscript Unicode
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

// Fonction pour convertir un caractère en subscript
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

// Fonction pour convertir en gras Unicode
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
        const char = text[i];
        result += boldMap[char] || char;
    }
    return result;
}

// Fonction pour remplacer les mentions de Claude et Anthropic
function replaceBranding(text) {
    let result = text;
    result = result.replace(/Claude/gi, '🍟Cours mathématiques et PC Madagascar✅');
    result = result.replace(/Anthropic/gi, '👉Bruno Rakotomalala ✅');
    return result;
}

// Fonction pour formater le texte avec gras et subscript
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

// Fonction pour le chat simple
async function chat(prompt, uid) {
    try {
        const API_ENDPOINT = "https://rapido.zetsu.xyz/api/anthropic";
        const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
        const API_KEY = 'rapi_4806a41790cd4a83921d56b667ab3f16';

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

        if (!result || !result.response) {
            throw new Error(result?.error || 'Aucune réponse reçue de l\'API');
        }

        return replaceBranding(formatText(result.response));
    } catch (error) {
        console.error('❌ Erreur chat Anthropic:', error.message);
        throw error;
    }
}

// Fonction pour nettoyer la syntaxe LaTeX
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

// Fonction pour envoyer des messages longs en plusieurs parties
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

        // Envoyer les messages séquentiellement
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

module.exports = {
    name: 'maj',
    description: 'Réponse automatique avec Anthropic Claude',
    execute(api, event, args) {
        const message = args.join(' ') || event.body;
        const senderId = event.senderID;
        const threadID = event.threadID;

        console.log(`[MAJ] Message reçu: "${message}"`);

        // Appel asynchrone sans await
        chat(message, senderId)
            .then(response => {
                console.log(`[MAJ] Réponse reçue: ${response.substring(0, 100)}...`);
                
                // Nettoyer la réponse
                const cleanedResponse = cleanLatexSyntax(response);

                // Formater la réponse
                const formattedResponse = `
✅ AMPINGA D'OR AI 🇲🇬
━━━━━━━━━━━━━━

✍️ Réponse 👇

${cleanedResponse}
━━━━━━━━━━━━━━━━━━
🧠 Powered by 👉@Bruno | Ampinga AI
`;

                // Envoyer la réponse
                sendLongMessage(api, threadID, formattedResponse);
            })
            .catch(error => {
                console.error(`[MAJ] Erreur: ${error.message}`);
                api.sendMessage(`⚠️ Erreur API: ${error.message}`, threadID);
            });
    }
};
