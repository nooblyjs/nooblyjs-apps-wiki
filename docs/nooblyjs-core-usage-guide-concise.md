# NooblyJS Core - AI Code Generation Usage Guide

## Package Installation

```bash
npm install noobly-core
```

## Core Pattern

```javascript
const express = require('express');
const serviceRegistry = require('noobly-core');

const app = express();
app.use(express.json());

// Initialize first (required before using any services)
serviceRegistry.initialize(app);

// Get services (singleton pattern)
const ai = serviceRegistry.ai('claude', { apiKey: process.env.CLAUDE_API_KEY });
const auth = serviceRegistry.auth('memory');
const cache = serviceRegistry.cache('memory');
const dataServe = serviceRegistry.dataServe('memory');
const filing = serviceRegistry.filing('local');
const logger = serviceRegistry.logger('console');
const measuring = serviceRegistry.measuring('memory');
const notifying = serviceRegistry.notifying('memory');
const queueing = serviceRegistry.queueing('memory');
const scheduling = serviceRegistry.scheduling('memory');
const searching = serviceRegistry.searching('memory');
const workflow = serviceRegistry.workflow('memory');
const working = serviceRegistry.working('memory');

app.listen(3000);
```

## Service Overview

| Service | Purpose | Providers |
|---------|---------|-----------|
| **ai** | AI/LLM integration with token tracking | claude, chatgpt, ollama |
| **auth** | User authentication and authorization | memory, file, passport, google |
| **cache** | High-performance caching with TTL | memory, redis, memcached |
| **dataServe** | JSON document storage with UUIDs and search | memory, simpledb, file |
| **filing** | File upload/download/management | local, ftp, s3, git, sync |
| **logger** | Application logging | console, file |
| **measuring** | Time-series metrics collection | memory |
| **notifying** | Pub/sub messaging system | memory |
| **queueing** | FIFO task queue | memory |
| **scheduling** | Delayed/recurring task execution | memory |
| **searching** | Full-text search and indexing | memory |
| **workflow** | Multi-step workflow orchestration | memory |
| **working** | Background script execution | memory |

## AI Service

### Basic Usage (Claude)
```javascript
const ai = serviceRegistry.ai('claude', {
  apiKey: process.env.CLAUDE_API_KEY,
  model: 'claude-3-5-sonnet-20241022'
});

// Send prompt
const response = await ai.prompt('Explain Node.js in 50 words', {
  maxTokens: 200,
  temperature: 0.7
});

console.log(response.content);
console.log('Tokens used:', response.usage.totalTokens);
```

### OpenAI/ChatGPT Provider
```javascript
const ai = serviceRegistry.ai('chatgpt', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4'
});

const response = await ai.prompt('Write a hello world function');
```

### Ollama Provider (Local)
```javascript
const ai = serviceRegistry.ai('ollama', {
  baseUrl: 'http://localhost:11434',
  model: 'llama2'
});

const response = await ai.prompt('Explain microservices');
```

### AI with Service Dependencies
```javascript
// Initialize AI with logging and caching
const ai = serviceRegistry.ai('claude', {
  apiKey: process.env.CLAUDE_API_KEY,
  dependencies: {
    logging: logger,
    caching: cache,
    workflow: workflow,
    queueing: queue
  }
});

// Response caching is automatic if cache is injected
const result = await ai.prompt('Explain REST APIs');
```

## Auth Service

### Basic Usage (Memory)
```javascript
const auth = serviceRegistry.auth('memory');

// Create user
const user = await auth.createUser({
  username: 'john',
  email: 'john@example.com',
  password: 'secure123',
  role: 'user'
});

// Authenticate
const { user, session } = await auth.authenticateUser('john', 'secure123');
console.log('Session token:', session.token);

// Validate session
const validSession = await auth.validateSession(session.token);

// Logout
await auth.logout(session.token);
```

### User Management
```javascript
// Get user
const user = await auth.getUser('john');

// Update user
await auth.updateUser('john', {
  email: 'newemail@example.com',
  password: 'newpassword123'
});

// Delete user
await auth.deleteUser('john');

// List all users
const users = await auth.listUsers();
```

### Role-Based Access Control
```javascript
// Check user role
const hasRole = await auth.checkRole('john', 'admin');

// Update user role
await auth.updateUser('john', { role: 'admin' });

// Get users by role
const admins = await auth.getUsersByRole('admin');
```

