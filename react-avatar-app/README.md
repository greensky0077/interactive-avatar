# Streaming Avatar React Application

A modern React application built with Vite, TypeScript, and shadcn/ui that provides a user interface for interacting with the Streaming Avatar backend.

## 🚀 Features

- **Persona Management**
  - View and update persona details
  - Configure persona settings
  - Manage persona's technical and personality traits

- **HeyGen Integration**
  - Create and manage avatar streaming sessions
  - Real-time avatar interaction
  - WebRTC-based video streaming
  - Text-to-speech capabilities

- **AI Chat Integration**
  - Interactive chat with persona-based responses
  - Gemini AI-powered conversations
  - Context-aware responses

- **UI Features**
  - Modern, responsive design
  - Real-time video display
  - Session management controls
  - Background removal toggle
  - Dark/Light mode support

## 🛠️ Tech Stack

### Frontend
- React 19 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- shadcn/ui for components
- WebRTC for video streaming

### Backend Integration
- Express.js server
- HeyGen API for avatar streaming
- Gemini AI for chat responses

## 📋 Prerequisites

Before you begin, ensure you have:
- Node.js (v18 or higher)
- npm (v9 or higher)
- HeyGen API credentials
- Gemini AI API key

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd react-avatar-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with:
```env
VITE_API_URL=http://localhost:3000
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
The application will be available at `http://localhost:5173`

### Production Build
```bash
npm run build
npm run preview
```

## 📝 Available Scripts

- `npm run dev` - Start the Vite development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🔌 API Integration

The application integrates with the following backend endpoints:

### Persona Management
- `GET /persona` - Get current persona details
- `POST /persona` - Update persona details
- `GET /persona/config` - Get persona configuration
- `POST /persona/update` - Update persona configuration

### HeyGen Integration
- `POST /persona/heygen/init` - Initialize HeyGen bot
- `POST /persona/heygen/session/create` - Create streaming session
- `POST /persona/heygen/session/start` - Start streaming session
- `POST /persona/heygen/text` - Send text to avatar
- `POST /persona/heygen/ice` - Handle WebRTC ICE candidate
- `POST /persona/heygen/session/stop` - Stop streaming session

### Chat Integration
- `POST /openai` - Initialize chat bot
- `POST /openai/complete` - Get chat response

## 📁 Project Structure

```
react-avatar-app/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page components
│   ├── services/      # API service functions
│   ├── utils/         # Utility functions
│   ├── hooks/         # Custom React hooks
│   ├── types/         # TypeScript type definitions
│   ├── styles/        # Global styles
│   └── App.tsx        # Main application component
├── public/            # Static assets
└── package.json       # Project dependencies
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Thanks to all contributors who have helped shape this project
