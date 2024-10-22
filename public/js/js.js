const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const fileInput = document.getElementById('file-input');
const sendButton = document.getElementById('send-button');

// Fonction pour afficher les messages
function displayMessage(message, type) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    if (type === 'text') {
        messageElement.textContent = message;
    } else {
        const mediaElement = document.createElement(type);
        mediaElement.src = URL.createObjectURL(message);
        mediaElement.controls = true;
        messageElement.appendChild(mediaElement);
    }

    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Défilement vers le bas
}

// Gérer l'envoi de messages
sendButton.addEventListener('click', () => {
    const messageText = messageInput.value;
    
    if (messageText) {
        displayMessage(messageText, 'text');
        messageInput.value = '';
    }

    const file = fileInput.files[0];
    if (file) {
        displayMessage(file, file.type.startsWith('audio/') ? 'audio' : (file.type.startsWith('video/') ? 'video' : 'image'));
        fileInput.value = ''; // Réinitialiser le champ de fichier
    }
});
