const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const resetChatBtn = document.getElementById('reset-chat');

const defaultAssistantMessage = "Hello! I am here to help, ask me your questions!";

function addMessage(text, isUser = false, isTyping = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(isUser ? 'user-message' : 'assistant-message');
    if (isTyping) messageDiv.dataset.typing = 'true';
    
    const p = document.createElement('p');
    p.textContent = text;
    messageDiv.appendChild(p);
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll automatique vers le bas
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

async function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
        const questionNumber =
            window.quizSession?.getCurrentQuestionNumber?.() ?? null;

        // Ajouter le message de l'utilisateur
        addMessage(message, true);
        chatInput.value = '';
        sendBtn.disabled = true;

        // Placeholder "typing"
        const typingMessage = addMessage("...", false, true);
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            if (!response.ok) {
                throw new Error('Erreur serveur');
            }
            const data = await response.json();
            const reply = data.reply || "Je n'ai pas de reponse pour le moment.";
            typingMessage.querySelector('p').textContent = reply;
            typingMessage.removeAttribute('data-typing');
            if (window.quizSession?.recordAiInteraction) {
                window.quizSession.recordAiInteraction(message, reply, questionNumber);
            }
        } catch (error) {
            typingMessage.querySelector('p').textContent =
                "Desole, une erreur est survenue. Reessaie dans un instant.";
            typingMessage.removeAttribute('data-typing');
        } finally {
            sendBtn.disabled = false;
        }
    }
}

function resetChat() {
    chatMessages.innerHTML = '';
    addMessage(defaultAssistantMessage);
    chatInput.value = '';
}

sendBtn.addEventListener('click', sendMessage);

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

resetChatBtn.addEventListener('click', () => {
    resetChat();
});

window.quizChat = {
    resetChat,
};
