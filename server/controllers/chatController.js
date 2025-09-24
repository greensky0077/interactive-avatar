import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { persona } from '../utils/persona.js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

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

const generateOpenAIResponse = async (prompt) => {
  const personaPrompt = getPersonaPrompt();
  
  try {
    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: `Act like ${persona.name}, a formal corporate employee. ${personaPrompt}`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      ...config.openai.config
    });
    
    return completion.choices[0].message.content;
  } catch (error) {
    logger.error('OpenAI', 'Error generating response', { error: error.message });
    throw new Error(`OpenAI API error: ${error.message}`);
  }
};

export const InitializeBot = async (req, res) => {
  logger.info('Server', 'Initializing AI service');
  try {
    // Check if API key is configured
    if (!config.openai.apiKey || config.openai.apiKey === 'your_openai_api_key_here') {
      logger.warn('OpenAI', 'API key not configured, returning mock response');
      return res.json({
        success: true,
        message: 'AI service initialized successfully (mock mode)',
        text: `Hello! I'm ${persona.name} and I'm ready to chat. Note: OpenAI API key not configured, using mock responses.`
      });
    }

    const result = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: `You are ${persona.name}. You are now initialized and ready to chat.`
        },
        {
          role: 'user',
          content: 'You are now initialized. Be ready to chat.'
        }
      ],
      max_tokens: 100
    });
    
    const text = result.choices[0].message.content;

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
    
    // Check if API key is configured
    if (!config.openai.apiKey || config.openai.apiKey === 'your_openai_api_key_here') {
      logger.warn('OpenAI', 'API key not configured, returning mock response');
      return res.json({
        success: true,
        message: 'AI response generated successfully (mock mode)',
        text: `As ${persona.name}, I understand you're asking: "${userPrompt}". This is a mock response since OpenAI API key is not configured. Please add your OpenAI API key to get real AI responses.`
      });
    }
    
    const text = await generateOpenAIResponse(userPrompt);

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
