// Module pour envoyer des messages via ws3-fca
// Sera injecté via l'API du bot
let apiInstance = null;

function setAPI(api) {
    apiInstance = api;
}

function sendMessage(threadID, message) {
    return new Promise((resolve, reject) => {
        if (!apiInstance) {
            reject(new Error('API not initialized'));
            return;
        }
        apiInstance.sendMessage(message, threadID, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

module.exports = sendMessage;
module.exports.setAPI = setAPI;
