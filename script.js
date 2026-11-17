const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const bestElement = document.getElementById("best");
const messageElement = document.getElementById("message");

const cells = 20;
const cellSize = canvas.width / cells;
const tickMs = 125;

let snake;
let direction;
let nextDirection;
let food;
let score;
let timer;
let gameOver;

let best = Number(localStorage.getItem("snakeBest") || 0);
bestElement.textContent = best;

function randomFood() {
  let position;

  do {
    position = {
      x: Math.floor(Math.random() * cells),
      y: Math.floor(Math.random() * cells)
    };
  } while (snake.some(part => part.x === position.x && part.y === position.y));

  return position;
}

function startGame() {
  clearInterval(timer);

  snake = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 }
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  gameOver = false;
  food = randomFood();

  scoreElement.textContent = score;
  messageElement.textContent = "";
  draw();
  timer = setInterval(update, tickMs);
}

function setDirection(name) {
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  const chosen = directions[name];
  if (!chosen) return;

  // Не даём змейке развернуться прямо в противоположном направлении.
  if (chosen.x === -direction.x && chosen.y === -direction.y) return;

  nextDirection = chosen;
}

function update() {
  direction = nextDirection;

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y
  };

  const hitWall =
    head.x < 0 || head.x >= cells ||
    head.y < 0 || head.y >= cells;

  const ateFood = head.x === food.x && head.y === food.y;
  const bodyToCheck = ateFood ? snake : snake.slice(0, -1);
  const hitSelf = bodyToCheck.some(
    part => part.x === head.x && part.y === head.y
  );

  if (hitWall || hitSelf) {
    endGame();
    return;
  }

  snake.unshift(head);

  if (ateFood) {
    score += 1;
    scoreElement.textContent = score;
    food = randomFood();

    if (score > best) {
      best = score;
      bestElement.textContent = best;
      localStorage.setItem("snakeBest", best);
    }
  } else {
    snake.pop();
  }

  draw();
}

function draw() {
  ctx.fillStyle = "#0c1420";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Сетка игрового поля.
  ctx.strokeStyle = "#ffffff0b";
  ctx.lineWidth = 1;

  for (let i = 1; i < cells; i++) {
    const pos = i * cellSize;

    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(canvas.width, pos);
    ctx.stroke();
  }

  // Яблоко.
  ctx.font = `${cellSize * 0.82}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "🍎",
    food.x * cellSize + cellSize / 2,
    food.y * cellSize + cellSize / 2 + 1
  );

  // Змейка.
  snake.forEach((part, index) => {
    const inset = 2;
    ctx.fillStyle = index === 0 ? "#86efac" : "#22c55e";
    ctx.beginPath();
    ctx.roundRect(
      part.x * cellSize + inset,
      part.y * cellSize + inset,
      cellSize - inset * 2,
      cellSize - inset * 2,
      6
    );
    ctx.fill();
  });
}

function endGame() {
  gameOver = true;
  clearInterval(timer);
  messageElement.textContent = `Игра окончена! Твой счёт: ${score}`;
}

document.addEventListener("keydown", event => {
  const keys = {
    ArrowUp: "up",
    w: "up",
    W: "up",
    ArrowDown: "down",
    s: "down",
    S: "down",
    ArrowLeft: "left",
    a: "left",
    A: "left",
    ArrowRight: "right",
    d: "right",
    D: "right"
  };

  const name = keys[event.key];

  if (name) {
    event.preventDefault();
    if (!gameOver) setDirection(name);
  }
});

document.querySelectorAll("[data-dir]").forEach(button => {
  button.addEventListener("click", () => {
    if (!gameOver) setDirection(button.dataset.dir);
  });
});

document.getElementById("restart").addEventListener("click", startGame);

startGame();