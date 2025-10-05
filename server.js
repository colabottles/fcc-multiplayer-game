require('dotenv').config();
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const expect = require('chai');
const socket = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');

const app = express();

app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//For FCC testing purposes and enables user to connect from outside the hosting platform
app.use(cors({origin: '*'})); 

// --- Security Middleware ---

// 16. Prevent the client from trying to guess/sniff the MIME type.
app.use(helmet.noSniff());

// 17. Prevent cross-site scripting (XSS) attacks.
app.use(helmet.xssFilter());

// 18. Nothing from the website is cached in the client.
// Note: In helmet@^3.21.3, 'noCache' is used.
app.use(helmet.noCache());

// 19. The headers say that the site is powered by "PHP 7.4.3".
// Note: In helmet@^3.21.3, 'hidePoweredBy' is used to set a custom header.
app.use(helmet.hidePoweredBy({ setTo: 'PHP 7.4.3' }));

// Serve the static files (client-side code)
app.use(express.static('public'));

// ... Game Logic and Socket.io setup goes here ...
// ... (see next section B) ...

// --- Game Constants and State ---
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_SIZE = 20;
const COLLECTIBLE_SIZE = 15;
const PLAYER_SPEED = 5;
const COLLECTIBLE_VALUE = 10;

// Centralized state
const players = {};
let collectible = spawnCollectible();

function spawnCollectible() {
    return {
        x: Math.random() * (GAME_WIDTH - COLLECTIBLE_SIZE),
        y: Math.random() * (GAME_HEIGHT - COLLECTIBLE_SIZE)
    };
}

// Helper to calculate rank (highest score first)
function getPlayerRanks() {
    return Object.values(players)
        .sort((a, b) => b.score - a.score)
        .map(player => ({ id: player.id, score: player.score, username: player.username }));
}

// Game Loop: Update game state and broadcast to clients
setInterval(() => {
    // Check for collisions and update scores
    Object.keys(players).forEach(id => {
        const player = players[id];

        // Simple AABB collision check
        if (
            player.x < collectible.x + COLLECTIBLE_SIZE &&
            player.x + PLAYER_SIZE > collectible.x &&
            player.y < collectible.y + COLLECTIBLE_SIZE &&
            player.y + PLAYER_SIZE > collectible.y
        ) {
            // Collision detected! Update score and respawn collectible
            player.score += COLLECTIBLE_VALUE;
            collectible = spawnCollectible();
            io.emit('collectibleUpdate', collectible); // Tell clients collectible moved
        }
    });

    // Send the full game state to all players
    io.emit('gameState', {
        players: players,
        ranks: getPlayerRanks()
    });
}, 1000 / 60); // 60 updates per second

// --- Socket.io Connections ---
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Initial setup for the new player
    const username = `Player_${Object.keys(players).length + 1}`;
    players[socket.id] = {
        id: socket.id,
        username: username,
        x: Math.random() * (GAME_WIDTH - PLAYER_SIZE),
        y: Math.random() * (GAME_HEIGHT - PLAYER_SIZE),
        score: 0,
        color: `hsl(${Math.random() * 360}, 70%, 50%)` // Random color
    };

    // Send initial game state and the collectible position
    socket.emit('collectibleUpdate', collectible);
    socket.emit('initialState', {
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        playerSize: PLAYER_SIZE
    });

    // Handle player movement input
    // The server **validates and applies** movement, client only sends intent.
    socket.on('movement', (keys) => {
        const player = players[socket.id];
        if (!player) return;

        // Secure movement: Server controls position, preventing client cheating
        if (keys.up && player.y > 0) player.y -= PLAYER_SPEED;
        if (keys.down && player.y < GAME_HEIGHT - PLAYER_SIZE) player.y += PLAYER_SPEED;
        if (keys.left && player.x > 0) player.x -= PLAYER_SPEED;
        if (keys.right && player.x < GAME_WIDTH - PLAYER_SIZE) player.x += PLAYER_SPEED;
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete players[socket.id];
    });
});

// Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  }); 

//For FCC testing purposes
fccTestingRoutes(app);
    
// 404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

const portNum = process.env.PORT || 3000;

// Set up server and tests
const server = app.listen(portNum, () => {
  console.log(`Listening on port ${portNum}`);
  if (process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (error) {
        console.log('Tests are not valid:');
        console.error(error);
      }
    }, 1500);
  }
});

module.exports = app; // For testing
