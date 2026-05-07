# Smart Bank Assistant

An AI-powered banking dashboard and chatbot with voice recognition, financial insights, and fraud detection.

## 🚀 How to Run

Follow these steps to set up and run the application locally:

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Data
The app uses a realistic banking dataset. Run the seed script to generate 100+ customers and 1000+ transactions:
```bash
npm run seed
```

### 3. Run Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

## 🎤 Voice Features
- **Voice Mode**: Switch the toggle in the top bar to "Voice".
- **Interaction**: Tap the microphone icon, speak your query (e.g., "What's my balance?"), and the bot will reply with voice.
- **Microphone Permissions**: Ensure you allow microphone access in your browser.

## 🛠️ Tech Stack
- **Frontend**: React, Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend**: Express.js (serving API and Vite middleware).
- **AI**: Gemini 2.0 (Google Generative AI).
- **Data**: CSV-based storage for easy local management.

## 📁 Project Structure
- `/src`: React frontend components and logic.
- `/server.ts`: Express backend and AI integration.
- `/data`: CSV datasets for banking records.
- `/scripts`: Data generation utilities.
