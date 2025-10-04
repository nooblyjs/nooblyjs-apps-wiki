# Wiki Phase 3: AI Implementation

## Phase 1 Requirement
I would like to implement and AI chat panel. The panel should be docked on the a right and be resizable and collapsable and be used for chatting with an assistant llm. Please create right navigation area what has a chat box at the bottom is resizable (to be remembered in local storage) and collapsable, The chat history should be stored in local storage. The settings should be editable in the the settings / AI & LLM tab and stored in the application data folder in a settings_ai.json file. Please look at the ai service defined in the @docs/nooblyjs-core-usage-guide-concise.md document to implement the prompt etc. Plesae think hard about this. Please make collpase icon appear in the header to the right of the user panel and use a bootstrap5-icon.

### Phase 1 Tasks

#### 1. Backend Infrastructure
- [ ] **Initialize AI Service in Wiki Factory** (`src/index.js`)
  - Add AI service initialization using `serviceRegistry.ai()` with provider configuration
  - Pass AI service to route handlers and components
  - Load user-specific AI settings from dataManager on initialization
  - Add error handling for missing/invalid AI configuration

- [ ] **Create AI Chat API Routes** (`src/routes/aiChatRoutes.js`)
  - `POST /applications/wiki/api/ai/chat` - Send message to AI and get response
  - `GET /applications/wiki/api/ai/chat/history` - Retrieve chat history for user
  - `POST /applications/wiki/api/ai/chat/clear` - Clear chat history for user
  - `DELETE /applications/wiki/api/ai/chat/:messageId` - Delete specific message
  - Integrate with NooblyJS AI service (`ai.prompt()`)
  - Use user-specific AI settings loaded from `aiSettings_${userId}.json`
  - Store chat history in dataManager as `chatHistory_${userId}.json`
  - Add authentication checks using `req.isAuthenticated()`
  - Implement rate limiting using cache service
  - Track AI token usage using measuring service

- [ ] **Register AI Routes** (`src/index.js`)
  - Import and register `aiChatRoutes` in the wiki factory
  - Pass services to AI routes (dataManager, filing, cache, logger, queue, search)

- [ ] **Update Settings Routes** (`src/routes/settingsRoutes.js`)
  - Enhance AI settings test endpoint to actually test AI connection
  - Add model validation for different providers (claude, chatgpt, ollama)
  - Add endpoint to fetch available models for selected provider

#### 2. Frontend UI Components

- [ ] **Create AI Chat Panel HTML Structure** (`src/views/index.ejs`)
  - Add right-side collapsible panel container with resizable functionality
  - Add chat message display area (scrollable container)
  - Add input box at bottom with send button
  - Add loading/typing indicators
  - Add error message display area
  - Add clear chat history button
  - Use Bootstrap 5 classes for styling

- [ ] **Add Collapse Toggle Button** (`src/views/partials/header.ejs`)
  - Add Bootstrap icon button to right of user panel in header
  - Use `bi-chat-dots` or `bi-robot` icon
  - Toggle visibility of AI chat panel
  - Store collapse state in localStorage

- [ ] **Create AI Chat CSS** (`public/css/wiki.css` or new `public/css/ai-chat.css`)
  - Style for right-side docked panel
  - Resizable panel styles (drag handle)
  - Chat message bubbles (user vs AI)
  - Loading/typing animation
  - Responsive design for mobile
  - Collapsed state styles

#### 3. Frontend JavaScript Logic

- [ ] **Create AI Chat Controller** (`src/views/js/modules/aichatcontroller.js`)
  - Initialize chat panel and load stored width from localStorage
  - Implement resize functionality with drag handle
  - Save panel width to localStorage on resize
  - Toggle panel collapse/expand
  - Load chat history from localStorage on init
  - Display chat messages (user and AI responses)
  - Handle send message action
  - Stream/display AI responses with typing indicator
  - Handle API errors gracefully
  - Implement clear chat history with confirmation
  - Sync chat history with backend periodically
  - Auto-scroll to latest message
  - Format markdown in AI responses

