# 🎙️ AI Voice Agent — Real-Time Gemini + Murf Falcon 🚀

A simple real-time AI voice agent built entirely using **React**, **Google Gemini**, and **Murf Falcon TTS** — with no backend server required. Everything runs directly in the browser.

This project allows users to speak to an AI agent using the microphone, convert speech to text via browser APIs, generate intelligent responses using Gemini, and hear natural voice output using Murf Falcon.

---

## 🚀 Features

- 🎤 **Real-time microphone capture**
- 🔊 **Large audio visualizer using Web Audio API**
- 🧠 **AI responses powered by Google Gemini**
- 🗣️ **Ultra-fast TTS using Murf Falcon**
- 💬 **Conversation history UI**
- 🌙 **Black themed, minimal, modern interface**
- 🎛️ **Fully client-side — no backend, no server, no deployments needed**

---

## 🛠️ Technologies Used

### **Frontend**
- React  
- JavaScript + JSX  
- Web Audio API (Visualizer)  
- Web Speech API (Speech Recognition, browser dependent)  
- CSS for styling  

### **AI Services**
- **Google Gemini API** → LLM responses  
- **Murf Falcon API** → Text-to-Speech voice output  

### **No backend required**
All API calls are made directly from the browser.

---

## 📁 Project Structure

```
/src
   App.jsx
   components/
      AudioVisualizer.jsx
      MicButton.jsx
      ChatBubble.jsx
   utils/
      gemini.js
      murf.js
      audio.js
   styles.css
index.html
package.json
README.md
```

*Note: Your actual file names may differ — this is a general overview.*

---

## 🔧 Setup & Installation

1. **Clone the project**
```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

2. **Install dependencies**
```bash
npm install
```

3. **Add your API keys**

Create a `.env` or paste directly inside your config file:

```
REACT_APP_GEMINI_API_KEY=YOUR_GEMINI_KEY
REACT_APP_MURF_API_KEY=YOUR_MURF_KEY
REACT_APP_MURF_API_URL=YOUR_MURF_ENDPOINT
```

4. **Run the project**
```bash
npm start
```

The app will start at:

👉 http://localhost:3000

---

## ▶️ How It Works (Behind the Scenes)

### 1️⃣ **Speech Input**
- User presses **Mic button**
- Browser captures mic audio
- Web Speech API converts speech → text
- Audio visualizer animates in real-time

### 2️⃣ **AI Response (Gemini)**
- Text is sent to Gemini’s API
- Gemini returns a natural language reply

### 3️⃣ **Voice Output (Murf Falcon TTS)**
- Reply is sent to Murf Falcon
- Murf generates high-quality voice audio
- Audio plays in the browser using `AudioContext`

### 4️⃣ **UI Updates**
- User + AI messages appear in chat bubbles
- Playback indicator shows speaking state

---

## 🧪 Testing the Agent

1. Open the app  
2. Allow microphone permission  
3. Press **🎤 Start Mic**  
4. Say:  
   > “Hello, how are you?”  
5. Gemini generates a reply  
6. Murf speaks it back  
7. Repeat!

---

## 💡 Tips

- Chrome gives best performance for Web Speech API  
- Use short inputs for fastest Murf response  
- If speech recognition fails, type into the text box and hit **Send**  

---

## 🙌 Credits

- **Google Gemini** for LLM intelligence  
- **Murf Falcon** for ultra-fast TTS voices  
- **React** for the UI  
- You — for building an awesome voice agent 🎉  

---

## 📢 License

MIT — free to use and modify.

---

## 🚀 Keep Building!

This is your Day-1 foundation for a complete multi-day voice agent series.  
You can now extend it with:

- custom personas  
- emotional prosody  
- tools integration  
- memory  
- multi-modal responses  
- translations  

The future of voice AI is in your hands 💛