### File Provider (Persistent Storage)
```javascript
const auth = serviceRegistry.auth('file', {
  baseDir: './data/auth'
});

// User data persists to disk
await auth.createUser({
  username: 'admin',
  email: 'admin@example.com',
  password: 'admin123',
  role: 'admin'
});
```

### Express Middleware Integration
```javascript
// Protect routes with auth middleware
app.use('/api/protected', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const session = await auth.validateSession(token);
    req.user = session;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Role-based middleware
app.use('/api/admin', async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});
```

## Caching Service

### Basic Usage
```javascript
const cache = serviceRegistry.cache('memory');

// Store with optional TTL (seconds)
await cache.put('key', { data: 'value' }, 3600);

// Retrieve
const data = await cache.get('key');

// Delete
await cache.delete('key');

// Analytics
const analytics = cache.getAnalytics();
```

### Redis Provider
```javascript
const cache = serviceRegistry.cache('redis', {
  host: 'localhost',
  port: 6379,
  password: 'secret',
  keyPrefix: 'myapp:',
  enableAnalytics: true
});
```

## DataServe Service

### Basic Usage (Database-Style with UUIDs)
```javascript
const dataServe = serviceRegistry.dataServe('memory');

// Create container
await dataServe.createContainer('users');

// Insert data, get UUID
const uuid = await dataServe.add('users', {
  name: 'John',
  email: 'john@example.com',
  profile: { department: 'engineering' }
});

// Retrieve by UUID
const user = await dataServe.getByUuid('users', uuid);

// Delete by UUID
await dataServe.remove('users', uuid);
```

### JSON Search
```javascript
// Custom predicate
const results = await dataServe.jsonFind('users',
  user => user.profile.department === 'engineering'
);

// Path-based search
const engineers = await dataServe.jsonFindByPath('users',
  'profile.department', 'engineering'
);

// Multi-criteria search
const active = await dataServe.jsonFindByCriteria('users', {
  'status': 'active',
  'profile.department': 'engineering'
});
```

### File Provider
```javascript
const dataServe = serviceRegistry.dataServe('file', {
  baseDir: './data/containers'
});
```

## Filing Service

### Basic Usage
```javascript
const filing = serviceRegistry.filing('local', {
  baseDir: '/app/uploads'
});

// Upload file
const fileStream = fs.createReadStream('./document.pdf');
await filing.create('documents/report.pdf', fileStream);

// Download file
const downloadStream = await filing.read('documents/report.pdf');

// Check existence
const exists = await filing.exists('documents/report.pdf');

// Get metadata
const metadata = await filing.getMetadata('documents/report.pdf');

// Delete file
await filing.delete('documents/report.pdf');
```

### S3 Provider
```javascript
const filing = serviceRegistry.filing('s3', {
  bucket: 'myapp-files',
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
```

## Logging Service

```javascript
const logger = serviceRegistry.logger('console');

// Log levels
logger.info('Application started', { port: 3000 });
logger.warn('Rate limit approaching', { userId: '123' });
logger.error('Database error', { error: err.message });
logger.debug('Cache hit', { key: 'user:123' });
```

### File Provider
```javascript
const logger = serviceRegistry.logger('file', {
  filename: './logs/app.log',
  maxFiles: 5,
  maxSize: '10m'
});
```

## Measuring Service

```javascript
const measuring = serviceRegistry.measuring('memory');

// Record metrics
measuring.add('api.response.time', 145);
measuring.add('api.request.count', 1);

// Query metrics
const metrics = measuring.list('api.response.time', startDate, endDate);
const total = measuring.total('api.request.count', startDate, endDate);
const avg = measuring.average('api.response.time', startDate, endDate);
```

## Notifying Service (Pub/Sub)

```javascript
const notifying = serviceRegistry.notifying('memory');

// Create topic
notifying.createTopic('user-events');

// Subscribe
notifying.subscribe('user-events', (message) => {
  console.log('Event:', message);
});

// Publish
notifying.notify('user-events', {
  type: 'user-registered',
  userId: '123',
  timestamp: new Date().toISOString()
});

// Unsubscribe
notifying.unsubscribe('user-events', callback);
```

## Queueing Service

