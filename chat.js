const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const resetChatBtn = document.getElementById('reset-chat');

const defaultAssistantMessage = "Hello! I am here to help, ask me your questions!";
let chatHistory = [];

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
                body: JSON.stringify({ message, history: chatHistory })
            });
            if (!response.ok) {
                const errorPayload = await response.json().catch(() => ({}));
                const serverError = errorPayload.error || `HTTP ${response.status}`;
                throw new Error(serverError);
            }
            const data = await response.json();
            const reply = data.reply || "Je n'ai pas de reponse pour le moment.";
            const usage = data.usage || null;
            typingMessage.querySelector('p').textContent = reply;
            typingMessage.removeAttribute('data-typing');
            chatHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: reply }
            );
            if (window.quizSession?.recordAiInteraction) {
                window.quizSession.recordAiInteraction(message, reply, questionNumber, usage);
            }
        } catch (error) {
            typingMessage.querySelector('p').textContent =
                `Desole, une erreur est survenue: ${error.message}.`;
            typingMessage.removeAttribute('data-typing');
        } finally {
            sendBtn.disabled = false;
        }
    }
}

function resetChat() {
    chatMessages.innerHTML = '';
    chatHistory = [];
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
