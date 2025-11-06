/**
 * @fileoverview The file define and instantiates the various NooblyJS applications.
 *
 * @author NooblyJS Core Team
 * @version 1.0.1
 * @since 2025-08-24
 */

'use strict';

const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const { EventEmitter } = require('events');

// Iniitiate the Web and Api Interface
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3002;
app.use(bodyParser.urlencoded({ extended: true, limit: '100mb' }));
app.use(bodyParser.json({ limit: '100mb' }));

// Configure session middleware before application initialization
app.use(session({
  secret: 'admin-dashboard-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Initialize Passport middleware (configuration will happen after authservice is created)
app.use(passport.initialize());
app.use(passport.session());

// Initiate the event mechanism
const eventEmitter = new EventEmitter();

/**
 * Patches the event emitter to log events for debugging
 * @param {EventEmitter} emitter - The event emitter to patch
 * @returns {EventEmitter} The patched event emitter
 */
function patchEmitter(emitter) {
  const originalEmit = emitter.emit;
  emitter.emit = function(...args) {
    const [eventName, ...eventArgs] = args;
    return originalEmit.apply(this, arguments);
  };
  return emitter;
}

patchEmitter(eventEmitter);

// Initiate the service Registry
const serviceRegistry = require('nooblyjs-core');
serviceRegistry.initialize(app,eventEmitter);

const log = serviceRegistry.logger('console');
const cache = serviceRegistry.cache('memory');
const dataservice = serviceRegistry.dataService('memory');
const filing = serviceRegistry.filing('local');
const queue = serviceRegistry.queue('memory');
const scheduling = serviceRegistry.scheduling('memory');
const searching = serviceRegistry.searching('memory');
const measuring = serviceRegistry.measuring('memory');
const notifying = serviceRegistry.notifying('memory');
const worker = serviceRegistry.working('memory');
const workflow = serviceRegistry.workflow('memory');
const authservice = serviceRegistry.authservice('memory');

const aiservice = serviceRegistry.aiservice('ollama', {
  model: 'tinyllama:1.1b',
  'express-app': app,
  tokensStorePath: './.noobly-core/data/ai-tokens.json'
});

// Configure Passport with the authservice (now that it's been created)
const { configurePassport } = require('./src/auth/passport-config');
configurePassport(passport, authservice);

// Load the wiki application
const wiki = require('./index.js');
wiki(app, server, eventEmitter, serviceRegistry, { authservice });

// Launch the application public folder
app.use(express.static(path.join(__dirname, 'public')));

// Launch the application docs folder
app.use('/docs', express.static(path.join(__dirname, 'docs')));

// Launch the application docs folder
app.use('/readme', express.static(path.join(__dirname, 'README.md')));

server.listen(PORT, () => {
  log.info(`Nooblyjs Content Server running on port ${PORT}`);
  log.info(`Socket.IO server initialized`);
});