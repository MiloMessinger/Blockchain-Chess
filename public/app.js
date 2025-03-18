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
        await updateGameState();
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
    
    // Update game state
    await updateGameState();
    
    // Set up refresh interval
    setInterval(updateGameState, REFRESH_INTERVAL);
}