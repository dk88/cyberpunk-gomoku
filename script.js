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
                console.log(`Evaluating position (${i}, ${j}): score = ${score}`);  // 调试信息
                
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
    
    console.log(`Best moves: ${JSON.stringify(bestMoves)}`);  // 调试信息
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function evaluatePosition(row, col) {
    if (gameState[row][col]) return -1;  // 已有棋子的位置无效
    
    const directions = [
        [1, 0], [0, 1], [1, 1], [1, -1]
    ];
    
    let score = 0;
    const aiPlayer = 'white';
    const humanPlayer = 'black';
    
    // 首先检查是否有紧急防守点
    for (const [dx, dy] of directions) {
        // 检查玩家是否有连续四子
        if (hasFourInRow(row, col, dx, dy, humanPlayer)) {
            return 900000;  // 必须立即防守
        }
    }
    
    // 然后检查是否有制胜点
    for (const [dx, dy] of directions) {
        // 检查AI是否有连续四子
        if (hasFourInRow(row, col, dx, dy, aiPlayer)) {
            return 1000000;  // 必须立即落子取胜
        }
    }
    
    // 如果没有紧急情况，进行常规评估
    for (const [dx, dy] of directions) {
        const aiPatterns = evaluateDirection(row, col, dx, dy, aiPlayer);
        const humanPatterns = evaluateDirection(row, col, dx, dy, humanPlayer);
        
        score += evaluatePattern(aiPatterns, aiPlayer);
        score += evaluatePattern(humanPatterns, humanPlayer) * 1.2;  // 略微提高防守权重
    }
    
    score += getPositionWeight(row, col);
    return score;
}

function hasFourInRow(row, col, dx, dy, player) {
    const tempState = gameState[row][col];
    gameState[row][col] = player;
    
    let consecutive = 1;  // 包含当前位置
    
    // 向一个方向检查
    for (let i = 1; i <= 4; i++) {
        const newRow = row + dx * i;
        const newCol = col + dy * i;
        if (!isValidPosition(newRow, newCol) || gameState[newRow][newCol] !== player) break;
        consecutive++;
    }
    
    // 向相反方向检查
    for (let i = 1; i <= 4; i++) {
        const newRow = row - dx * i;
        const newCol = col - dy * i;
        if (!isValidPosition(newRow, newCol) || gameState[newRow][newCol] !== player) break;
        consecutive++;
    }
    
    gameState[row][col] = tempState;
    return consecutive >= 4;
}

function evaluatePattern(patterns, player) {
    let score = 0;
    const piece = player === 'white' ? 'W' : 'B';
    
    // 检查连五
    if (patterns.some(p => p.includes(piece.repeat(5)))) {
        return 100000;
    }
    
    // 检查活四
    const openFours = countOpenFour(patterns, player);
    if (openFours >= 1) {
        return 50000;
    }
    
    // 检查冲四
    const sleepingFours = countSleepingFour(patterns, player);
    if (sleepingFours >= 1) {
        return 40000;
    }
    
    // 活三
    const openThrees = countOpenThree(patterns, player);
    if (openThrees >= 2) {
        score += 10000;  // 双活三
    } else if (openThrees === 1) {
        score += 3000;   // 单活三
    }
    
    // 活二
    const openTwos = countOpenTwo(patterns, player);
    if (openTwos >= 2) {
        score += 1000;   // 双活二
    } else if (openTwos === 1) {
        score += 300;    // 单活二
    }
    
    // 眠三
    const sleepingThrees = countSleepingThree(patterns, player);
    if (sleepingThrees >= 1) {
        score += 500;
    }
    
    // 眠二
    const sleepingTwos = countSleepingTwo(patterns, player);
    if (sleepingTwos >= 1) {
        score += 100;
    }
    
    // 特殊棋型组合加分
    if (player === 'white') {  // AI进攻组合
        if (openThrees >= 1 && openTwos >= 1) {
            score += 2000;  // 活三活二组合
        }
        if (sleepingThrees >= 2) {
            score += 1000;  // 双眠三
        }
    } else {  // 人类玩家的威胁组合
        if (openThrees >= 1 && openTwos >= 1) {
            score += 3000;  // 提高对玩家活三活二组合的重视
        }
        if (sleepingThrees >= 2) {
            score += 1500;  // 提高对玩家双眠三的重视
        }
    }
    
    return score;
}

function countOpenFour(patterns, player) {
    const open4Pattern = player === 'white' ? 'OWWWW_' : 'OBBBB_';
    const reverse4Pattern = player === 'white' ? '_WWWWO' : '_BBBBO';
    return patterns.filter(p => 
        p.includes(open4Pattern) || 
        p.includes(reverse4Pattern)
    ).length;
}

function countOpenThree(patterns, player) {
    const open3Pattern = player === 'white' ? 'OWWW_' : 'OBBB_';
    const reverse3Pattern = player === 'white' ? '_WWWO' : '_BBBO';
    return patterns.filter(p => 
        p.includes(open3Pattern) || 
        p.includes(reverse3Pattern)
    ).length;
}

function countOpenTwo(patterns, player) {
    const open2Pattern = player === 'white' ? 'OWW_' : 'OBB_';
    const reverse2Pattern = player === 'white' ? '_WWO' : '_BBO';
    return patterns.filter(p => 
        p.includes(open2Pattern) || 
        p.includes(reverse2Pattern)
    ).length;
}

