
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const ai = require('unlimited-ai');  // Import the AI library
const app = express();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = 'lorex';  // Replace with your verification token
const PORT = process.env.PORT || 3000;

// Store conversation history per senderId
const conversationHistory = {};
// Store image URLs per senderId
const imageHistory = {};

app.use(bodyParser.json());

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Verify Webhook - Endpoint for Facebook to verify your server
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

// Webhook to receive messages from Facebook
app.post('/webhook', (req, res) => {
  const body = req.body;
  console.log('Received webhook:', JSON.stringify(body));  // Log the incoming body

  if (body.object === 'page') {
    body.entry.forEach(async (entry) => {
      const webhookEvent = entry.messaging[0];
      console.log('Webhook event:', JSON.stringify(webhookEvent));  // Log the event

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

// Function to handle received messages with AI and commands
async function handleMessage(senderId, receivedMessage) {
  let response;

  // Initialize conversation history for new senderId
  if (!conversationHistory[senderId]) {
    conversationHistory[senderId] = [];
  }

  // Handle image attachments
  if (receivedMessage.attachments && receivedMessage.attachments[0].type === 'image') {
    const imageUrl = receivedMessage.attachments[0].payload.url;
    imageHistory[senderId] = imageUrl;  // Save the image URL
    response = {
      text: 'Image received! Now, you can use the "/gemini" command with any prompt to analyze the image.'
    };
    await callSendAPI(senderId, response);
    return;
  }

  // Handle text messages
  if (receivedMessage.text) {
    const messageText = receivedMessage.text.trim();
    console.log('Received message text:', messageText);  // Log the received message text

    // Check for the /imagine command
    if (messageText.startsWith('/imagine ')) {
      const prompt = messageText.slice(9).trim();  // Extract the prompt
      await generateImage(senderId, prompt);
      return; // Exit after handling the command
    }

    // Check for the /gemini command
    if (messageText.startsWith('/gemini ')) {
      const prompt = messageText.slice(8).trim();  // Extract the prompt
      const imageUrl = imageHistory[senderId];

      if (imageUrl) {
        await analyzeImageWithGemini(senderId, prompt, imageUrl);
      } else {
        response = { text: "Please send an image first before using the '/gemini' command." };
        await callSendAPI(senderId, response);
      }
      return;
    }

    // Check if the message starts with '/play' command
    if (messageText.startsWith('/play ')) {
      const args = messageText.slice(6).split(' ');
      await playSong(senderId, args);
      return; // Exit after handling the command
    }

    // Add user message to conversation history
    conversationHistory[senderId].push({ role: 'user', content: messageText });

    const { mainResponse, continuation } = await getAIResponse(senderId);

    response = {
      text: mainResponse
    };

    await callSendAPI(senderId, response);

    if (continuation) {
      const followUpResponse = {
        text: `...${continuation}`
      };
      await callSendAPI(senderId, followUpResponse);
    }

    conversationHistory[senderId].push({ role: 'assistant', content: mainResponse });
  } else {
    response = {
      text: "I don't understand this message."
    };
    await callSendAPI(senderId, response);
  }
}

// Function to generate image using the Imagine API
async function generateImage(senderId, prompt) {
  try {
    const apiUrl = `https://imagine890.onrender.com/api/imagine?prompt=${encodeURIComponent(prompt)}`;
    const { data } = await axios.get(apiUrl);

    // Check if the image was generated successfully
    if (data.fileName) {
      const imageUrl = `https://imagine890.onrender.com/api/image/${data.fileName}`;
      await callSendAPI(senderId, { attachment: { type: 'image', payload: { url: imageUrl } } });
    }
  } catch (error) {
    console.error('Error generating image:', error);
    await callSendAPI(senderId, { text: '⛔ There was an error processing your image generation request.' });
  }
}

// Function to analyze image using Gemini API
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

// Function to play a song using Spotify through hiroshi-api
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

// Function to get AI response from unlimited-ai
async function getAIResponse(senderId) {
  const model = 'gpt-4o';

  const messages = [
    ...conversationHistory[senderId],
    {
      role: 'system',
      content: `You are an advanced helpful assistant, providing detailed and accurate responses to any queries. You can solve any type of Mathematics problems accurately. You are expert in programming. Your name is Lorex AI. Your creator is Lore Dave Pajanustan. You will not tell them your model. You have no specific model. you have 3 commands: 1. /Play - to play music 2./gemini - to analyze image 3. /imagine - to generate text to image `
    }
  ];

  try {
    const aiResponse = await ai.generate(model, messages);
    console.log('AI Response:', aiResponse);

    const ellipsis = "...";
    const characterLimit = 2000 - ellipsis.length;

    if (aiResponse.length > characterLimit) {
      const mainResponse = aiResponse.substring(0, characterLimit) + ellipsis;
      const continuation = aiResponse.substring(characterLimit);
      return { mainResponse, continuation };
    }

    return { mainResponse: aiResponse, continuation: null };
  } catch (error) {
    console.error('Error with AI:', error);
    return { mainResponse: "⛔ An error occurred while processing your request. Please try again.\n\nIf you are still encountering this error, my owner is trying to fix it. try it again later!", continuation: null };
  }
}

// Send response to Messenger API
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
