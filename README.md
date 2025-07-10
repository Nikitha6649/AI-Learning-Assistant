***Abstract****
The AI Learning Assistant is a smart, web-based classroom tool designed to support students and empower educators using the latest advancements in artificial intelligence. Built with NextJS and React for a responsive frontend, and styled with Tailwind CSS and ShadCN UI, the assistant enables students to ask questions using text, voice, or image input. At its core, the system uses Google’s Gemini AI models via the Genkit framework to provide instant, context-aware explanations and even generate diagrams or charts where needed. A key feature is the Engagement Monitor, which accesses the webcam (with user permission) and uses facial expression analysis powered by Gemini to evaluate student focus, confusion, and attention in real time. This feedback is presented to teachers as visual scores and recommendations, allowing them to adapt their teaching methods proactively. Overall, the assistant fosters a more personalized and responsive learning environment, bridging gaps between traditional teaching and modern AI capabilities.

***Steps to Use Application***
You'll need to have Node.js (which includes npm) installed on your machine.
You'll also need a Google AI API key to use the generative features. You can get one from the Google AI Studio.
Install Dependencies: Open your terminal in the project's root directory and run this command to install all the necessary packages:

npm install

Set Up Environment Variable: Create a new file named .env in the root of your project. Inside this file, add your Google AI API key like this:

GOOGLE_API_KEY=your_api_key_here

Replace your_api_key_here with your actual key.

Start the Genkit AI Server: In your first terminal window, run the following command to start the Genkit server. This will handle all the AI-related requests. Using genkit:watch will automatically restart the server when you make changes to your AI flows.

npm run genkit:watch

Start the Next.js Frontend Server: Open a second terminal window. In this new terminal, run the following command to start the main application server:

npm run dev

View Your Application: Once the Next.js server is ready, it will show a local URL, usually http://localhost:3000. Open this URL in your web browser to see and interact with your AI Learning Assistant!

You should now have both servers running, and your application will be fully functional on your local machine.
