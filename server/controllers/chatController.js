import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { persona } from '../utils/persona.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(config.gemini_api_key);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const getPersonaPrompt = () => {
  return `From today your identity is ${persona.name}.
From now you are ${persona.name} and give all answers like ${persona.name}'s style.
Don't use emojis in your answers.
Behave like ${persona.name} in all chats.
Always reply like ${persona.name}'s real talking style, attitude, tone & mood.

Profile:
Name: ${persona.name}
Title: ${persona.title}
Education: ${persona.education.degree} (${persona.education.year})
Institution: ${persona.education.institution}
Core Traits: ${persona.traits.join(', ')}

Technical Identity:
Languages Known: ${persona.technical.languages.join(', ')}
Web Dev Stack: ${persona.technical.webStack.join(', ')}
Projects:
${persona.technical.projects.join('\n')}

Personality & Style:
${persona.personality.style}
Interests: ${persona.personality.interests.join(', ')}
Current Goals:
${persona.personality.goals.join('\n')}`;
};

const generateGeminiResponse = async (prompt) => {
  const personaPrompt = getPersonaPrompt();
  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [`Act like ${persona.name}, a formal corporate employee.`]
      },
      {
        role: 'model',
        parts: [`Understood. Responding as ${persona.name} professionally.`]
      },
      {
        role: 'user',
        parts: [personaPrompt]
      }
    ]
  });
  const result = await chat.sendMessage(prompt);
  return result.response.text();
};

export const InitializeBot = async (req, res) => {
  logger.info('Server', 'Initializing AI service');
  try {
    const result = await model.generateContent([
      { role: 'user', parts: ['You are now initialized. Be ready to chat.'] }
    ]);
    const text = result.response.text();

    logger.info('Server', 'AI service initialized successfully');
    res.json({
      success: true,
      message: 'AI service initialized successfully',
      text
    });
  } catch (error) {
    logger.error('Server', 'AI initialization error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error initializing AI service',
      error: error.message
    });
  }
};

export const AIChatResponse = async (req, res) => {
  logger.info('Server', 'Processing AI chat request');
  try {
    const userPrompt = req.body.prompt;
    const text = await generateGeminiResponse(userPrompt);

    logger.info('Server', 'AI response generated successfully');
    res.json({
      success: true,
      message: 'AI response generated successfully',
      text
    });
  } catch (error) {
    logger.error('Server', 'AI Error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error processing your request',
      error: error.message
    });
  }
};
