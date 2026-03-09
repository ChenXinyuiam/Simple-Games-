const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const restartBtn = document.getElementById('restart');

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const EMPTY = 0;

const COLORS = {
  I: '#00d0ff',
  O: '#ffd54f',
  T: '#b388ff',
  S: '#69f0ae',
  Z: '#ff8a80',
  J: '#82b1ff',
  L: '#ffab40',
};

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
};

let board;
let current;
let lastDrop = 0;
let isPaused = false;
let gameOver = false;
let score = 0;
let lines = 0;
let level = 1;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
}

function randomPiece() {
  const types = Object.keys(SHAPES);
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    type,
    matrix: SHAPES[type].map((row) => [...row]),
    x: Math.floor(COLS / 2) - 1,
    y: 0,
  };
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
  ctx.strokeStyle = '#0b0f1f';
  ctx.lineWidth = 2;
  ctx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x]) {
        drawCell(x, y, board[y][x]);
      }
    }
  }

  current.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(current.x + x, current.y + y, COLORS[current.type]);
      }
    });
  });
}

function collides(piece, offsetX = 0, offsetY = 0, matrix = piece.matrix) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (!matrix[y][x]) continue;
      const newX = piece.x + x + offsetX;
      const newY = piece.y + y + offsetY;
      if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
      if (newY >= 0 && board[newY][newX]) return true;
    }
  }
  return false;
}

function mergePiece() {
  current.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        board[current.y + y][current.x + x] = COLORS[current.type];
      }
    });
  });
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every((cell) => cell !== EMPTY)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(EMPTY));
      cleared++;
      y++;
    }
  }

  if (cleared > 0) {
    lines += cleared;
    score += [0, 100, 300, 500, 800][cleared] * level;
    level = 1 + Math.floor(lines / 10);
    updateHUD();
  }
}

function rotateMatrix(matrix) {
  return matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse());
}

function rotatePiece() {
  const rotated = rotateMatrix(current.matrix);
  if (!collides(current, 0, 0, rotated)) {
    current.matrix = rotated;
  }
}

function spawnPiece() {
  current = randomPiece();
  if (collides(current)) {
    gameOver = true;
  }
}

function lockAndContinue() {
  mergePiece();
  clearLines();
  spawnPiece();
}

function moveDown() {
  if (!collides(current, 0, 1)) {
    current.y += 1;
  } else {
    lockAndContinue();
  }
}

function hardDrop() {
  while (!collides(current, 0, 1)) {
    current.y += 1;
  }
  lockAndContinue();
}

function updateHUD() {
  scoreEl.textContent = String(score);
  linesEl.textContent = String(lines);
  levelEl.textContent = String(level);
}

function dropIntervalMs() {
  return Math.max(100, 800 - (level - 1) * 70);
}

function renderOverlay(text) {
  ctx.fillStyle = 'rgba(10, 12, 22, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

function gameLoop(ts = 0) {
  if (!isPaused && !gameOver) {
    if (ts - lastDrop >= dropIntervalMs()) {
      moveDown();
      lastDrop = ts;
    }
    drawBoard();
    requestAnimationFrame(gameLoop);
    return;
  }

  drawBoard();
  if (isPaused) renderOverlay('Paused');
  if (gameOver) renderOverlay('Game Over');

  requestAnimationFrame(gameLoop);
}

function resetGame() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  isPaused = false;
  gameOver = false;
  updateHUD();
  spawnPiece();
  drawBoard();
}

document.addEventListener('keydown', (event) => {
  if (gameOver && event.code !== 'KeyR') return;

  if (event.code === 'KeyP') {
    isPaused = !isPaused;
    return;
  }

  if (isPaused) return;

  switch (event.code) {
    case 'ArrowLeft':
      if (!collides(current, -1, 0)) current.x -= 1;
      break;
    case 'ArrowRight':
      if (!collides(current, 1, 0)) current.x += 1;
      break;
    case 'ArrowDown':
      moveDown();
      break;
    case 'ArrowUp':
      rotatePiece();
      break;
    case 'Space':
      hardDrop();
      break;
    case 'KeyR':
      resetGame();
      break;
    default:
      return;
  }
  event.preventDefault();
});

restartBtn.addEventListener('click', resetGame);

resetGame();
requestAnimationFrame(gameLoop);
