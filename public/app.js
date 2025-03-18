// Main application logic

// DOM Elements
const loginContainer = document.getElementById('loginContainer');
const chessContainer = document.getElementById('chessContainer');
const userInfo = document.getElementById('userInfo');
const adminPanel = document.getElementById('adminPanel');
const loginButton = document.getElementById('loginButton');
const resetButton = document.getElementById('resetButton');
const addWhiteButton = document.getElementById('addWhiteButton');
const addBlackButton = document.getElementById('addBlackButton');
const playerAddressInput = document.getElementById('playerAddress');

// State tracking
let refreshInterval = null;

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Login event handler
loginButton.addEventListener('click', async () => {
    const success = await initializeWeb3();
    
    if (success) {
        await loginSuccess();
    }
});

// Reset game button event handler
resetButton.addEventListener('click', async () => {
    if (await resetGame()) {
        alert('Game reset successfully!');
        await updateGameState(); // Force refresh
    } else {
        alert('Error resetting game.');
    }
});

// Add player to white team button event handler
addWhiteButton.addEventListener('click', async () => {
    const playerAddress = playerAddressInput.value.trim();
    
    if (await addPlayerToTeam(playerAddress, TEAM.WHITE)) {
        alert('Player added to white team successfully!');
        playerAddressInput.value = '';
    } else {
        alert('Error adding player to white team. Check the address and try again.');
    }
});

// Add player to black team button event handler
addBlackButton.addEventListener('click', async () => {
    const playerAddress = playerAddressInput.value.trim();
    
    if (await addPlayerToTeam(playerAddress, TEAM.BLACK)) {
        alert('Player added to black team successfully!');
        playerAddressInput.value = '';
    } else {
        alert('Error adding player to black team. Check the address and try again.');
    }
});

/**
 * Handle successful login
 */
async function loginSuccess() {
    // Update UI
    loginContainer.style.display = 'none';
    chessContainer.style.display = 'block';
    
    if (isOwner) {
        adminPanel.style.display = 'block';
        userInfo.innerHTML = `<p>Logged in as: ${userAddress} (Owner)</p>`;
    } else {
        userInfo.innerHTML = `<p>Logged in as: ${userAddress}</p>`;
    }
    
    // Check which team the user is on
    userTeam = await checkUserTeam();
    
    // Initialize the chess board
    initializeChessBoard();
    
    // Important: Wait a moment before loading the game state to ensure the board is ready
    setTimeout(async () => {
        console.log("Fetching initial game state...");
        // Immediately load the current game state
        await updateGameState();
        
        // Set up refresh interval - more frequent polling for smoother gameplay
        startGameStatePolling();
    }, 500);
    
    // Make sure to clear the interval when the page is closed or refreshed
    window.addEventListener('beforeunload', () => {
        stopGameStatePolling();
    });
}

/**
 * Start polling for game state updates
 */
function startGameStatePolling() {
    // Clear any existing interval
    stopGameStatePolling();
    
    // Set up a new polling interval - check every 2 seconds
    refreshInterval = setInterval(() => {
        console.log("Polling for game state updates...");
        updateGameState();
    }, 2000); // 2 seconds
    
    console.log('Game state polling started');
}

/**
 * Stop polling for game state updates
 */
function stopGameStatePolling() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
        console.log('Game state polling stopped');
    }
}

// Add a refresh button for manual refresh
document.addEventListener('DOMContentLoaded', function() {
    // Create a refresh button
    const refreshButton = document.createElement('button');
    refreshButton.textContent = 'Refresh Board';
    refreshButton.style.marginTop = '10px';
    
    // Add event listener
    refreshButton.addEventListener('click', () => {
        console.log('Manual refresh requested');
        updateGameState();
    });
    
    // Add to the page
    const boardElement = document.getElementById('board');
    if (boardElement && boardElement.parentNode) {
        boardElement.parentNode.insertBefore(refreshButton, boardElement.nextSibling);
    }
});