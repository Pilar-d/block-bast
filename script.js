const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const inventory = document.getElementById('inventory');
const  scoreEl = document.getElementById('score');

const ROWS = 8, COLS = 8, SIZE = 50;
let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
let score = 0;

const SHAPES = [
    [[0,0],[0,1],[1,0],[1,1]], // cuadrado
    [[0,0],[0,1],[0,2],[0,3]], // línea
    [[0,0],[1,0],[2,0],[2,1]], // L
    [[0,0],[0,1],[0,2]], // línea de 3
    [[0,0],[1,0],[0,1]], // esquina
    [[0,0],[0,1],[1,1],[1,2]], // z
];

const COLORS = ['#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93'];

//SONIDOS 

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(freq, type, duration) { 
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function initInventory() {
    inventory.innerHTML = '';
    for (let i = 0; i < 3; i++) createInventoryPiece();
}

function createInventoryPiece() {
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 100; pCanvas.height = 100;
    pCanvas.className = 'piece-canvas';
    pCanvas.draggable = true;

    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    
    pCanvas.dataset.shape = JSON.stringify(shape);
    pCanvas.dataset.color = color;

    const shapeWidth = Math.max(...shape.map(c => c[1])) + 1;
    const shapeHeight = Math.max(...shape.map(c => c[0])) + 1;
    const offsetX = (pCanvas.width - shapeWidth * 20) / 2;
    const offsetY = (pCanvas.height - shapeHeight * 20) / 2;

    const pCtx = pCanvas.getContext('2d');
    shape.forEach(([r,c]) => {
        pCtx.fillStyle = color;
        pCtx.beginPath();
        pCtx.roundRect(c * 20 + offsetX, r * 20 + offsetY, 18, 18, 4);
        pCtx.fill();
    });

    pCanvas.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('piece', pCanvas.dataset.shape);
        e.dataTransfer.setData('color', pCanvas.dataset.color);
        e.dataTransfer.setDragImage(pCanvas, 50, 50);
        setTimeout(() => pCanvas.style.visibility = 'hidden', 0);
    });

    pCanvas.addEventListener('dragend', (e) => {
        pCanvas.style.visibility = 'visible';
        if (e.dataTransfer.dropEffect !== 'none') {
            pCanvas.remove();
            if (inventory.children.length === 0) {
                initInventory();
            }
        }
    });
    inventory.appendChild(pCanvas);
}

let dragPreview = null;

canvas.addEventListener('dragover', (e) => {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left - 25) / SIZE);
    const row = Math.floor((e.clientY - rect.top - 25) / SIZE);

    const activePiece = document.querySelector('.piece-canvas[style*="hidden"]');
    if (activePiece) {
        const shape = JSON.parse(activePiece.dataset.shape);

        dragPreview = {row, col, valid: canPlace(row, col, shape)};
    }
    draw();

});

canvas.addEventListener('dragleave', () => {
    dragPreview = null;
    draw();
});

canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const shape = JSON.parse(e.dataTransfer.getData('piece'));
    const color = e.dataTransfer.getData('color');
    const rect = canvas.getBoundingClientRect();

    const col = Math.floor((e.clientX - rect.left - 25) / SIZE);
    const row = Math.floor((e.clientY - rect.top - 25) / SIZE); 

    if (canPlace(row, col, shape)) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        placePiece(row, col, shape, color);
        playSound(440, 'sine', 0.1);
        checkLines();
        dragPreview = null;
        draw();
        setTimeout(checkGameOver, 100);
    } else {
        e.dataTransfer.dropEffect = 'none';
        playSound(150, 'sawtooth', 0.2);

        canvas.classList.add('shake-animation');

        setTimeout(() =>  
            canvas.classList.remove('shake-animation'), 500);
    }
});

function canPlace(row, col, shape) {
    return shape.every(([dr,dc]) => {
        const nr = row + dr, nc = col + dc;
        return nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === 0;
    });
}

function placePiece(row, col, shape, color) {
    shape.forEach(([dr,dc]) => { board[row + dr][col + dc] = color; });
    score += shape.length * 10;
    scoreEl.innerText = score;
}

function checkLines() {
    let rClear = [], cClear = [];
    for (let r = 0; r < ROWS; r++) if (board[r].every(c => c !== 0)) rClear.push(r);
    for (let c = 0; c < COLS; c++) if (board.every(r => r[c] !== 0)) cClear.push(c);

    if (rClear.length || cClear.length) {
        playSound(880, 'square', 0.3);

        const totalLines = rClear.length + cClear.length;

        rClear.forEach(r => board[r].fill(0));
        cClear.forEach(c => board.forEach(r => r[c] = 0));

        score += (totalLines * (totalLines + 1) / 2) * 100;
        scoreEl.innerText = score;
    }
}

function checkGameOver() {
    const pieces = document.querySelectorAll('.piece-canvas');
    let possible = false;
    pieces.forEach(p => {
        const shape = JSON.parse(p.dataset.shape);
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (canPlace(r, c, shape)) possible = true;
            }
        }
    });
    if (!possible && pieces.length > 0) showGameOver();
}

function showGameOver() {
    document.getElementById('gameOverModal').style.display = 'flex';
    document.getElementById('finalScore').innerText = score;
    playSound(220, 'sawtooth', 0.5);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    board.forEach((row, r) => {
        row.forEach((cell, c) => {
            ctx.fillStyle = cell || '#2b394e';
            ctx.beginPath();

            if (ctx.roundRect) {
            ctx.roundRect(c * SIZE + 2, r * SIZE + 2, SIZE - 4, SIZE - 4, 6);
            } else {
                ctx.rect(c * SIZE + 2, r * SIZE + 2, SIZE - 4, SIZE - 4);
            }
            ctx.fill();
        });
    });

    if (dragPreview) {
        const activePiece = document.querySelector('.piece-canvas[style*="hidden"]');
        if (activePiece) {
            const shape = JSON.parse(activePiece.dataset.shape);
            
            ctx.fillStyle = dragPreview.valid ? 'rgba(0,255,0,0.4)' : 'rgba(255,0,0,0.4)';

            shape.forEach(([dr, dc]) => {
                const nr = dragPreview.row + dr;
                const nc = dragPreview.col + dc;

                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                    ctx.beginPath();
                     if (ctx.roundRect) {
                        ctx.roundRect(nc * SIZE + 2, nr * SIZE + 2, SIZE - 4, SIZE - 4, 6);
                    } else {
                        ctx.rect(nc * SIZE + 2, nr * SIZE + 2, SIZE - 4, SIZE - 4);
                    }
                    ctx.fill();
               }      
           });
        }
    }
   

    if (dragPreview) {
        const activePiece = document.querySelector('.piece-canvas[style*="hidden"]');
        if (activePiece) {
            const shape = JSON.parse(activePiece.dataset.shape);

            ctx.fillStyle = dragPreview.valid ? 'rgba(0,255,0,0.4)' : 'rgba(255,0,0,0.4)';
            shape.forEach(([dr,dc]) => {
                const nr = dragPreview.row + dr, nc = dragPreview.col + dc;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                    ctx.beginPath();
                    ctx.roundRect(nc * SIZE + 2, nr * SIZE + 2, SIZE - 4, SIZE - 4, 6);
                    ctx.fill();
                }
            });
        }
    }
}

function resetGame() {
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    score = 0;
    scoreEl.innerText = 0;
    document.getElementById('gameOverModal').style.display = 'none';
    initInventory();
    draw(); 
}

initInventory();
draw();