function countSleepingThree(patterns, player) {
    const sleep3Pattern = player === 'white' ? 'XWWW_' : 'XBBB_';
    const reverse3Pattern = player === 'white' ? '_WWWX' : '_BBBX';
    return patterns.filter(p => 
        p.includes(sleep3Pattern) || 
        p.includes(reverse3Pattern)
    ).length;
}

function countSleepingTwo(patterns, player) {
    const sleep2Pattern = player === 'white' ? 'XWW_' : 'XBB_';
    const reverse2Pattern = player === 'white' ? '_WWX' : '_BBX';
    return patterns.filter(p => 
        p.includes(sleep2Pattern) || 
        p.includes(reverse2Pattern)
    ).length;
}

function countSleepingFour(patterns, player) {
    const sleep4Pattern = player === 'white' ? 'XWWWW_' : 'XBBBB_';
    const reverse4Pattern = player === 'white' ? '_WWWWX' : '_BBBBX';
    const sleep4Pattern2 = player === 'white' ? 'WWWW_' : 'BBBB_';
    const reverse4Pattern2 = player === 'white' ? '_WWWW' : '_BBBB';
    return patterns.filter(p => 
        p.includes(sleep4Pattern) || 
        p.includes(reverse4Pattern) ||
        p.includes(sleep4Pattern2) ||
        p.includes(reverse4Pattern2)
    ).length;
}

function hasConsecutive(patterns, count) {
    const consecutivePattern = player => {
        const piece = player === 'white' ? 'W' : 'B';
        return piece.repeat(count);
    };
    
    return patterns.some(pattern => pattern.includes(consecutivePattern('white')) || 
                                  pattern.includes(consecutivePattern('black')));
}

function evaluateDirection(row, col, dx, dy, player) {
    const patterns = [];
    let pattern = 'O';  // 开始标记
    
    // 正向检查
    for (let i = 1; i <= 5; i++) {
        const newRow = row + dx * i;
        const newCol = col + dy * i;
        if (!isValidPosition(newRow, newCol)) {
            pattern += 'X';  // 边界
            break;
        }
        const piece = gameState[newRow][newCol];
        if (!piece) pattern += '_';  // 空位
        else if (piece === player) pattern += player === 'white' ? 'W' : 'B';
        else {
            pattern += 'X';  // 对手的棋子
            break;
        }
    }
    
    patterns.push(pattern);
    pattern = 'O';  // 重置模式
    
    // 反向检查
    for (let i = 1; i <= 5; i++) {
        const newRow = row - dx * i;
        const newCol = col - dy * i;
        if (!isValidPosition(newRow, newCol)) {
            pattern += 'X';
            break;
        }
        const piece = gameState[newRow][newCol];
        if (!piece) pattern += '_';
        else if (piece === player) pattern += player === 'white' ? 'W' : 'B';
        else {
            pattern += 'X';
            break;
        }
    }
    
    patterns.push(pattern);
    return patterns;
}

function getPositionWeight(row, col) {
    // 棋盘中心位置权重更高
    const centerWeight = 3;
    const centerRow = Math.floor(boardSize / 2);
    const centerCol = Math.floor(boardSize / 2);
    const distanceFromCenter = Math.sqrt(
        Math.pow(row - centerRow, 2) + 
        Math.pow(col - centerCol, 2)
    );
    
    return Math.max(0, centerWeight - distanceFromCenter * 0.2);
}

function checkWinner(row, col) {
    const directions = [
        [1, 0],   // 水平
        [0, 1],   // 垂直
        [1, 1],   // 对角线
        [1, -1]   // 反对角线
    ];
    
    for (const [dx, dy] of directions) {
        let count = 1;
        let winningPieces = [[row, col]];
        
        // 正向检查
        for (let i = 1; i < 5; i++) {
            const newRow = row + dx * i;
            const newCol = col + dy * i;
            if (!isValidPosition(newRow, newCol) || gameState[newRow][newCol] !== currentPlayer) break;
            count++;
            winningPieces.push([newRow, newCol]);
        }
        
        // 反向检查
        for (let i = 1; i < 5; i++) {
            const newRow = row - dx * i;
            const newCol = col - dy * i;
            if (!isValidPosition(newRow, newCol) || gameState[newRow][newCol] !== currentPlayer) break;
            count++;
            winningPieces.push([newRow, newCol]);
        }
        
        if (count >= 5) {
            // 高亮获胜棋子
            winningPieces.forEach(([r, c]) => {
                const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"] .piece`);
                if (cell) {
                    cell.classList.add('winner');
                }
            });
            return true;
        }
    }
    
    return false;
}

function isValidPosition(row, col) {
    return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

function updatePlayerDisplay() {
    const display = document.getElementById('current-player');
    display.textContent = currentPlayer === 'black' ? '黑子' : '白子';
    display.className = `current-player-display ${currentPlayer}`;
}

function restartGame() {
    gameState = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
    currentPlayer = 'black';
    isGameOver = false;
    
    // 清除所有棋子
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.innerHTML = '';
    });
    
    // 移除所有获胜高亮效果
    const winners = document.querySelectorAll('.winner');
    winners.forEach(winner => {
        winner.classList.remove('winner');
    });
    
    updatePlayerDisplay();
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
