const axios = require('axios');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// Objet pour stocker les questions et les réponses pour chaque utilisateur
const userQuizzes = {};

// Open Trivia Database limite à ~1 requête / 5 secondes par IP.
// On garde la date du dernier appel pour ne pas se faire rate-limiter (HTTP 429).
let lastOpentdbCall = 0;
const OPENTDB_MIN_INTERVAL_MS = 5500;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Décoder les entités HTML renvoyées par opentdb (&quot;, &#039;, &amp;, ...)
function decodeHtmlEntities(text) {
    if (!text) return text;
    const named = {
        '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
        '&apos;': "'", '&#039;': "'", '&nbsp;': ' ', '&ndash;': '–',
        '&mdash;': '—', '&hellip;': '…', '&rsquo;': '’', '&lsquo;': '‘',
    };
    let decoded = text.replace(/&(amp|lt|gt|quot|apos|nbsp|ndash|mdash|hellip|rsquo|lsquo|#039);/gi, (m) => named[m.toLowerCase()] || m);
    decoded = decoded.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
    decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
    return decoded;
}

// Récupérer une question de quiz : opentdb d'abord (avec backoff), API de secours sinon.
async function fetchQuizQuestion() {
    // Source 1 : Open Trivia Database
    if (Date.now() - lastOpentdbCall >= OPENTDB_MIN_INTERVAL_MS) {
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            lastOpentdbCall = Date.now();
            try {
                const response = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple', {
                    timeout: REQUEST_TIMEOUT_MS,
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; QuizBot/1.0)' },
                });
                if (response.data && response.data.response_code === 0 && response.data.results && response.data.results[0]) {
                    const q = response.data.results[0];
                    return {
                        question: decodeHtmlEntities(q.question),
                        correctAnswer: decodeHtmlEntities(q.correct_answer),
                        incorrectAnswers: (q.incorrect_answers || []).map(decodeHtmlEntities),
                    };
                }
                console.error('opentdb rate-limité (response_code:', response.data.response_code, ')');
            } catch (error) {
                console.error('Erreur opentdb (tentative', attempt + 1, '):', error.message, error.response ? 'HTTP ' + error.response.status : '');
            }
            if (attempt < MAX_RETRIES) await sleep(3000 + attempt * 2000); // 3s puis 5s
        }
    }

    // Source 2 (secours) : The Trivia API — gratuite, sans clé, sans rate-limit agressif
    try {
        const response = await axios.get('https://the-trivia-api.com/v2/questions?limit=1', {
            timeout: REQUEST_TIMEOUT_MS,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; QuizBot/1.0)' },
        });
        const q = response.data && response.data[0];
        if (q && q.question && q.question.text) {
            return {
                question: q.question.text,
                correctAnswer: q.correctAnswer,
                incorrectAnswers: q.incorrectAnswers || [],
            };
        }
    } catch (error) {
        console.error('Erreur API de secours quiz:', error.message);
    }

    return null;
}

module.exports = {
    name: 'quiz',
    description: 'Poser une question de quiz aléatoire et vérifier la réponse.',
    async execute(api, event, args) {
        const senderId = event.senderID;
        const prompt = args.join(' ').trim();

        try {
            if (userQuizzes[senderId]) {
                const userAnswer = prompt;
                const correctAnswer = userQuizzes[senderId].correctAnswer;
                const shuffledAnswers = userQuizzes[senderId].shuffledAnswers;

                const userAnswerIndex = parseInt(userAnswer, 10) - 1;

                if (!isNaN(userAnswerIndex) && shuffledAnswers[userAnswerIndex] === correctAnswer) {
                    api.sendMessage("🎉 Réponse correcte !", event.threadID, event.messageID);
                } else if (!isNaN(userAnswerIndex) && shuffledAnswers[userAnswerIndex]) {
                    api.sendMessage(`❌ Réponse incorrecte. La bonne réponse est : ${correctAnswer}.`, event.threadID, event.messageID);
                } else {
                    api.sendMessage("Veuillez répondre avec le numéro de la bonne réponse (1, 2, 3 ou 4).", event.threadID, event.messageID);
                    return;
                }
                return await askNewQuestion(api, event);
            }
            return await askNewQuestion(api, event);
        } catch (error) {
            console.error("Erreur lors de l'appel à l'API de quiz:", error);
            api.sendMessage("Désolé, une erreur s'est produite lors du traitement de votre message.", event.threadID, event.messageID);
        }
    }
};

async function askNewQuestion(api, event) {
    const quizData = await fetchQuizQuestion();
    if (!quizData) {
        api.sendMessage("😕 Je n'arrive pas à récupérer une question de quiz pour le moment. Réessayez dans quelques secondes.", event.threadID, event.messageID);
        return;
    }

    const { question, correctAnswer, incorrectAnswers } = quizData;

    const allAnswers = [correctAnswer, ...incorrectAnswers];
    const shuffledAnswers = allAnswers.sort(() => Math.random() - 0.5);

    const translatedQuestion = await translateTextWithLimit(question, 'en', 'fr');
    const translatedAnswers = await Promise.all(shuffledAnswers.map(answer => translateTextWithLimit(answer, 'en', 'fr')));
    const translatedCorrectAnswer = await translateTextWithLimit(correctAnswer, 'en', 'fr');

    userQuizzes[event.senderID] = {
        question: translatedQuestion,
        correctAnswer: translatedCorrectAnswer,
        shuffledAnswers: translatedAnswers,
    };

    const formattedAnswers = translatedAnswers.map((answer, index) => `${index + 1}. ${answer}`).join('\n');

    await sleep(1000);

    api.sendMessage(`Voici votre question de quiz :\n${translatedQuestion}\n\nChoisissez une réponse :\n${formattedAnswers}`, event.threadID, event.messageID);
}

function splitTextIntoChunks(text, maxLength = 500) {
    const chunks = [];
    for (let i = 0; i < text.length; i += maxLength) {
        chunks.push(text.slice(i, i + maxLength));
    }
    return chunks;
}

async function translateTextWithLimit(text, fromLang, toLang) {
    const chunks = splitTextIntoChunks(text, 500);
    const translatedChunks = await Promise.all(chunks.map(async (chunk) => {
        try {
            const translateUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${fromLang}|${toLang}`;
            const response = await axios.get(translateUrl, { timeout: REQUEST_TIMEOUT_MS });
            const translated = response.data && response.data.responseData && response.data.responseData.translatedText;
            if (!translated || /MYMEMORY WARNING|QUOTA|LIMIT|INVALID/i.test(translated)) {
                return chunk;
            }
            return translated;
        } catch (error) {
            return chunk;
        }
    }));
    return translatedChunks.join(' ');
}
