import { useState, useEffect, useRef } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { useVoiceActivityDetection } from "./hooks/useVoiceActivityDetection";
import { speechService } from "./services/speechService";
import { useApiErrorHandler } from "./hooks/useApiErrorHandler";
import "./App.css";

interface PersonaConfig {
  name: string;
  title: string;
  education: {
    degree: string;
    year: string;
    institution: string;
  };
  traits: string[];
  technical: {
    languages: string[];
    webStack: string[];
    projects: string[];
  };
  personality: {
    style: string;
    interests: string[];
    goals: string[];
  };
}

// Backend API base URL (configurable via Vite env)
// Define VITE_SERVER_URL in .env or deployment environment
// Default to same-origin for deployments like Vercel where API lives under /api
const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string) || "";
function App() {
  const { handleApiError, handleSuccess, handleWarning, handleInfo } = useApiErrorHandler();
  
  const [personaConfig, setPersonaConfig] = useState<PersonaConfig>({
    name: "Surya Ghosh",
    title: "The Passionate Tech Explorer",
    education: {
      degree: "B.Tech in Electronics and Communication Engineering",
      year: "3rd Year, 6th Semester",
      institution: "Future Institute of Engineering and Management",
    },
    traits: [
      "Curious",
      "passionate",
      "disciplined",
      "hardworking",
      "socially active",
    ],
    technical: {
      languages: ["Java", "C"],
      webStack: ["React", "Next.js", "Hono.js", "Drizzle ORM", "MongoDB"],
      projects: [
        "Women Safety App (gender classification + SMS alerts)",
        "CloneX – AI-powered digital human clone",
        "Obstacle Avoiding Robot",
        "Firefighting Robot with separate sensing unit",
        "ReelsPro – Media sharing Next.js app",
        "Astro.js based documentation site with login and backend",
        "Chat + Music Sync App",
      ],
    },
    personality: {
      style:
        "Goal-oriented, practical, and project-driven learner with a love for real-world applications",
      interests: [
        "Artificial Intelligence & Deep Learning",
        "Robotics",
        "Full Stack Web Development",
        "Hackathons & Competitive Coding",
        "Building tech for social good",
      ],
      goals: [
        "Revise and strengthen DSA, Java, and C fundamentals",
        "Build a successful hackathon project (April 12–13)",
        "Contribute daily to research work",
        "Maintain consistency despite distractions",
        "Balance academics, project work, and personal life",
      ],
    },
  });

  // State variables
  const [showPersonaForm, setShowPersonaForm] = useState(false);
  const [avatarID, setAvatarID] = useState("Katya_ProfessionalLook2_public");
  const [voiceID, setVoiceID] = useState("a04d81d19afd436db611060682276331");
  const [message, setMessage] = useState("Hello, how are you today?");
  const [status, setStatus] = useState("Ready");
  const [showVideo, setShowVideo] = useState(true);
  const [removeBG, setRemoveBG] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null);
  const [botInitialized, setBotInitialized] = useState(false);
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  
  // PDF and VAD states
  const [uploadedPDFs, setUploadedPDFs] = useState<any[]>([]);
  const [selectedPDF, setSelectedPDF] = useState<string>("");
  const [pdfQuery, setPdfQuery] = useState<string>("");
  const [pdfResults, setPdfResults] = useState<any[]>([]);
  const [ragAnswer, setRagAnswer] = useState<string>("");
  const [isVADEnabled, setIsVADEnabled] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState<string>("");
  const [speechLang, setSpeechLang] = useState<string>("en-US");
  const [isHoldTalking, setIsHoldTalking] = useState<boolean>(false);
  type TranscriptRole = 'user' | 'bot';
  interface TranscriptEntry { role: TranscriptRole; text: string; source?: 'ai' | 'rag' | 'manual'; time: number }
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const addTranscript = (role: TranscriptRole, text: string, source?: 'ai' | 'rag' | 'manual') => {
    if (!text) return;
    setTranscript(prev => [...prev, { role, text, source, time: Date.now() }]);
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Activity Detection
  const vad = useVoiceActivityDetection({
    threshold: 0.01,
    minSilenceDuration: 1000,
    minSpeechDuration: 500,
    onSpeechStart: () => {
      addStatus("🎤 Speech detected, listening...");
    },
    onSpeechEnd: (audioBlob) => {
      addStatus("🎤 Speech ended, processing...");
      // Convert audio to text using speech recognition
      if (speechService.isSupported()) {
        speechService.startListening({
          continuous: false,
          interimResults: false,
          language: speechLang
        });
      }
    },
    onError: (error) => {
      addStatus(`VAD Error: ${error.message}`);
    }
  });

  // Preflight mic check on mount
  useEffect(() => {
    if (vad.checkMicAvailability) {
      vad.checkMicAvailability();
    }
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    name: personaConfig.name,
    title: personaConfig.title,
    degree: personaConfig.education.degree,
    year: personaConfig.education.year,
    institution: personaConfig.education.institution,
    languages: personaConfig.technical.languages.join(", "),
    webStack: personaConfig.technical.webStack.join(", "),
    projects: personaConfig.technical.projects.join("\n"),
    style: personaConfig.personality.style,
    interests: personaConfig.personality.interests.join(", "),
    goals: personaConfig.personality.goals.join("\n"),
  });

  // Add status message
  const addStatus = (message: string) => {
    setStatusMessages((prev) => [...prev, message]);
    setStatus(message);
  };

  const openVideoInNewWindow = () => {
    if (!videoRef.current) {
      addStatus("Video element not ready yet. Please start a session first.");
      return;
    }

    if (!videoRef.current.srcObject) {
      addStatus("Video stream not ready yet. Please start a session first.");
      return;
    }

    const videoWindow = window.open("", "_blank", "width=640,height=480");
    if (!videoWindow) {
      addStatus("Failed to open popup window. Please check your browser settings.");
      return;
    }

    addStatus("Opening video in new window...");

    videoWindow.document.write(`
      <html>
        <head><title>HeyGen Avatar Stream</title></head>
        <body style="margin:0; background:#000;">
          <video id="heygen-stream" autoplay muted playsinline style="width:100%; height:auto; display:block;"></video>
        </body>
      </html>
    `);

    const interval = setInterval(() => {
      const targetVideo = videoWindow.document.getElementById(
        "heygen-stream"
      ) as HTMLVideoElement;
      if (targetVideo && videoRef.current?.srcObject) {
        targetVideo.srcObject = videoRef.current.srcObject;
        clearInterval(interval);
        addStatus("Video popup opened successfully!");
      }
    }, 300);

    // Clean up interval after 10 seconds
    setTimeout(() => {
      clearInterval(interval);
    }, 10000);
  };

  // Load persona config from server
  useEffect(() => {
    const loadPersona = async () => {
      try {
        const response = await fetch(SERVER_URL + "/persona/config");
        if (response.ok) {
          const data = await response.json();
          setPersonaConfig(data);

          // Update form data
          setFormData({
            name: data.name,
            title: data.title,
            degree: data.education.degree,
            year: data.education.year,
            institution: data.education.institution,
            languages: data.technical.languages.join(", "),
            webStack: data.technical.webStack.join(", "),
            projects: data.technical.projects.join("\n"),
            style: data.personality.style,
            interests: data.personality.interests.join(", "),
            goals: data.personality.goals.join("\n"),
          });
        }
      } catch (error) {
        console.error("Failed to load persona:", error);
      }
    };

    loadPersona();
  }, []);

  // Load uploaded PDFs
  useEffect(() => {
    const loadPDFs = async () => {
      try {
        const response = await fetch(SERVER_URL + "/pdf/list");
        if (response.ok) {
          const data = await response.json();
          setUploadedPDFs(data.data.pdfs);
        }
      } catch (error) {
        console.error("Failed to load PDFs:", error);
      }
    };

    loadPDFs();
  }, []);

  // Speech recognition subscription
  useEffect(() => {
    const unsubscribe = speechService.subscribe((state) => {
      if (state.transcript) {
        setSpeechTranscript(state.transcript);
        setMessage(state.transcript);
        addStatus(`🎤 Speech recognized: ${state.transcript}`);
        addTranscript('user', state.transcript, 'manual');
      }
      if (state.error) {
        addStatus(`Speech Error: ${state.error}`);
      }
    });

    return unsubscribe;
  }, []);

  // Hold-to-Talk handlers
  const holdToTalkStart = () => {
    if (!speechService.isSupported()) {
      addStatus("Speech recognition not supported in this browser");
      return;
    }
    setIsHoldTalking(true);
    speechService.startListening({
      continuous: true,
      interimResults: false,
      language: speechLang
    });
    addStatus("🎤 Hold-to-talk: listening...");
  };

  const holdToTalkStop = () => {
    setIsHoldTalking(false);
    speechService.stopListening();
    addStatus("🛑 Hold-to-talk: stopped");
  };

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id.replace("persona", "").toLowerCase()]: value,
    });
  };

  // Update persona configuration
  const updatePersona = async () => {
    const newConfig = {
      name: formData.name,
      title: formData.title,
      education: {
        degree: formData.degree,
        year: formData.year,
        institution: formData.institution,
      },
      traits: personaConfig.traits,
      technical: {
        languages: formData.languages.split(",").map((item) => item.trim()),
        webStack: formData.webStack.split(",").map((item) => item.trim()),
        projects: formData.projects
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      },
      personality: {
        style: formData.style,
        interests: formData.interests.split(",").map((item) => item.trim()),
        goals: formData.goals
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      },
    };

    try {
      const response = await fetch(SERVER_URL+"/persona/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newConfig),
      });

      if (response.ok) {
        const data = await response.json();
        setPersonaConfig(data.data);
        setShowPersonaForm(false);
        addStatus("Persona updated successfully");
      } else {
        addStatus("Failed to update persona");
      }
    } catch (error) {
      addStatus("Error: " + (error as Error).message);
    }
  };

  // Create a new Heygen session
  const createNewSession = async () => {
    if (!avatarID) {
      handleWarning("Avatar ID Required", "Please enter a valid Avatar ID before creating a session");
      return;
    }

    addStatus("Creating new session... please wait");
    handleInfo("Creating Session", "Connecting to HeyGen API...");

    try {
      const response = await fetch(
        SERVER_URL+"/persona/heygen/session/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            avatar_name: avatarID,
            // Don't send voice_id as it's not supported by streaming avatar
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          response: {
            status: response.status,
            statusText: response.statusText,
            data: errorData
          },
          config: { url: response.url }
        };
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create session');
      }
      
      if (!data.data) {
        throw new Error('Invalid response: missing session data');
      }
      
      setSessionInfo(data.data);
      // session created
      

      // Create RTCPeerConnection
      const iceServers = data.data.ice_servers2 || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ];
      const newPeerConnection = new RTCPeerConnection({ iceServers });

      newPeerConnection.ontrack = (event) => {
        if (event.track.kind === "audio" || event.track.kind === "video") {
          if (videoRef.current) {
            videoRef.current.srcObject = event.streams[0];
          }
        }
      };

      const remoteDescription = new RTCSessionDescription(data.data.sdp);
      await newPeerConnection.setRemoteDescription(remoteDescription);

      // Wait a moment for the state to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify the state is correct
      if (newPeerConnection.signalingState !== 'have-remote-offer') {
        throw new Error(`Failed to set remote description. Current state: ${newPeerConnection.signalingState}`);
      }

      setPeerConnection(newPeerConnection);
      addStatus("Session creation completed");
      addStatus("Now you can click the start button to start the stream");
      handleSuccess("Session Created", `Successfully created session with Avatar: ${avatarID}`);
    } catch (error) {
      addStatus("Error: " + (error as Error).message);
      handleApiError(error, "HeyGen Session Creation");
    }
  };

  // Start the Heygen session
  const startSession = async () => {
    if (!sessionInfo || !peerConnection) {
      handleWarning("Session Required", "Please create a connection first");
      return;
    }

    addStatus("Starting session... please wait");
    handleInfo("Starting Session", "Initializing WebRTC connection...");

    try {
      // Check peer connection state before creating answer
      if (peerConnection.signalingState !== 'have-remote-offer') {
        addStatus(`Invalid signaling state: ${peerConnection.signalingState}. Expected: have-remote-offer`);
        handleWarning("Connection Error", "Please create a new session first");
        return;
      }

      const localDescription = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(localDescription);

      // Setup ICE handling
      peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate && sessionInfo) {
          addStatus('Sending ICE candidate...');
          handleICE(sessionInfo.session_id, candidate.toJSON()).catch(error => {
            addStatus(`ICE candidate error: ${error.message}`);
          });
        }
      };

      // Handle ICE gathering state changes
      peerConnection.onicegatheringstatechange = () => {
        addStatus(`ICE gathering state: ${peerConnection.iceGatheringState}`);
      };

      peerConnection.oniceconnectionstatechange = () => {
        addStatus(`ICE connection state: ${peerConnection.iceConnectionState}`);
        
        // Handle connection state changes
        if (peerConnection.iceConnectionState === 'disconnected') {
          addStatus('Connection lost. Attempting to restore...');
          // Try to restore connection by gathering new ICE candidates
          setTimeout(async () => {
            if (peerConnection.iceConnectionState === 'disconnected') {
              addStatus('Connection could not be restored. Attempting to reconnect...');
              try {
                // Try to restart ICE gathering
                await peerConnection.restartIce();
                addStatus('ICE restart initiated. Waiting for connection...');
              } catch (error) {
                addStatus(`ICE restart failed: ${error.message}. Please create a new session.`);
                // Reset the connection state
                setBotInitialized(false);
                setShowVideo(false);
              }
            }
          }, 2000);
        } else if (peerConnection.iceConnectionState === 'connected') {
          addStatus('Connection established!');
        } else if (peerConnection.iceConnectionState === 'failed') {
          addStatus('Connection failed. Please try creating a new session.');
        } else if (peerConnection.iceConnectionState === 'checking') {
          addStatus('Checking connection...');
        } else if (peerConnection.iceConnectionState === 'completed') {
          addStatus('Connection completed!');
        } else if (peerConnection.iceConnectionState === 'new') {
          addStatus('New connection state - ready to connect');
        } else if (peerConnection.iceConnectionState === 'gathering') {
          addStatus('Gathering ICE candidates...');
        }
      };

      // Start session
      const response = await fetch(
        SERVER_URL+"/persona/heygen/session/start",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionInfo.session_id,
            sdp: localDescription,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          response: {
            status: response.status,
            statusText: response.statusText,
            data: errorData
          },
          config: { url: response.url }
        };
      }

      // Initialize AI bot
      await initializeBot();

      // Add connection monitoring with retry logic
      let connectionRetryCount = 0;
      const maxRetries = 3;
      
      const connectionMonitor = setInterval(async () => {
        if (peerConnection.iceConnectionState === 'disconnected' || 
            peerConnection.iceConnectionState === 'failed') {
          
          if (connectionRetryCount < maxRetries) {
            connectionRetryCount++;
            addStatus(`Connection lost detected. Retry attempt ${connectionRetryCount}/${maxRetries}...`);
            
            try {
              // Try to restart ICE gathering
              await peerConnection.restartIce();
              addStatus('ICE restart initiated. Waiting for connection...');
            } catch (error) {
              addStatus(`ICE restart failed: ${error.message}`);
            }
          } else {
            addStatus('Connection lost detected. Maximum retries reached. Please create a new session.');
            clearInterval(connectionMonitor);
            setBotInitialized(false);
            setShowVideo(false);
          }
        } else if (peerConnection.iceConnectionState === 'connected') {
          // Reset retry count on successful connection
          connectionRetryCount = 0;
        }
      }, 10000); // Check every 10 seconds
      
      // Clear monitor after 5 minutes
      setTimeout(() => {
        clearInterval(connectionMonitor);
      }, 300000);

      // Set jitter buffer
      const receivers = peerConnection.getReceivers();
      receivers.forEach((receiver) => {
        if (receiver.jitterBufferTarget !== undefined) {
          receiver.jitterBufferTarget = 500;
        }
      });

      addStatus("Session started successfully");
      setShowVideo(true);
      handleSuccess("Session Started", "Avatar streaming is now active!");
    } catch (error) {
      addStatus("Error: " + (error as Error).message);
      handleApiError(error, "HeyGen Session Start");
    }
  };

  // Handle ICE candidates
  const handleICE = async (
    sessionId: string,
    candidate: RTCIceCandidateInit
  ) => {
    try {
      await fetch(SERVER_URL+"/persona/heygen/ice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          candidate,
        }),
      });
    } catch (error) {
      console.error("ICE handling error:", error);
    }
  };

  // Initialize the AI bot
  const initializeBot = async () => {
    try {
      const response = await fetch(
        SERVER_URL+"/persona/heygen/init",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            persona_name: personaConfig.name,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to initialize bot");
      }

      setBotInitialized(true);
      addStatus("Bot initialized successfully");
      return true;
    } catch (error) {
      addStatus("Error initializing bot: " + (error as Error).message);
      return false;
    }
  };

  // Send message to avatar
  const sendMessage = async () => {
    if (!message) {
      addStatus("Message is required");
      return;
    }

    if (!sessionInfo) {
      addStatus("Session not created");
      return;
    }

    addStatus(`Sending message: ${message}`);

    try {
      const response = await fetch(
        SERVER_URL+"/persona/heygen/text",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionInfo.session_id,
            text: message,
            generate_ai_response: false,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      addStatus("Message sent successfully");
      // Show what the avatar is speaking
      addTranscript('user', message, 'manual');
      addTranscript('bot', message, 'manual');
      setMessage("");
    } catch (error) {
      addStatus("Error: " + (error as Error).message);
    }
  };

  // Send message to get AI response
  const talkToBot = async () => {
    if (!message) {
      addStatus("Message is required");
      return;
    }

    if (!sessionInfo) {
      addStatus("Session not created");
      return;
    }

    addStatus(`Talking to bot: ${message}`);

    try {
      const response = await fetch(
        SERVER_URL+"/persona/heygen/text",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionInfo.session_id,
            text: message,
            generate_ai_response: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to talk to bot");
      }

      const data = await response.json();
      if (data.ai_response) {
        addStatus(`Bot response: ${data.ai_response}`);
        addTranscript('user', message, 'ai');
        addTranscript('bot', data.ai_response, 'ai');
      }
    } catch (error) {
      addStatus("Error: " + (error as Error).message);
    }
  };

  // Reset peer connection state
  const resetPeerConnection = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    setSessionInfo(null);
    setBotInitialized(false);
    setShowVideo(false);
    addStatus("Connection state reset");
  };

  const reconnectSession = async () => {
    if (!sessionInfo) {
      addStatus("No active session to reconnect to");
      return;
    }
    
    addStatus("Attempting to reconnect...");
    try {
      // Try to restart ICE gathering
      if (peerConnection) {
        await peerConnection.restartIce();
        addStatus("ICE restart initiated. Waiting for connection...");
      } else {
        addStatus("No active connection to restart. Please create a new session.");
      }
    } catch (error) {
      addStatus(`Reconnection failed: ${error.message}`);
    }
  };

  // Close the connection
  const closeConnection = async () => {
    if (!sessionInfo) {
      addStatus("No active session");
      return;
    }

    addStatus("Closing session...");

    try {
      const response = await fetch(
        SERVER_URL+"/persona/heygen/session/stop",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionInfo.session_id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to close session");
      }

      // Clean up
      if (peerConnection) {
        peerConnection.close();
      }

      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      // Reset state
      setPeerConnection(null);
      setSessionInfo(null);
      setBotInitialized(false);
      setShowVideo(false);

      addStatus("Session closed successfully");
    } catch (error) {
      addStatus("Error: " + (error as Error).message);
    }
  };

  // Toggle background removal
  const toggleBgRemoval = () => {
    setRemoveBG(!removeBG);
    if (!removeBG) {
      renderCanvas();
    } else {
      setShowVideo(true);
    }
  };

  // Render video to canvas
  const renderCanvas = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Match canvas size to video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Process video frames
    const processFrame = () => {
      if (!video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Process for background removal if enabled
        if (removeBG) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          for (let i = 0; i < data.length; i += 4) {
            const red = data[i];
            const green = data[i + 1];
            const blue = data[i + 2];

            // Simple green screen effect - adjust thresholds as needed
            if (green > 100 && red < 100 && blue < 100) {
              data[i + 3] = 0; // Set alpha to 0 (transparent)
            }
          }

          ctx.putImageData(imageData, 0, 0);
        }

        requestAnimationFrame(processFrame);
      }
    };

    // Start processing
    processFrame();
    setShowVideo(false);
  };

  // PDF Upload Functions
  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      handleWarning("Invalid File Type", "Please select a PDF file");
      return;
    }

    addStatus("Uploading PDF...");
    handleInfo("Uploading PDF", "Processing document for knowledge base...");
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await fetch(SERVER_URL + "/pdf/upload", {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          response: {
            status: response.status,
            statusText: response.statusText,
            data: errorData
          },
          config: { url: response.url }
        };
      }

      const data = await response.json();
      addStatus(`PDF uploaded successfully: ${data.data.filename}`);
      setUploadedPDFs(prev => [...prev, { filename: data.data.filename, uploadDate: new Date() }]);
      handleSuccess("PDF Uploaded", `Successfully uploaded and processed: ${data.data.filename}`);
    } catch (error) {
      addStatus(`Error uploading PDF: ${error}`);
      handleApiError(error, "PDF Upload");
    }
  };

  const searchPDF = async () => {
    if (!selectedPDF || !pdfQuery) {
      handleWarning("Search Parameters Required", "Please select a PDF and enter a query");
      return;
    }

    addStatus("Searching PDF...");
    handleInfo("Searching PDF", "Looking for relevant content in your document...");
    try {
      const response = await fetch(SERVER_URL + "/pdf/search", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: pdfQuery,
          filename: selectedPDF
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          response: {
            status: response.status,
            statusText: response.statusText,
            data: errorData
          },
          config: { url: response.url }
        };
      }

      const data = await response.json();
      setPdfResults(data.data.results);
      addStatus(`Found ${data.data.totalResults} relevant results`);
      handleSuccess("Search Complete", `Found ${data.data.totalResults} relevant results in your PDF`);
    } catch (error) {
      addStatus(`Error searching PDF: ${error}`);
      handleApiError(error, "PDF Search");
    }
  };

  // Ask with PDF (RAG) and optionally speak via avatar
  const askWithPDF = async (speak: boolean) => {
    if (!selectedPDF || !pdfQuery) {
      handleWarning("Ask Parameters Required", "Please select a PDF and enter a query");
      return;
    }

    addStatus(speak ? "Asking with PDF and speaking..." : "Asking with PDF...");
    try {
      const response = await fetch(SERVER_URL + "/pdf/ask", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedPDF,
          query: pdfQuery,
          speak,
          session_id: speak && sessionInfo ? sessionInfo.session_id : undefined,
          limit: 3
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          response: { status: response.status, statusText: response.statusText, data: errorData },
          config: { url: response.url }
        };
      }

      const data = await response.json();
      setRagAnswer(data.data.answer || "");
      setPdfResults(data.data.references || []);
      setMessage(data.data.answer || message);
      addStatus("RAG answer generated" + (speak ? " and spoken by avatar" : ""));
      if (data.data?.answer) {
        addTranscript('bot', data.data.answer, 'rag');
      }
    } catch (error) {
      addStatus(`Error asking with PDF: ${error}`);
      handleApiError(error, "PDF Ask (RAG)");
    }
  };

  // VAD Functions
  const toggleVAD = () => {
    if (isVADEnabled) {
      vad.stopListening();
      speechService.stopListening();
      setIsVADEnabled(false);
      addStatus("Voice Activity Detection disabled");
    } else {
      vad.startListening();
      setIsVADEnabled(true);
      addStatus("Voice Activity Detection enabled - speak to interact");
    }
  };

  const startManualSpeechRecognition = () => {
    if (speechService.isSupported()) {
      speechService.startListening({
        continuous: false,
        interimResults: false
      });
      addStatus("Listening for speech...");
    } else {
      addStatus("Speech recognition not supported in this browser");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-md p-6 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              Persona config
            </h2>
            <Button
              onClick={() => setShowPersonaForm(!showPersonaForm)}
              variant={showPersonaForm ? "outline" : "default"}
              size="default"
            >
              {showPersonaForm ? "Hide Form" : "Edit Persona"}
            </Button>
          </div>

          {showPersonaForm && (
            <div className="mt-4 p-5 border border-gray-200 rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <Input
                    id="personaName"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <Input
                    id="personaTitle"
                    value={formData.title}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-3">
                  Education
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Degree
                    </label>
                    <Input
                      id="personaDegree"
                      value={formData.degree}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Year
                    </label>
                    <Input
                      id="personaYear"
                      value={formData.year}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Institution
                    </label>
                    <Input
                      id="personaInstitution"
                      value={formData.institution}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-3">
                  Technical
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Languages (comma-separated)
                    </label>
                    <Input
                      id="personaLanguages"
                      value={formData.languages}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Web Stack (comma-separated)
                    </label>
                    <Input
                      id="personaWebStack"
                      value={formData.webStack}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Projects (one per line)
                    </label>
                    <Textarea
                      id="personaProjects"
                      value={formData.projects}
                      onChange={handleInputChange}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-3">
                  Personality
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Style
                    </label>
                    <Textarea
                      id="personaStyle"
                      value={formData.style}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Interests (comma-separated)
                    </label>
                    <Input
                      id="personaInterests"
                      value={formData.interests}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Goals (one per line)
                    </label>
                    <Textarea
                      id="personaGoals"
                      value={formData.goals}
                      onChange={handleInputChange}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => setShowPersonaForm(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button onClick={updatePersona} variant="default">
                  Update Persona
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Avatar ID
                  </label>
                  <Input
                    id="avatarID"
                    value={avatarID}
                    onChange={(e) => setAvatarID(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Voice ID
                  </label>
                  <Input
                    id="voiceID"
                    value={voiceID}
                    onChange={(e) => setVoiceID(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  onClick={createNewSession}
                  disabled={!avatarID || sessionInfo}
                  variant="default"
                >
                  New
                </Button>
                <Button
                  onClick={startSession}
                  disabled={!sessionInfo || !avatarID}
                  variant={!sessionInfo ? "outline" : "default"}
                >
                  Start
                </Button>
                <Button
                  onClick={closeConnection}
                  disabled={!sessionInfo}
                  variant="destructive"
                >
                  Close
                </Button>
        <Button
          onClick={resetPeerConnection}
          variant="outline"
        >
          Reset
        </Button>
        <Button
          onClick={reconnectSession}
          variant="outline"
          disabled={!sessionInfo}
        >
          Reconnect
        </Button>
              </div>
            </div>

            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Message
                </label>
                <Input
                  id="taskInput"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  onClick={sendMessage}
                  disabled={!sessionInfo || !botInitialized || !message}
                  variant="secondary"
                >
                  Repeat
                </Button>
                <Button
                  onClick={talkToBot}
                  disabled={!sessionInfo || !botInitialized || !message}
                  variant="default"
                >
                  Talk
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* PDF Upload and RAG Section */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">📄 PDF Knowledge Base & RAG</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Upload PDF Document
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handlePDFUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select PDF for Search
                </label>
                <select
                  value={selectedPDF}
                  onChange={(e) => setSelectedPDF(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a PDF...</option>
                  {uploadedPDFs.map((pdf, index) => (
                    <option key={index} value={pdf.filename}>
                      {pdf.filename}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Search Query
                </label>
                <Input
                  value={pdfQuery}
                  onChange={(e) => setPdfQuery(e.target.value)}
                  placeholder="Ask a question about the PDF content..."
                />
              </div>

              <Button
                onClick={searchPDF}
                disabled={!selectedPDF || !pdfQuery}
                variant="default"
                className="w-full"
              >
                🔍 Search PDF
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button
                  onClick={() => askWithPDF(false)}
                  disabled={!selectedPDF || !pdfQuery}
                  variant="secondary"
                  className="w-full"
                >
                  ✍️ Ask with PDF (Text)
                </Button>
                <Button
                  onClick={() => askWithPDF(true)}
                  disabled={!selectedPDF || !pdfQuery || !sessionInfo || !botInitialized}
                  variant="default"
                  className="w-full"
                >
                  🗣️ Ask with PDF (Speak)
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-700">Search Results</h4>
              {ragAnswer && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-900 whitespace-pre-wrap">{ragAnswer}</div>
                </div>
              )}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {pdfResults.length > 0 ? (
                  pdfResults.map((result, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border">
                      <div className="text-sm text-gray-600 mb-1">
                        Similarity: {(result.similarity * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-800">
                        {result.content}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-sm">
                    No results yet. Upload a PDF and search for content.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Voice Activity Detection Section */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">🎤 Voice Interaction</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Button
                    onClick={toggleVAD}
                    variant={isVADEnabled ? "destructive" : "default"}
                    className="flex items-center space-x-2"
                    disabled={vad.micAvailable === false}
                    title={vad.micAvailable === false ? (vad.error || 'Microphone unavailable') : ''}
                  >
                    {isVADEnabled ? "🔴 Stop VAD" : "🟢 Start VAD"}
                  </Button>
                </div>
                <Button
                  onClick={startManualSpeechRecognition}
                  variant="outline"
                  disabled={!speechService.isSupported()}
                >
                  🎤 Manual Speech
                </Button>
                <Button
                  onMouseDown={holdToTalkStart}
                  onMouseUp={holdToTalkStop}
                  onMouseLeave={() => isHoldTalking && holdToTalkStop()}
                  onTouchStart={holdToTalkStart}
                  onTouchEnd={holdToTalkStop}
                  variant={isHoldTalking ? "destructive" : "default"}
                  disabled={!speechService.isSupported()}
                >
                  {isHoldTalking ? "🛑 Release to Stop" : "📍 Hold to Talk"}
                </Button>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Speech Status
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">
                    VAD: {isVADEnabled ? "🟢 Active" : "🔴 Inactive"}
                  </div>
                  <div className="text-sm text-gray-600">
                    Speech Recognition: {speechService.isSupported() ? "✅ Supported" : "❌ Not Supported"}
                  </div>
                  <div className="text-sm text-gray-600">
                    Microphone: {vad.micAvailable === false ? `❌ ${vad.error || 'Unavailable'}` : vad.micAvailable ? '✅ Available' : '⏳ Checking...'}
                  </div>
                  {vad.isSpeaking && (
                    <div className="text-sm text-green-600 font-medium">
                      🎤 Currently speaking...
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Language</label>
                <select
                  value={speechLang}
                  onChange={(e) => setSpeechLang(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {speechService.getSupportedLanguages().map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              {speechTranscript && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Last Speech Transcript
                  </label>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-800">
                      {speechTranscript}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-700">Voice Controls</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div>• <strong>VAD Mode:</strong> Automatically detects when you start/stop speaking</div>
                <div>• <strong>Manual Mode:</strong> Click to start listening for speech</div>
                <div>• <strong>Speech-to-Text:</strong> Converts your voice to text automatically</div>
                <div>• <strong>Integration:</strong> Speech input is sent to the avatar for response</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6 h-full lg:col-span-1">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Status</h3>
            <div className="h-52 md:h-64 overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700">
              {statusMessages.map((msg, index) => (
                <div
                  key={index}
                  className="py-1 border-b border-gray-200 last:border-0"
                >
                  {msg}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 lg:col-span-1">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Transcript</h3>
            <div className="h-52 md:h-64 overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
              {transcript.length === 0 ? (
                <div className="text-gray-500">No conversation yet.</div>
              ) : (
                transcript.map((t, idx) => (
                  <div key={idx} className={`py-2 ${t.role === 'bot' ? 'text-blue-900' : 'text-gray-800'}`}>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      {t.role === 'bot' ? 'Avatar' : 'You'} {t.source ? `• ${t.source.toUpperCase()}` : ''}
                    </div>
                    <div className="whitespace-pre-wrap">{t.text}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 lg:col-span-1">
            <div className="relative w-full max-w-lg mx-auto overflow-hidden rounded-lg shadow-md">
              <video
                ref={videoRef}
                id="mediaElement"
                className={`w-full h-auto object-cover ${
                  showVideo ? "block" : "hidden"
                }`}
                autoPlay
                playsInline
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.play();
                    setShowVideo(true);
                    if (removeBG) {
                      renderCanvas();
                    }
                    // openVideoInNewWindow(); // 👉 Automatically open for Zoom capture
                  }
                }}
              />
              <div className="mt-4 flex justify-center">
                <Button onClick={openVideoInNewWindow} variant="secondary">
                  Pop-out Video for Zoom
                </Button>
              </div>

              <canvas
                ref={canvasRef}
                id="canvasElement"
                className={`w-full h-auto ${!showVideo ? "block" : "hidden"}`}
              />
            </div>

            {sessionInfo && (
              <div className="mt-4 flex items-center justify-center">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removeBG}
                    onChange={toggleBgRemoval}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Remove Background
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
