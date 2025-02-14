const boardSize = 15;
const board = document.getElementById('board');
const currentPlayerDisplay = document.getElementById('current-player');
const restartButton = document.getElementById('restart');
const modeInputs = document.querySelectorAll('input[name="mode"]');

let gameState = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
let currentPlayer = 'black';
let isGameOver = false;
let isAIMode = true;

function createBoard() {
    board.innerHTML = '';
    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = i;
            cell.dataset.col = j;
            
            // 添加内部网格线
            const gridLine = document.createElement('div');
            gridLine.classList.add('grid-line');
            cell.appendChild(gridLine);
            
            cell.addEventListener('click', handleCellClick);
            board.appendChild(cell);
        }
    }
}

function handleCellClick(event) {
    if (isGameOver || (currentPlayer === 'white' && isAIMode)) return;
    
    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);
    
    if (gameState[row][col]) return;
    
    makeMove(row, col);
    
    if (isAIMode && !isGameOver) {
        setTimeout(makeAIMove, 500);
    }
}

function makeMove(row, col) {
    gameState[row][col] = currentPlayer;
    placePiece(row, col, currentPlayer);
    
    if (checkWinner(row, col)) {
        isGameOver = true;
        alert(currentPlayer === 'black' ? '黑子胜利！' : '白子胜利！');
        return;
    }
    
    currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
    updatePlayerDisplay();
}

function placePiece(row, col, player) {
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (!cell) return;

    const piece = document.createElement('div');
    piece.className = `piece ${player}`;
    
    // 使用 transform 来居中定位棋子
    piece.style.transform = 'translate(-50%, -50%)';
    piece.style.left = '50%';
    piece.style.top = '50%';
    
    cell.appendChild(piece);
}

function makeAIMove() {
    const move = findBestMove();
    if (move) {
        makeMove(move.row, move.col);
    }
}

function findBestMove() {
    let bestScore = -Infinity;
    let bestMoves = [];
    
    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
            if (!gameState[i][j]) {
                const score = evaluatePosition(i, j);
                
                // 如果找到更好的分数，清空之前的移动并记录新的
                if (score > bestScore) {
                    bestScore = score;
                    bestMoves = [{row: i, col: j}];
                }
                // 如果分数相同，添加到可能的移动列表中
                else if (score === bestScore) {
                    bestMoves.push({row: i, col: j});
                }
            }
        }
    }
    
    // 从最佳移动中随机选择一个，增加游戏的变化性
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function evaluatePosition(row, col) {
    let score = 0;
    const directions = [
        [1, 0], [0, 1], [1, 1], [1, -1]  // 水平、垂直、对角线方向
    ];
    
    // 评估每个方向的棋型
    for (const [dx, dy] of directions) {
        score += evaluateDirection(row, col, dx, dy);
    }
    
    // 根据位置给予额外分数
    score += evaluatePositionalAdvantage(row, col);
    
    return score;
}

function evaluatePositionalAdvantage(row, col) {
    let score = 0;
    
    // 中心位置权重
    const centerWeight = 3;
    const centerDistance = Math.abs(row - 7) + Math.abs(col - 7);
    score -= centerDistance * centerWeight;
    
    // 如果在边缘，降低分数
    if (row === 0 || row === 14 || col === 0 || col === 14) {
        score -= 10;
    }
    
    return score;
}

function evaluateDirection(row, col, dx, dy) {
    let score = 0;
    const patterns = {
        black: Array(9).fill(false),  // 记录黑子分布
        white: Array(9).fill(false),  // 记录白子分布
        empty: Array(9).fill(true)    // 记录空位分布
    };
    
    // 分析周围9个位置（中心位置为4）
    for (let i = -4; i <= 4; i++) {
        const newRow = row + dx * i;
        const newCol = col + dy * i;
        if (!isValidPosition(newRow, newCol)) continue;
        
        const piece = gameState[newRow][newCol];
        if (piece === 'black') {
            patterns.black[i + 4] = true;
            patterns.empty[i + 4] = false;
        } else if (piece === 'white') {
            patterns.white[i + 4] = true;
            patterns.empty[i + 4] = false;
        }
    }
    
    // 评估黑子和白子的威胁
    score += evaluatePattern(patterns, 'white');  // AI(白子)的进攻分数
    score += evaluatePattern(patterns, 'black') * 1.1;  // 对手(黑子)的威胁分数，略微提高防守权重
    
    return score;
}

