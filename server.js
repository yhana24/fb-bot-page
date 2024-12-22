const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const { GPTx } = require('@ruingl/gptx');
const app = express();

const gptx = new GPTx({
    provider: 'Nextway',
    model: 'gpt-4o-free'
});

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = 'EAA3n9jZBXzhUBO0X8LnWZAbJHLXkoj4T2uYlJRY1lsFGQg99u0ZBpBi2VTiKV7Yo24c6HxZBKTSfSM3E75ZAyHlDXYCW0nWuixZCER557i3uLjqG2j4ff4JragXHdzrYZAIV7oI9DjOmjI7JZBJGLoGUTBsbcuVyBq7EuTXGaNZCRsmHBaKkxfQ4sTDt8IoxCW51m3QZDZD';
const PORT = process.env.PORT || 3000;

const conversationHistory = {};
const imageHistory = {};

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

app.post('/webhook', (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(async (entry) => {
            const webhookEvent = entry.messaging[0];

            const senderId = webhookEvent.sender.id;

            if (webhookEvent.message) {
                await handleMessage(senderId, webhookEvent.message);
            }
        });

        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

async function handleMessage(senderId, receivedMessage) {
    if (!conversationHistory[senderId]) {
        conversationHistory[senderId] = [
            {
                role: 'system',
                content: 'assistant'
            }
        ];
    }

    if (receivedMessage.attachments && receivedMessage.attachments[0].type === 'image') {
        const imageUrl = receivedMessage.attachments[0].payload.url;
        imageHistory[senderId] = imageUrl;
        const response = {
            text: 'Image received! Now, you can use the "/gemini" command with any prompt to analyze the image.'
        };
        await callSendAPI(senderId, response);
        return;
    }

    if (receivedMessage.text) {
        const messageText = receivedMessage.text.trim();

        if (messageText.startsWith('/imagine ')) {
            const prompt = messageText.slice(9).trim();
            await generateImage(senderId, prompt);
            return;
        }

        if (messageText.startsWith('/gemini ')) {
            const prompt = messageText.slice(8).trim();
            const imageUrl = imageHistory[senderId];
            if (imageUrl) {
                await analyzeImageWithGemini(senderId, prompt, imageUrl);
            } else {
                const response = { text: "Please send an image first before using the '/gemini' command." };
                await callSendAPI(senderId, response);
            }
            return;
        }

        if (messageText.startsWith('/play ')) {
            const args = messageText.slice(6).trim().split(' ');
            await playSong(senderId, args);
            return;
        }

        conversationHistory[senderId].push({ role: 'user', content: messageText });

        try {
            const response = await gptx.ChatCompletion(conversationHistory[senderId]);

            if (!response || response.trim() === '') {
                const errorResponse = "Sorry, I didn't quite catch that. Could you please try asking again?";
                await callSendAPI(senderId, { text: errorResponse });
                return;
            }

            conversationHistory[senderId].push({ role: 'assistant', content: response });
            await callSendAPI(senderId, { text: response });
        } catch (error) {
            console.error('Error with GPTx:', error.message);
            const response = { text: "⛔ An error occurred while processing your request. Please try again." };
            await callSendAPI(senderId, response);
        }
    } else {
        const response = {
            text: "I don't understand this message."
        };
        await callSendAPI(senderId, response);
    }
}

async function generateImage(senderId, prompt) {
    try {
        const apiUrl = `https://imagine890.onrender.com/api/imagine?prompt=${encodeURIComponent(prompt)}`;
        const { data } = await axios.get(apiUrl);

        if (data.fileName) {
            const imageUrl = `https://imagine890.onrender.com/api/image/${data.fileName}`;
            await callSendAPI(senderId, { attachment: { type: 'image', payload: { url: imageUrl } } });
        } else {
            await callSendAPI(senderId, { text: '⛔ Image generation failed.' });
        }
    } catch (error) {
        console.error('Error generating image:', error);
        await callSendAPI(senderId, { text: '⛔ There was an error processing your image generation request.' });
    }
}

async function analyzeImageWithGemini(senderId, prompt, imageUrl) {
    try {
        const apiUrl = `https://joshweb.click/gemini?prompt=${encodeURIComponent(prompt)}&url=${encodeURIComponent(imageUrl)}`;
        const { data } = await axios.get(apiUrl);

        if (data && data.gemini) {
            await callSendAPI(senderId, { text: data.gemini });
        } else {
            await callSendAPI(senderId, { text: "Sorry, I couldn't retrieve information for this image." });
        }
    } catch (error) {
        console.error('Error with Gemini API:', error);
        await callSendAPI(senderId, { text: '⛔ There was an error processing your image analysis request.' });
    }
}

async function playSong(senderId, args) {
    try {
        const { data } = await axios.get(`https://hiroshi-api.onrender.com/tiktok/spotify?search=${encodeURIComponent(args.join(' '))}`);
        const link = data[0]?.download;

        if (link) {
            await callSendAPI(senderId, {
                attachment: {
                    type: 'audio',
                    payload: { url: link, is_reusable: true }
                }
            });
        } else {
            await callSendAPI(senderId, {
                text: 'Sorry, no Spotify link found for that query.'
            });
        }
    } catch (error) {
        console.error('Error playing song:', error);
        await callSendAPI(senderId, {
            text: '⛔ Sorry, there was an error processing your request.'
        });
    }
}

async function callSendAPI(senderId, response) {
    const requestBody = {
        recipient: { id: senderId },
        message: response
    };

    try {
        await axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, requestBody);
        console.log('Message sent!');
    } catch (err) {
        console.error('Unable to send message:', err);
    }
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
