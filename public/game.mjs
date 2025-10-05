import Player from './Player.mjs';
import Collectible from './Collectible.mjs';

const io = require('socket.io')(http);
const canvas = document.getElementById('game-window');
const context = canvas.getContext('2d');