function evaluatePattern(patterns, player) {
    let score = 0;
    const opponent = player === 'black' ? 'white' : 'black';
    
    // 连五
    if (hasConsecutive(patterns[player], 5)) {
        return 1000000;
    }
    
    // 对手连五或连四，立即防守
    if (hasConsecutive(patterns[opponent], 4)) {
        return 900000;
    }

    // 己方连四
    if (hasConsecutive(patterns[player], 4)) {
        return 800000;
    }
    
    // 活四或双四
    const openFours = countOpenFour(patterns, player);
    const opponentOpenFours = countOpenFour(patterns, opponent);
    
    if (opponentOpenFours >= 1) {
        score += 100000;  // 提高对对手活四的防守权重
    }
    
    if (openFours >= 1) {
        score += 50000;
    }
    
    // 活三
    const openThrees = countOpenThree(patterns, player);
    const opponentOpenThrees = countOpenThree(patterns, opponent);
    
    if (opponentOpenThrees >= 1) {
        score += 20000;  // 提高对对手活三的防守权重
    }
    
    if (openThrees >= 2) {
        score += 10000;
    } else if (openThrees === 1) {
        score += 5000;
    }
    
    // 连续三子（包括被封住的）
    if (hasConsecutive(patterns[opponent], 3)) {
        score += 15000;  // 加强对连续三子的防守
    }
    
    // 活二
    const openTwos = countOpenTwo(patterns, player);
    const opponentOpenTwos = countOpenTwo(patterns, opponent);
    
    if (opponentOpenTwos >= 2) {
        score += 3000;  // 提高对对手双活二的防守权重
    }
    
    score += openTwos * 1000;
    
    // 眠三
    const sleepingThrees = countSleepingThree(patterns, player);
    const opponentSleepingThrees = countSleepingThree(patterns, opponent);
    
    score += opponentSleepingThrees * 800;  // 提高对对手眠三的防守权重
    score += sleepingThrees * 500;
    
    // 眠二
    const sleepingTwos = countSleepingTwo(patterns, player);
    score += sleepingTwos * 100;
    
    return score;
}

function hasConsecutive(arr, count) {
    // 改进连续棋子的检测
    for (let i = 0; i <= arr.length - count; i++) {
        let consecutive = true;
        for (let j = 0; j < count; j++) {
            if (!arr[i + j]) {
                consecutive = false;
                break;
            }
        }
        if (consecutive) return true;
    }
    return false;
}

function countOpenFour(patterns, player) {
    const p = patterns[player];
    const e = patterns.empty;
    let count = 0;
    
    // ○●●●●○ 活四
    for (let i = 0; i <= 4; i++) {
        if (e[i] && p[i+1] && p[i+2] && p[i+3] && p[i+4] && e[i+5]) {
            count++;
        }
    }
    
    return count;
}

function countOpenThree(patterns, player) {
    const p = patterns[player];
    const e = patterns.empty;
    let count = 0;
    
    // ○●●●○ 活三
    for (let i = 0; i <= 5; i++) {
        if (e[i] && p[i+1] && p[i+2] && p[i+3] && e[i+4]) {
            count++;
        }
    }
    
    return count;
}

function countOpenTwo(patterns, player) {
    const p = patterns[player];
    const e = patterns.empty;
    let count = 0;
    
    // ○●●○ 活二
    for (let i = 0; i <= 6; i++) {
        if (e[i] && p[i+1] && p[i+2] && e[i+3]) {
            count++;
        }
    }
    
    return count;
}

function countSleepingThree(patterns, player) {
    const p = patterns[player];
    const e = patterns.empty;
    let count = 0;
    
    // ■●●●○ 眠三
    for (let i = 0; i <= 5; i++) {
        if (!e[i] && !p[i] && p[i+1] && p[i+2] && p[i+3] && e[i+4]) {
            count++;
        }
    }
    
    return count;
}

function countSleepingTwo(patterns, player) {
    const p = patterns[player];
    const e = patterns.empty;
    let count = 0;
    
    // ■●●○ 眠二
    for (let i = 0; i <= 6; i++) {
        if (!e[i] && !p[i] && p[i+1] && p[i+2] && e[i+3]) {
            count++;
        }
    }
    
    return count;
}

function checkWinner(row, col) {
    const directions = [
        [1, 0], [0, 1], [1, 1], [1, -1]
    ];
    
    for (const [dx, dy] of directions) {
        let count = 1;
        
        // 检查正方向
        for (let i = 1; i <= 4; i++) {
            const newRow = row + dx * i;
            const newCol = col + dy * i;
            if (!isValidPosition(newRow, newCol) || 
                gameState[newRow][newCol] !== currentPlayer) break;
            count++;
        }
        
        // 检查负方向
        for (let i = 1; i <= 4; i++) {
            const newRow = row - dx * i;
            const newCol = col - dy * i;
            if (!isValidPosition(newRow, newCol) || 
                gameState[newRow][newCol] !== currentPlayer) break;
            count++;
        }
        
        if (count >= 5) return true;
    }
    
    return false;
}

function isValidPosition(row, col) {
    return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

function updatePlayerDisplay() {
    const blackPiece = document.querySelector('.piece-icon.black');
    const whitePiece = document.querySelector('.piece-icon.white');
    
    if (currentPlayer === 'black') {
        blackPiece.classList.add('active');
        whitePiece.classList.remove('active');
        currentPlayerDisplay.textContent = '黑子';
    } else {
        blackPiece.classList.remove('active');
        whitePiece.classList.add('active');
        currentPlayerDisplay.textContent = '白子';
    }
}

function restartGame() {
    gameState = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
    currentPlayer = 'black';
    isGameOver = false;
    updatePlayerDisplay();
    createBoard();
}

// 事件监听器
restartButton.addEventListener('click', restartGame);
modeInputs.forEach(input => {
    input.addEventListener('change', (e) => {
        isAIMode = e.target.value === 'ai';
        restartGame();
    });
});

// 初始化游戏
createBoard();
