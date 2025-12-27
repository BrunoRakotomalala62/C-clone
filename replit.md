# Facebook Messenger Bot

## Overview
This is a Facebook Messenger bot that uses the ws3-fca library to connect to Facebook Messenger and respond to messages. It includes various commands and AI integration via Gemini API.

## Project Structure
- `index.js` - Main entry point, sets up Express server and Facebook Messenger bot
- `config.json` - Bot configuration (prefix, port, admin settings)
- `cmds/` - Command modules (ai, help, pinterest, etc.)

## Setup Requirements

### Required Secrets
- `APPSTATE` - Facebook session state in JSON format (required for bot login)

## Running the Bot
The bot runs on port 5000 with an Express server that provides a basic status endpoint at `/`.

## Commands
Commands are loaded dynamically from the `cmds/` directory:
- `ai` - AI chat functionality
- `help` - List available commands
- `pinterest` - Pinterest image search
- `claude` - Claude AI integration
- `llama` - Llama AI integration
- And more...

## Architecture
- Uses ws3-fca for Facebook Messenger API
- Express server for status endpoint
- Axios for HTTP requests to AI APIs
- Commands are modular and loaded from the `cmds/` folder
