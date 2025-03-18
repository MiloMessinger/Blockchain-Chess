// Chess UI handling module

let board; // Chessboard.js instance
let game = new Chess(); // Chess.js game instance
let userTeam = null; // User's team (0 = white, 1 = black, null = spectator)
let lastMove = null; // Store the last move for highlighting

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
    console.log('Chess board initialized');
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
    console.log('Updating board with new state:', boardData);
    
    // Reset the chess.js game to empty board
    game = new Chess();
    game.clear();
    
    // Create position for chess.js
    let position = {};
    
    // Convert from our board representation to chess.js position
    for (let i = 0; i < boardData.length; i++) {
        const piece = parseInt(boardData[i]);
        if (piece !== 0) {
            // Convert from 0-63 to chess notation (a1-h8)
            const file = String.fromCharCode('a'.charCodeAt(0) + (i % 8));
            const rank = Math.floor(i / 8) + 1;
            const square = file + rank;
            
            // Map our piece numbers to chessboard.js piece notation
            let pieceNotation = '';
            switch (piece) {
                case 1: pieceNotation = 'wP'; break; // White pawn
                case 2: pieceNotation = 'wN'; break; // White knight
                case 3: pieceNotation = 'wB'; break; // White bishop
                case 4: pieceNotation = 'wR'; break; // White rook
                case 5: pieceNotation = 'wQ'; break; // White queen
                case 6: pieceNotation = 'wK'; break; // White king
                case 7: pieceNotation = 'bP'; break; // Black pawn
                case 8: pieceNotation = 'bN'; break; // Black knight
                case 9: pieceNotation = 'bB'; break; // Black bishop
                case 10: pieceNotation = 'bR'; break; // Black rook
                case 11: pieceNotation = 'bQ'; break; // Black queen
                case 12: pieceNotation = 'bK'; break; // Black king
            }
            
            position[square] = pieceNotation;
            
            // Also add to chess.js game
            if (pieceNotation) {
                const color = pieceNotation.charAt(0) === 'w' ? 'w' : 'b';
                const type = pieceNotation.charAt(1).toLowerCase();
                game.put({ type, color }, square);
            }
        }
    }
    
    console.log('Position object for chessboard:', position);
    console.log('Updated chess.js board FEN:', game.fen());
    
    // Update the visual board
    board.position(position, true); // true = animate
    
    // Highlight the last move if there is one
    highlightLastMove();
}

/**
 * Highlight the last move on the board
 */
function highlightLastMove() {
    // Remove any existing highlights
    removeHighlights();
    
    // If there's a last move, highlight the squares
    if (lastMove) {
        // Add highlight styling
        const fromSquare = document.querySelector(`.square-${lastMove.from}`);
        const toSquare = document.querySelector(`.square-${lastMove.to}`);
        
        if (fromSquare) fromSquare.classList.add('highlight-from');
        if (toSquare) toSquare.classList.add('highlight-to');
    }
}

/**
 * Remove all highlights from the board
 */
function removeHighlights() {
    // Remove highlight styling from all squares
    const highlights = document.querySelectorAll('.highlight-from, .highlight-to');
    highlights.forEach(square => {
        square.classList.remove('highlight-from');
        square.classList.remove('highlight-to');
    });
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
        const fen = game.fen();
        const parts = fen.split(' ');
        parts[1] = 'w';
        game.load(parts.join(' '));
    } else {
        currentTurnElement.textContent = 'Black';
        // Also update the chess.js turn
        const fen = game.fen();
        const parts = fen.split(' ');
        parts[1] = 'b';
        game.load(parts.join(' '));
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
        // Check for checkmate and stalemate using chess.js
        if (game.in_checkmate()) {
            const winner = game.turn() === 'w' ? 'Black' : 'White';
            const winMessage = `Game Over - ${winner} Wins by Checkmate!`;
            gameStatusElement.textContent = winMessage;
            showWinMessage(winMessage);
        } else if (game.in_stalemate()) {
            const drawMessage = 'Game Over - Draw by Stalemate!';
            gameStatusElement.textContent = drawMessage;
            showWinMessage(drawMessage);
        } else if (game.in_draw()) {
            const drawMessage = 'Game Over - Draw!';
            gameStatusElement.textContent = drawMessage;
            showWinMessage(drawMessage);
        } else {
            gameStatusElement.textContent = 'In Progress';
            
            // Check for check
            if (game.in_check()) {
                const checkMessage = `${currentTurnElement.textContent} is in check!`;
                showTemporaryMessage(checkMessage);
            }
        }
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
    
    // Set the correct turn in chess.js
    const currentTurn = currentTurnElement.textContent === 'White' ? 'w' : 'b';
    const fen = game.fen();
    const parts = fen.split(' ');
    parts[1] = currentTurn;
    game.load(parts.join(' '));
    
    // Try the move in chess.js
    let move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to a queen for simplicity
    });
    
    if (move === null) {
        showTemporaryMessage("Invalid move according to chess rules.");
        return 'snapback';
    }
    
    console.log('Chess.js move result:', move);
    
    // Convert chess notation to 0-63 index
    const fromSquare = squareToIndex(source);
    const toSquare = squareToIndex(target);
    
    // Check for special moves
    let isCastling = false;
    let isEnPassant = move.flags.includes('e'); // En passant flag
    const isKing = piece === 'wK' || piece === 'bK';
    
    // Detect castling
    if (isKing && Math.abs(fromSquare % 8 - toSquare % 8) === 2) {
        isCastling = true;
        console.log('Castling detected');
    }
    
    // Log special moves
    if (isCastling) {
        console.log('Castling move:', source, 'to', target);
    }
    if (isEnPassant) {
        console.log('En passant capture:', source, 'to', target);
    }
    
    // Handle pawn promotion
    let promotion = 0;
    if (move.flags.includes('p')) { // Promotion flag
        promotion = 1; // Default to queen
        console.log('Promotion detected, promoting to queen');
    }
    
    // Store this move for highlighting
    lastMove = {
        from: source,
        to: target
    };
    
    // Submit move to the blockchain
    submitMove(fromSquare, toSquare, promotion);
    
    return true;
}

/**
 * Update the board when the move is complete
 */
function onSnapEnd() {
    // Update the board position after the piece snap
    board.position(game.fen());
    
    // Highlight the move
    highlightLastMove();
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
            // Immediate refresh after successful move
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
        console.log('Fetching current game state from blockchain...');
        const boardData = await getBoardState();
        const gameState = await getGameState();
        
        if (boardData && gameState) {
            console.log('Successfully received data from blockchain');
            // Always update the board and UI with the latest data
            updateChessBoard(boardData);
            updateGameUI(gameState);
        } else {
            console.error('Failed to get game state or board data');
            gameStatusElement.textContent = 'Error fetching game state';
        }
    } catch (error) {
        console.error('Error updating game state:', error);
        gameStatusElement.textContent = 'Error fetching game state';
    }
}