```javascript
const queue = serviceRegistry.queueing('memory');

// Add task
queue.enqueue({
  type: 'sendEmail',
  recipient: 'user@example.com',
  template: 'welcome'
});

// Get next task
const task = queue.dequeue();

// Queue size
const size = queue.size();

// Clear queue
queue.clear();
```

## Scheduling Service

```javascript
const scheduling = serviceRegistry.scheduling('memory');

// Schedule delayed task
const taskId = scheduling.schedule(
  'sendReminder',
  './tasks/reminder.js',
  { userId: '123' },
  5000, // delay in ms
  (result) => console.log('Task completed:', result)
);

// Cancel task
scheduling.cancel(taskId);
```

## Searching Service

```javascript
const searching = serviceRegistry.searching('memory');

// Index objects
searching.add('user123', {
  name: 'John Doe',
  email: 'john@example.com',
  bio: 'Software engineer'
});

// Search
const results = searching.search('engineer');

// Delete from index
searching.delete('user123');
```

## Workflow Service

```javascript
const workflow = serviceRegistry.workflow('memory');

// Define workflow steps
await workflow.defineWorkflow('userOnboarding', [
  './steps/validateUser.js',
  './steps/createAccount.js',
  './steps/sendWelcome.js'
]);

// Execute workflow
workflow.runWorkflow('userOnboarding', {
  email: 'user@example.com',
  name: 'John'
}, (result) => {
  console.log('Workflow completed:', result);
});
```

## Working Service

```javascript
const worker = serviceRegistry.working('memory');

// Start background worker
worker.start('./workers/processor.js', (result) => {
  console.log('Worker result:', result);
});

// Stop worker
worker.stop();

// Worker status
const status = worker.status;
```

## Event System

```javascript
// Get global event emitter
const eventEmitter = serviceRegistry.getEventEmitter();

// Listen for events
eventEmitter.on('cache-hit', (data) => {
  console.log('Cache hit:', data);
});

eventEmitter.on('workflow-completed', (data) => {
  console.log('Workflow finished:', data);
});

// Emit custom events
eventEmitter.emit('custom-event', { data: 'value' });
```

## API Key Security

```javascript
// Generate API key
const apiKey = serviceRegistry.generateApiKey(32);

// Initialize with security
serviceRegistry.initialize(app, {
  apiKeys: [apiKey],
  requireApiKey: true,
  excludePaths: [
    '/services/*/status',
    '/services/',
    '/services/*/views/*'
  ]
});
```

## Production Configuration

```javascript
const express = require('express');
const serviceRegistry = require('noobly-core');

const app = express();
app.use(express.json());

// Initialize
serviceRegistry.initialize(app, {
  apiKeys: [process.env.API_KEY],
  requireApiKey: true
});

// Redis cache
const cache = serviceRegistry.cache('redis', {
  host: process.env.REDIS_HOST,
  port: 6379,
  password: process.env.REDIS_PASSWORD
});

// File-based data storage
const dataServe = serviceRegistry.dataServe('file', {
  baseDir: './data/containers'
});

// S3 file storage
const filing = serviceRegistry.filing('s3', {
  bucket: process.env.S3_BUCKET,
  region: 'us-east-1'
});

// File logging
const logger = serviceRegistry.logger('file', {
  filename: './logs/app.log',
  maxFiles: 5,
  maxSize: '10m'
});

app.listen(3000);
```

## Common Patterns

### Cache-Aside Pattern
```javascript
async function getUser(userId) {
  const cacheKey = `user:${userId}`;

  // Try cache first
  let user = await cache.get(cacheKey);
  if (user) return user;

  // Fallback to database
  user = await db.users.findById(userId);

  // Cache for next time
  await cache.put(cacheKey, user, 3600);
  return user;
}
```

### Event-Driven Data Flow
```javascript
// Subscribe to events
notifying.subscribe('user-registered', async (data) => {
  const uuid = await dataServe.add('users', data);
  await cache.put(`user:${data.id}`, data);
  queue.enqueue({ type: 'sendWelcome', userId: data.id });
});

// Publish event
notifying.notify('user-registered', {
  id: '123',
  email: 'user@example.com'
});
```

### Background Processing
```javascript
// Queue tasks
queue.enqueue({ type: 'processImage', imageId: '456' });
queue.enqueue({ type: 'sendEmail', userId: '123' });

// Process queue
setInterval(async () => {
  const task = queue.dequeue();
  if (task) {
    await processTask(task);
  }
}, 1000);
```

