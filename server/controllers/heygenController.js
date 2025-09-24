import { heygenService } from '../services/heygenService.js';
import { logger } from '../utils/logger.js';
import { persona } from '../utils/persona.js';
import { config } from '../config/config.js';

// Helper function to generate AI responses using OpenAI
const generateSimpleAIResponse = async (userQuery = "") => {
  if (!userQuery) {
    return `Hi there! I'm ${persona.name}, ${persona.title}. How can I help you today?`;
  }
  
  // Check if OpenAI API key is configured
  if (!config.openai.apiKey || config.openai.apiKey === 'your_openai_api_key_here') {
    // Fallback to simple responses when API key not configured
    if (userQuery.toLowerCase().includes('who are you') || userQuery.toLowerCase().includes('introduce yourself')) {
      return `I'm ${persona.name}, a ${persona.education.year} student at ${persona.education.institution}, pursuing ${persona.education.degree}. I'm passionate about ${persona.personality.interests[0]} and ${persona.personality.interests[1]}.`;
    }
    
    if (userQuery.toLowerCase().includes('project') || userQuery.toLowerCase().includes('work')) {
      const projects = persona.technical.projects.slice(0, 2).join(' and ');
      return `I've worked on several projects including ${projects}. I'm comfortable with ${persona.technical.languages.join(', ')} for programming.`;
    }
    
    if (userQuery.toLowerCase().includes('goal') || userQuery.toLowerCase().includes('plan')) {
      return `Currently, I'm focused on ${persona.personality.goals[0]} and ${persona.personality.goals[1]}.`;
    }
    
    return `Thanks for asking! As someone who's ${persona.traits[0]} and ${persona.traits[1]}, I'm always excited to talk about ${persona.personality.interests[Math.floor(Math.random() * persona.personality.interests.length)]}.`;
  }
  
  // Use OpenAI for AI responses
  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: config.openai.apiKey });
    
    const personaPrompt = `You are ${persona.name}, ${persona.title}. 
    Education: ${persona.education.degree} (${persona.education.year}) at ${persona.education.institution}
    Technical Skills: ${persona.technical.languages.join(', ')} and ${persona.technical.webStack.join(', ')}
    Projects: ${persona.technical.projects.join(', ')}
    Personality: ${persona.personality.style}
    Interests: ${persona.personality.interests.join(', ')}
    Goals: ${persona.personality.goals.join(', ')}
    Traits: ${persona.traits.join(', ')}
    
    Respond as ${persona.name} would, maintaining their personality and style. Keep responses conversational and natural.`;
    
    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: personaPrompt },
        { role: 'user', content: userQuery }
      ],
      max_tokens: 200,
      temperature: 0.8
    });
    
    return completion.choices[0].message.content;
  } catch (error) {
    logger.error('HeygenController', 'OpenAI response generation failed', { error: error.message });
    return `I'm ${persona.name} and I'd love to help, but I'm having trouble processing that right now. Could you try asking me something else?`;
  }
};

export const initializeHeygenBot = async (req, res) => {
  try {
    logger.info('HeygenController', 'Initializing Heygen bot');
    
    // Generate a simple initialization response
    const initText = `Hello! I'm ${persona.name}. I've been initialized and ready to chat.`;
    
    logger.info('HeygenController', 'AI bot initialized successfully');
    
    res.json({
      success: true,
      message: 'Bot initialized successfully',
      data: {
        text: initText
      }
    });
  } catch (error) {
    logger.error('HeygenController', 'Bot initialization error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to initialize bot',
      error: error.message
    });
  }
};

export const createHeygenSession = async (req, res) => {
  try {
    const { avatar_name, voice_id } = req.body;
    const disable_idle_timeout = true

    // Use defaults from config if not provided
    const finalAvatarName = avatar_name || config.heygen.defaultAvatarName;
    // Only use voice_id if it's provided and not null/empty
    const finalVoiceId = (voice_id && voice_id.trim() !== '') ? voice_id : null;
    
    logger.info('HeygenController', 'Creating new Heygen session', { avatar_name: finalAvatarName, voice_id: finalVoiceId });
    const sessionInfo = await heygenService.createSession(finalAvatarName, finalVoiceId, disable_idle_timeout);
    // session info obtained

    
    res.json({
      success: true,
      message: 'Session created successfully',
      data: sessionInfo
    });
  } catch (error) {
    logger.error('HeygenController', 'Session creation error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create session',
      error: error.message
    });
  }
};

export const handleICECandidate = async (req, res) => {
  try {
    const { session_id, candidate } = req.body;
    
    if (!session_id || !candidate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: session_id and candidate'
      });
    }
    
    logger.info('HeygenController', 'Handling ICE candidate', { session_id });
    const response = await heygenService.handleICE(session_id, candidate);
    
    res.json({
      success: true,
      message: 'ICE candidate handled successfully',
      data: response
    });
  } catch (error) {
    logger.error('HeygenController', 'ICE handling error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to handle ICE candidate',
      error: error.message
    });
  }
};

export const startHeygenSession = async (req, res) => {
  try {
    const { session_id, sdp } = req.body;
    
    if (!session_id || !sdp) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: session_id and sdp'
      });
    }
    
    logger.info('HeygenController', 'Starting Heygen session', { session_id });
    const response = await heygenService.startSession(session_id, sdp);
    
    res.json({
      success: true,
      message: 'Session started successfully',
      data: response
    });
  } catch (error) {
    logger.error('HeygenController', 'Session start error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to start session',
      error: error.message
    });
  }
};

export const sendHeygenText = async (req, res) => {
  try {
    const { session_id, text, generate_ai_response } = req.body;

    if (!session_id || !text) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: session_id and text'
      });
    }

    let finalText = text;

    // If AI response generation is requested, generate a simple response
    if (generate_ai_response) {
      logger.info('HeygenController', 'Generating AI response for user input', { text });
      finalText = await generateSimpleAIResponse(text);
      logger.info('HeygenController', 'AI response generated', { aiResponse: finalText });
    }

    logger.info('HeygenController', 'Sending text to Heygen session', { session_id, text: finalText });
    const response = await heygenService.sendText(session_id, finalText);

    // Estimate speaking time (approx. 1 second per word)
    const wordCount = finalText.trim().split(/\s+/).length;
    const estimatedDuration = wordCount * 0.5; // in seconds

    res.json({
      success: true,
      message: 'Text sent successfully',
      data: response,
      ai_response: generate_ai_response ? finalText : null,
      speaking_duration: estimatedDuration
    });
  } catch (error) {
    logger.error('HeygenController', 'Send text error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to send text',
      error: error.message
    });
  }
};


export const stopHeygenSession = async (req, res) => {
  try {
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: session_id'
      });
    }
    
    logger.info('HeygenController', 'Stopping Heygen session', { session_id });
    const response = await heygenService.stopSession(session_id);
    
    res.json({
      success: true,
      message: 'Session stopped successfully',
      data: response
    });
  } catch (error) {
    logger.error('HeygenController', 'Session stop error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to stop session',
      error: error.message
    });
  }
}; 