- [ ] **Integrate AI Chat into Main App** (`src/views/js/app.js`)
  - Import and initialize `aichatcontroller`
  - Add event listeners for chat toggle button
  - Integrate with existing notification system
  - Handle AI service disabled state

- [ ] **Local Storage Management**
  - Store chat panel width (`aiChatPanelWidth`)
  - Store collapse state (`aiChatPanelCollapsed`)
  - Store chat history (`aiChatHistory_${userId}`)
  - Implement sync mechanism between localStorage and backend
  - Handle localStorage quota exceeded errors

#### 4. AI Service Integration

- [ ] **Create AI Service Helper** (`src/components/aiService.js`)
  - Wrapper around NooblyJS AI service
  - Load user-specific AI settings
  - Validate provider configuration (claude, chatgpt, ollama)
  - Handle different AI provider APIs
  - Format prompts with context (current document, space, etc.)
  - Parse and format AI responses
  - Handle streaming responses if supported
  - Error handling for API failures
  - Token usage tracking and limits

- [ ] **Context-Aware Prompting**
  - Include current document context in prompts
  - Include current space context
  - Allow users to reference documents in chat
  - Implement document search integration for AI
  - Add system prompts for wiki-specific assistance

#### 5. Settings & Configuration

- [ ] **Update AI Settings UI** (`src/views/partials/settings-tabs.ejs`)
  - Verify all AI settings fields are present (already implemented)
  - Add model dropdown based on provider selection
  - Add context settings (include document context, etc.)
  - Add chat behavior settings (temperature, max tokens)
  - Add visual feedback for saved settings

- [ ] **Settings Migration**
  - Move AI settings from application data folder to dataManager per-user
  - Update backend to use `aiSettings_${userId}` instead of global settings
  - Ensure backward compatibility

#### 6. Testing & Polish

- [ ] **Error Handling**
  - Handle AI service not configured
  - Handle API key invalid/expired
  - Handle rate limit exceeded
  - Handle network failures
  - Display user-friendly error messages

- [ ] **Performance Optimization**
  - Lazy load chat panel UI components
  - Debounce resize events
  - Implement message pagination for long histories
  - Cache AI responses when appropriate

- [ ] **Accessibility**
  - Add ARIA labels to chat components
  - Keyboard navigation support
  - Screen reader announcements for new messages
  - High contrast mode support

- [ ] **Documentation**
  - Update CLAUDE.md with AI chat feature details
  - Add user guide for AI chat panel
  - Document AI service configuration
  - Add troubleshooting guide

#### 7. Optional Enhancements (Future)
- [ ] Conversation threads/sessions
- [ ] Export chat history
- [ ] AI-powered document suggestions
- [ ] Voice input support
- [ ] Multiple AI model comparison
- [ ] Custom system prompts per space
- [ ] AI-assisted document editing

---

## Implementation Notes

### Architecture Overview
The AI chat panel integrates with the existing NooblyJS Wiki application using:
- **Backend**: NooblyJS Core AI service (`serviceRegistry.ai()`)
- **Storage**: Per-user settings in `aiSettings_${userId}.json`, chat history in `chatHistory_${userId}.json`
- **Frontend**: Resizable right-side panel with localStorage persistence
- **Authentication**: Passport.js session-based auth (already implemented)

### Key Design Decisions
1. **Per-User Settings**: Each user has their own AI configuration to support different providers/keys
2. **Dual Storage**: Chat history stored in both localStorage (quick access) and backend (persistence/sync)
3. **Service Registry Pattern**: Use existing NooblyJS service infrastructure for consistency
4. **Progressive Enhancement**: AI panel gracefully degrades if settings not configured
5. **Context Awareness**: AI can access current document/space for better assistance

### Security Considerations
- API keys stored server-side only, masked in frontend display
- Rate limiting per user to prevent abuse
- Authentication required for all AI endpoints
- Token usage tracking for billing/monitoring
- Input sanitization for prompts

### Performance Considerations
- Lazy load AI panel to reduce initial page load
- Debounce resize events to reduce localStorage writes
- Paginate long chat histories
- Cache AI responses where appropriate
- Consider streaming responses for better UX
