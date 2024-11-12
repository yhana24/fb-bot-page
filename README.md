## Step By Step Process:

## Step 1: Go to Facebook Developers
1. **Navigate to Facebook Developers:**
   - Open your web browser and go to [developers.facebook.com](https://developers.facebook.com).

2. **Create a Developer Account (if you don’t have one):**
   - If you’re new to Facebook Developers, log in with your Facebook credentials and follow the prompts to set up a developer account.

## Step 2: Create an App
1. **Create an App:**
   - Click on "My Apps" in the top-right corner.
   - Select "Create App".
   - Choose "Business" as the type of app.
   - Fill out the required details such as the app display name and contact email, then click "Create App ID".

## Step 3: Add Messenger Product
1. **Add Messenger:**
   - In the left sidebar of your app's dashboard, click on "Add Product".
   - Find "Messenger" and click on the "Set Up" button next to it.

## Step 4: Connect Your Facebook Page
1. **Generate a Page Access Token:**
   - Scroll down to the "Access Tokens" section.
   - Click on "Add or Remove Pages".
   - Follow the prompts to connect your Facebook Page.
   - Once connected, generate a Page Access Token by clicking "Generate Token". Copy this token for later use.
   
## Step 5: Set Up Webhooks
  1. **Create a web service on Render / or any hosting site**
   - Open [render.com](https://render.com)
   - Sign Up and connect by your GitHub account.
   - Click 3 dots > New > Web Service
   - Go back to Github, Fork this repo and go back to render.
   - Refresh then find the repo that you fork.
   
   **NOW FOR THE IMPORTANT PARTS**
    
   - Build command: `npm install`
   - Start command: `node main.js`
   - On Environmental Variables:
   Paste your Page Access token
   
   Key: `PAGE_ACCESS_TOKEN`
   
   Value: `<your facebook acces token>`
    
   - Then Create Web Service

   **Once it's done lets proceed to the next procedure.**
  2. **Configure the Webhooks (Messenger)**
   - In the Messenger settings, scroll to the "Webhooks" section.
   - Click on "Setup Webhooks".
   - Enter the following details:
     - **Callback URL:** `https://your_hosting.site/webhook`
     - **Verify Token:** `lorex`
   - Subscribe to the following fields:
     - `messages`
     - `messaging_optins`
     - `messaging_postbacks`
     - `feed`
   - Click "Verify and Save".

## Step 6: Add Page Subscriptions
1. **Subscribe to Page Events:**
   - Still in the Webhooks section, under "Page Subscriptions", select the page you connected earlier.
   - Ensure that `messages`, `messaging_optins`, `messaging_postbacks`, and `feed` are selected for this subscription.

## Step 7: Get Your Page Access Token
1. **Retrieve Token:**
   - Go back to the "Access Tokens" section.
   - Copy the generated Page Access Token.

   
## Step 8: Test Your Messenger Bot
1. **Test Bot Functionality:**
   - Open your connected Facebook Page.
   - Send a message to your page.

## Note:
- You're in developer mode, that means that the bot only respond to accounts that have specific roles assigned within the app. To use the bot from a different account or user, Just switch to Live Mode and now your bot is ready to go 😉

## How to switch to Live Mode?
- Find **App Mode** then switch to Live
- Follow some requirements before you can switch to Live Mode.

**(I think it's Privacy Policy and Terms of Service requires it, Just use the facebook's privacy policy and terms of Service.)**

- You're Done
