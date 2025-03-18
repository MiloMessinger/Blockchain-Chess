// Chess UI handling module

let board; // Chessboard.js instance
let game = new Chess(); // Chess.js game instance
let userTeam = null; // User's team (0 = white, 1 = black, null = spectator)

// DOM elements
const currentTurnElement = document.getElementById('currentTurn');
const userTeamElement = document.getElementById('userTeam');
const gameStatusElement = document.getElementById('gameStatus');
const moveStatusElement = document.getElementById('moveStatus');

// Message timeout ID for clearing
let messageTimeoutId = null;

/**
 * Initialize the chess board
 */
function initializeChessBoard() {
    const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };
    
    board = Chessboard('board', config);
    window.addEventListener('resize', board.resize);
}

/**
 * Display a status message with auto-fade after 4 seconds
 * @param {string} message - The message to display
 * @param {string} elementId - The ID of the element to update
 */
function showTemporaryMessage(message, elementId = 'moveStatus') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Clear any existing timeout
    if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
    }
    
    // Display the message
    element.textContent = message;
    element.style.opacity = '1';
    
    // Set timeout to fade the message
    messageTimeoutId = setTimeout(() => {
        // Fade out effect
        element.style.transition = 'opacity 1s';
        element.style.opacity = '0';
        
        // Clear the message after fade
        setTimeout(() => {
            element.textContent = '';
            element.style.transition = '';
            element.style.opacity = '1';
        }, 1000);
    }, 4000);
}

/**
 * Update the chess board from blockchain data
 * @param {Array<number>} boardData - Array of pieces (0-12)
 */
function updateChessBoard(boardData) {
    // Reset the chess.js game to empty board
    game = new Chess();
    game.clear();
    
    // Convert the board data to FEN notation piece placement
    let fenBoard = '';
    
    // Map from our piece numbers to FEN characters
    const pieceToFen = {
        0: '', // empty
        1: 'P', 2: 'N', 3: 'B', 4: 'R', 5: 'Q', 6: 'K', // white pieces
        7: 'p', 8: 'n', 9: 'b', 10: 'r', 11: 'q', 12: 'k' // black pieces
    };
    
    // Create position for chess.js
    let position = {};
    
    // Convert from our board representation to chess.js position
    for (let rank = 7; rank >= 0; rank--) {
        for (let file = 0; file < 8; file++) {
            const index = rank * 8 + file;
            const piece = parseInt(boardData[index]);
            
            if (piece !== 0) {
                const square = String.fromCharCode('a'.charCodeAt(0) + file) + (rank + 1);
                const fenPiece = pieceToFen[piece];
                
                // Add to position object for chessboard.js
                if (fenPiece) {
                    const color = (piece <= 6) ? 'w' : 'b';
                    const pieceType = fenPiece.toLowerCase();
                    position[square] = color + pieceType;
                    
                    // Also manually place piece in chess.js
                    game.put({ type: pieceType, color: color === 'w' ? 'w' : 'b' }, square);
                }
            }
        }
    }
    
    console.log('Updated chess.js board:', game.fen());
    console.log('Position for chessboard:', position);
    
    // Update the visual board
    board.position(position, false);
}

/**
 * Update the game UI based on the current state
 * @param {Object} gameState - Game state from the blockchain
 */
function updateGameUI(gameState) {
    // Update turn indicator
    if (gameState.activeColor === TEAM.WHITE) {
        currentTurnElement.textContent = 'White';
        // Also update the chess.js turn
        game.load(game.fen().replace(/ (b|w) /, ' w '));
    } else {
        currentTurnElement.textContent = 'Black';
        // Also update the chess.js turn
        game.load(game.fen().replace(/ (b|w) /, ' b '));
    }
    
    // Update game status
    if (gameState.gameOver) {
        let winMessage = "";
        if (gameState.winner === GAME_STATUS.WHITE_WINS) {
            winMessage = 'Game Over - White Wins!';
        } else if (gameState.winner === GAME_STATUS.BLACK_WINS) {
            winMessage = 'Game Over - Black Wins!';
        } else if (gameState.winner === GAME_STATUS.DRAW) {
            winMessage = 'Game Over - Draw!';
        }
        
        gameStatusElement.textContent = winMessage;
        
        // Display a prominent win message
        if (winMessage !== "") {
            showWinMessage(winMessage);
        }
    } else {
        gameStatusElement.textContent = 'In Progress';
    }
    
    // Update user team display
    if (userTeam === TEAM.WHITE) {
        userTeamElement.textContent = 'White';
    } else if (userTeam === TEAM.BLACK) {
        userTeamElement.textContent = 'Black';
    } else {
        userTeamElement.textContent = 'None (Spectator)';
    }
}

/**
 * Show a prominent win message
 * @param {string} message - The win message to display
 */
function showWinMessage(message) {
    // Check if we already have a win message displayed
    let winMessageElement = document.getElementById('winMessage');
    
    if (!winMessageElement) {
        // Create a new win message element
        winMessageElement = document.createElement('div');
        winMessageElement.id = 'winMessage';
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        
        closeButton.addEventListener('click', () => {
            document.body.removeChild(winMessageElement);
        });
        
        winMessageElement.textContent = message;
        winMessageElement.appendChild(document.createElement('br'));
        winMessageElement.appendChild(closeButton);
        
        document.body.appendChild(winMessageElement);
    } else {
        // Update existing win message
        winMessageElement.textContent = message;
    }
}

