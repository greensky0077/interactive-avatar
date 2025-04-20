# Streaming Avatar FullStack Application

A modern full-stack application that combines a React frontend with an Express backend to create an interactive avatar streaming experience. This project was developed as part of a hackathon by Team "Bit by Bit".

## 👥 Team "Bit by Bit"

Our team consists of talented developers working on different aspects of our hackathon project:

- **Abarna Dutta** (Team Leader) - Custom avatar generation and voice cloning
- **Debraj Roy** - Meeting automation and scheduling system
- **Soham Pal** - Custom avatar generation and voice cloning
- **Surya Ghosh** - Streaming Avatar (this project) - Full-stack development of the avatar streaming platform, including:
  - Frontend development with React and TypeScript
  - Backend API development with Express.js
  - HeyGen integration for avatar streaming
  - Gemini AI integration for chat functionality
  - Persona management system

## �� Features

- Modern React frontend built with Vite
- Express.js backend server
- Real-time avatar streaming capabilities
- Responsive UI with Tailwind CSS
- TypeScript support for type safety
- Modern UI components with shadcn/ui

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- npm (v9 or higher)
- Git

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd Streaming_Avatar_FullStack
```

2. Install frontend dependencies:
```bash
cd react-avatar-app
npm install
```

3. Install backend dependencies:
```bash
cd ../server
npm install
```

## 🚀 Running the Application

### Development Mode

1. Start the backend server:
```bash
cd server
npm run dev
```

2. Start the frontend development server:
```bash
cd react-avatar-app
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000 (or your configured port)

### Production Build

1. Build the frontend:
```bash
cd react-avatar-app
npm run build
```

2. Start the production server:
```bash
cd server
npm start
```

## 📁 Project Structure

```
Streaming_Avatar_FullStack/
├── react-avatar-app/     # Frontend React application
│   ├── src/             # Source files
│   ├── public/          # Static assets
│   └── package.json     # Frontend dependencies
└── server/              # Backend Express server
    ├── server.js        # Main server file
    └── package.json     # Backend dependencies
```

## 🛠️ Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- ESLint & Prettier

### Backend
- Express.js
- Node.js
- CORS
- dotenv

## 📝 Scripts

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Backend
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🔒 Environment Variables

Create a `.env` file in the server directory with the following variables:
```
PORT=3000
# Add other environment variables as needed
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

- Surya Ghosh - Initial work

## 🙏 Acknowledgments

- Thanks to all contributors who have helped shape this project 
