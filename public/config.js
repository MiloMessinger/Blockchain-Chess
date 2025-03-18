// Firebase configuration - Replace with your project details
const firebaseConfig = {
    apiKey: "AIzaSyDelLt9HT71zRM83Tr-rgPXfC8WmQNYDB0",
    authDomain: "hw-blockchain-chess.firebaseapp.com",
    projectId: "hw-blockchain-chess",
    storageBucket: "hw-blockchain-chess.firebasestorage.app",
    messagingSenderId: "824515902934",
    appId: "1:824515902934:web:ed5914b6bddde9b4c67877",
    measurementId: "G-4XWKJC06C2"
};

// Smart contract configuration
const contractConfig = {
    address: "0xdc3b818cce8f0ddf1ad965cb547fc92ccc53ef40", // Replace with your deployed contract address
    // This ABI must be replaced with your actual contract ABI after deployment
    abi: [
        {
            "type": "event",
            "name": "PlayerAdded",
            "inputs": [
                {"name": "player", "type": "address", "indexed": false},
                {"name": "team", "type": "uint8", "indexed": false}
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "MoveMade",
            "inputs": [
                {"name": "player", "type": "address", "indexed": false},
                {"name": "from_square", "type": "uint8", "indexed": false},
                {"name": "to_square", "type": "uint8", "indexed": false},
                {"name": "promotion", "type": "uint8", "indexed": false}
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "GameReset",
            "inputs": [
                {"name": "owner", "type": "address", "indexed": false}
            ],
            "anonymous": false
        },
        {
            "type": "constructor",
            "stateMutability": "nonpayable",
            "inputs": []
        },
        {
            "type": "function",
            "name": "add_player",
            "stateMutability": "nonpayable",
            "inputs": [
                {"name": "player", "type": "address"},
                {"name": "team", "type": "uint8"}
            ],
            "outputs": []
        },
        {
            "type": "function",
            "name": "make_move",
            "stateMutability": "nonpayable",
            "inputs": [
                {
                    "name": "move",
                    "type": "tuple",
                    "components": [
                        {"name": "from_square", "type": "uint8"},
                        {"name": "to_square", "type": "uint8"},
                        {"name": "promotion", "type": "uint8"}
                    ]
                }
            ],
            "outputs": []
        },
        {
            "type": "function",
            "name": "reset_game",
            "stateMutability": "nonpayable",
            "inputs": [],
            "outputs": []
        },
        {
            "type": "function",
            "name": "get_piece",
            "stateMutability": "view",
            "inputs": [
                {"name": "square", "type": "uint8"}
            ],
            "outputs": [
                {"name": "", "type": "uint8"}
            ]
        },
        {
            "type": "function",
            "name": "get_game_state",
            "stateMutability": "view",
            "inputs": [],
            "outputs": [
                {"name": "", "type": "uint8"},
                {"name": "", "type": "uint8"},
                {"name": "", "type": "uint8"},
                {"name": "", "type": "uint8"},
                {"name": "", "type": "uint16"},
                {"name": "", "type": "bool"},
                {"name": "", "type": "uint8"}
            ]
        },
        {
            "type": "function",
            "name": "get_board",
            "stateMutability": "view",
            "inputs": [],
            "outputs": [
                {"name": "", "type": "uint8[]"}
            ]
        },
        {
            "type": "function",
            "name": "is_player_on_team",
            "stateMutability": "view",
            "inputs": [
                {"name": "player", "type": "address"},
                {"name": "team", "type": "uint8"}
            ],
            "outputs": [
                {"name": "", "type": "bool"}
            ]
        },
        {
            "type": "function",
            "name": "owner",
            "stateMutability": "view",
            "inputs": [],
            "outputs": [
                {"name": "", "type": "address"}
            ]
        },
        {
            "type": "function",
            "name": "white_team",
            "stateMutability": "view",
            "inputs": [
                {"name": "arg0", "type": "address"}
            ],
            "outputs": [
                {"name": "", "type": "bool"}
            ]
        },
        {
            "type": "function",
            "name": "black_team",
            "stateMutability": "view",
            "inputs": [
                {"name": "arg0", "type": "address"}
            ],
            "outputs": [
                {"name": "", "type": "bool"}
            ]
        },
        {
            "type": "function",
            "name": "board",
            "stateMutability": "view",
            "inputs": [
                {"name": "arg0", "type": "uint8"}
            ],
            "outputs": [
                {"name": "", "type": "uint8"}
            ]
        },
        {
            "type": "function",
            "name": "active_color",
            "stateMutability": "view",
            "inputs": [],
            "outputs": [
                {"name": "", "type": "uint8"}
            ]
        },
        {
            "type": "function",
            "name": "castling_rights",
            "stateMutability": "view",
            "inputs": [],
            "outputs": [
                {"name": "", "type": "uint8"}
            ]
        },
        {
            "type": "function",
            "name": "en_passant_target",
            "stateMutability": "view",
            "inputs": [],
            "outputs": [
                {"name": "", "type": "uint8"}
            ]
        },
        {
            "type": "function",
            "name": "halfmove_clock",
            "stateMutability": "view",
            "inputs": [],
            "outputs": [
                {"name": "", "type": "uint8"}
            ]
        },
        {
            "type": "function",
            "name": "fullmove_number",
            "stateMutability": "view",
            "inputs": [],
            "outputs": [
                {"name": "", "type": "uint16"}
            ]
        },
        {
            "type": "function",
            "name": "game_over",
            "stateMutability": "view",
            "inputs": [],
            "outputs": [
                {"name": "", "type": "bool"}
            ]
        },
        {
            "type": "function",
            "name": "winner",
            "stateMutability": "view",
            "inputs": [],
            "outputs": [
                {"name": "", "type": "uint8"}
            ]
        }
    ]
};

// Game constants
const TEAM = {
    WHITE: 0,
    BLACK: 1
};

const PIECE = {
    EMPTY: 0,
    W_PAWN: 1,
    W_KNIGHT: 2,
    W_BISHOP: 3,
    W_ROOK: 4,
    W_QUEEN: 5,
    W_KING: 6,
    B_PAWN: 7,
    B_KNIGHT: 8,
    B_BISHOP: 9,
    B_ROOK: 10,
    B_QUEEN: 11,
    B_KING: 12
};

const GAME_STATUS = {
    IN_PROGRESS: 3,
    WHITE_WINS: 0,
    BLACK_WINS: 1,
    DRAW: 2
};

// Refresh interval for game state (in milliseconds)
const REFRESH_INTERVAL = 10000;