/**
 * Validate start position of dragged piece
 * @param {string} source - Source square in algebraic notation (e.g., 'e2')
 * @param {string} piece - Piece notation (e.g., 'wP' for white pawn)
 * @param {Object} position - Current board position
 * @param {string} orientation - Board orientation ('white' or 'black')
 * @returns {boolean} True if the move is allowed to start
 */
function onDragStart(source, piece, position, orientation) {
    // Log for debugging
    console.log('Drag start:', source, piece);
    console.log('Current turn:', currentTurnElement.textContent);
    console.log('User team:', userTeam);
    console.log('Game turn in chess.js:', game.turn());
    
    // Do not allow moves if game is over
    if (gameStatusElement.textContent.includes('Game Over')) {
        showTemporaryMessage("Game is over. No more moves allowed.");
        return false;
    }
    
    // Check if it's user's turn based on the blockchain state
    const currentColorTurn = currentTurnElement.textContent === 'White' ? TEAM.WHITE : TEAM.BLACK;
    if (userTeam !== currentColorTurn) {
        showTemporaryMessage("It's not your team's turn.");
        return false;
    }
    
    // Check if the piece belongs to the current turn
    const pieceColor = piece.charAt(0);
    const isWhiteTurn = currentTurnElement.textContent === 'White';
    
    if ((isWhiteTurn && pieceColor !== 'w') || (!isWhiteTurn && pieceColor !== 'b')) {
        showTemporaryMessage("You can only move pieces of your color.");
        return false;
    }
    
    return true;
}

/**
 * Handle piece drop
 * @param {string} source - Source square in algebraic notation
 * @param {string} target - Target square in algebraic notation
 * @param {string} piece - Piece notation
 * @param {Object} newPos - New board position
 * @param {Object} oldPos - Old board position
 * @param {string} orientation - Board orientation
 * @returns {string|boolean} 'snapback' to cancel the move, true to accept
 */
function onDrop(source, target, piece, newPos, oldPos, orientation) {
    // Log for debugging
    console.log('Drop:', source, target, piece);
    console.log('Chess.js state before move:', game.fen());
    
    // Set the correct turn in chess.js
    const currentTurn = currentTurnElement.textContent === 'White' ? 'w' : 'b';
    const fen = game.fen();
    const parts = fen.split(' ');
    parts[1] = currentTurn;
    game.load(parts.join(' '));
    
    console.log('Updated turn in chess.js:', game.turn());
    
    // Try the move in chess.js
    let move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to a queen for simplicity
    });
    
    console.log('Move result:', move);
    
    if (move === null) {
        showTemporaryMessage("Invalid move according to chess rules.");
        return 'snapback';
    }
    
    // Convert chess notation to 0-63 index
    const fromSquare = squareToIndex(source);
    const toSquare = squareToIndex(target);
    
    // Check for promotion
    let promotion = 0;
    const isPawnMovingToLastRank = 
        (piece === 'wP' && target[1] === '8') || 
        (piece === 'bP' && target[1] === '1');
    
    if (isPawnMovingToLastRank) {
        // Default promotion to queen for simplicity
        promotion = 1; // 1 = queen
    }
    
    // Submit move to the blockchain
    submitMove(fromSquare, toSquare, promotion);
    
    return true;
}

/**
 * Update the board when the move is complete
 */
function onSnapEnd() {
    // Update the board position after the piece snap
    board.position(game.fen(), false);
}

/**
 * Convert chess notation (a1-h8) to index (0-63)
 * @param {string} square - Chess notation square
 * @returns {number} Board index (0-63)
 */
function squareToIndex(square) {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(square[1]) - 1;
    return rank * 8 + file;
}

/**
 * Convert index (0-63) to chess notation (a1-h8)
 * @param {number} index - Board index
 * @returns {string} Chess notation square
 */
function indexToSquare(index) {
    const file = String.fromCharCode('a'.charCodeAt(0) + (index % 8));
    const rank = Math.floor(index / 8) + 1;
    return file + rank;
}

/**
 * Submit a move to the blockchain
 * @param {number} fromSquare - Source square (0-63)
 * @param {number} toSquare - Target square (0-63)
 * @param {number} promotion - Promotion piece (0-4)
 */
async function submitMove(fromSquare, toSquare, promotion) {
    showTemporaryMessage('Submitting move to the blockchain...');
    
    try {
        console.log('Submitting move:', fromSquare, toSquare, promotion);
        const success = await makeMove(fromSquare, toSquare, promotion);
        
        if (success) {
            showTemporaryMessage('Move submitted successfully!');
            // Update the game state after the move
            await updateGameState();
        } else {
            showTemporaryMessage('Error making move. Please try again.');
            // Reset the board to the state from the blockchain
            await updateGameState();
        }
    } catch (error) {
        console.error('Error submitting move:', error);
        showTemporaryMessage('Error: ' + error.message);
        // Reset the board to the state from the blockchain
        await updateGameState();
    }
}

/**
 * Refresh the game state from the blockchain
 */
async function updateGameState() {
    try {
        const boardData = await getBoardState();
        const gameState = await getGameState();
        
        if (boardData && gameState) {
            updateChessBoard(boardData);
            updateGameUI(gameState);
        } else {
            gameStatusElement.textContent = 'Error fetching game state';
        }
    } catch (error) {
        console.error('Error updating game state:', error);
        gameStatusElement.textContent = 'Error fetching game state';
    }
}