### Metrics Tracking
```javascript
app.use(async (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    measuring.add('api.response.time', Date.now() - start);
    measuring.add('api.requests', 1);
    if (res.statusCode >= 400) {
      measuring.add('api.errors', 1);
    }
  });

  next();
});
```

### AI-Powered API with Authentication
```javascript
// Protected AI endpoint with authentication
app.post('/api/ai/generate', async (req, res) => {
  try {
    // Authenticate user
    const token = req.headers.authorization?.replace('Bearer ', '');
    const session = await auth.validateSession(token);

    // Check rate limiting using cache
    const rateLimitKey = `ratelimit:${session.userId}`;
    const requests = await cache.get(rateLimitKey) || 0;

    if (requests >= 10) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // Increment rate limit
    await cache.put(rateLimitKey, requests + 1, 3600);

    // Generate AI response
    const response = await ai.prompt(req.body.prompt, {
      maxTokens: req.body.maxTokens || 500,
      temperature: 0.7
    });

    // Track metrics
    measuring.add('ai.requests', 1);
    measuring.add('ai.tokens', response.usage.totalTokens);

    // Log request
    logger.info('AI request processed', {
      user: session.username,
      tokens: response.usage.totalTokens
    });

    res.json(response);
  } catch (error) {
    logger.error('AI request failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});
```

## Service Method Reference

### ai
- `prompt(text, options?)` - Send prompt to AI, returns { content, usage, model, provider }
- `options.maxTokens` - Maximum tokens in response
- `options.temperature` - Response temperature (0-1)
- Providers: claude, chatgpt, ollama

### auth
- `createUser(userData)` - Create new user account
- `authenticateUser(username, password)` - Login, returns { user, session }
- `validateSession(token)` - Validate session token
- `logout(token)` - Invalidate session
- `getUser(username)` - Get user by username
- `updateUser(username, updates)` - Update user info
- `deleteUser(username)` - Delete user
- `listUsers()` - Get all users
- `checkRole(username, role)` - Check if user has role
- `getUsersByRole(role)` - Get users by role
- Providers: memory, file, passport, google

### cache
- `put(key, value, ttl?)` - Store with optional TTL
- `get(key)` - Retrieve value
- `delete(key)` - Remove entry
- `getAnalytics()` - Get performance metrics

### dataServe
- `createContainer(name)` - Create container
- `add(container, data)` - Insert, returns UUID
- `getByUuid(container, uuid)` - Retrieve by UUID
- `remove(container, uuid)` - Delete by UUID
- `jsonFind(container, predicate)` - Custom search
- `jsonFindByPath(container, path, value)` - Path search
- `jsonFindByCriteria(container, criteria)` - Multi-criteria search

### filing
- `create(path, stream)` - Upload file
- `read(path)` - Download file
- `exists(path)` - Check existence
- `getMetadata(path)` - Get file info
- `delete(path)` - Remove file

### logger
- `info(msg, ...args)` - Info level
- `warn(msg, ...args)` - Warning level
- `error(msg, ...args)` - Error level
- `debug(msg, ...args)` - Debug level

### measuring
- `add(metric, value, timestamp?)` - Record measurement
- `list(metric, start, end)` - Query range
- `total(metric, start, end)` - Sum values
- `average(metric, start, end)` - Calculate average

### notifying
- `createTopic(name)` - Create topic
- `subscribe(topic, callback)` - Add subscriber
- `notify(topic, message)` - Publish message
- `unsubscribe(topic, callback)` - Remove subscriber

### queueing
- `enqueue(task)` - Add task
- `dequeue()` - Get next task
- `size()` - Queue size
- `clear()` - Empty queue

### scheduling
- `schedule(name, script, data, delay, callback)` - Schedule task
- `cancel(taskId)` - Cancel task

### searching
- `add(id, object)` - Index object
- `search(term)` - Search indexed data
- `delete(id)` - Remove from index

### workflow
- `defineWorkflow(name, steps)` - Define workflow
- `runWorkflow(name, data, callback)` - Execute workflow

### working
- `start(scriptPath, callback)` - Start worker
- `stop()` - Stop worker
- `status` - Worker status
