// Game constants
const CIRCUIT_COUNT = 3;
const NODES_PER_CIRCUIT = 6;
const TITANS_PER_PLAYER = 4;

// Circuit radii (in pixels)
const CIRCUIT_RADII = [250, 175, 100];
// Circuit radii for different shapes
const CIRCUIT_RADII_SQUARE = [400, 325, 250];
const CIRCUIT_RADII_TRIANGLE = [320, 230, 140];


// Player constants
const PLAYERS = {
    RED: 'red',
    BLUE: 'blue'
};

// Game phases
const PHASES = {
    PLACEMENT: 'placement',
    MOVEMENT: 'movement'
};

// Timer constants (in seconds)
const GAME_TIME = 600; // 10 minutes
const TURN_TIME = 30;  // 30 seconds