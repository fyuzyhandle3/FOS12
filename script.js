const PIECES = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
  P: "♙",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟"
};

const STARTING_BOARD = [
  ["r", "n", "b", "q", "k", "b", "n", "r"],
  ["p", "p", "p", "p", "p", "p", "p", "p"],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ["P", "P", "P", "P", "P", "P", "P", "P"],
  ["R", "N", "B", "Q", "K", "B", "N", "R"]
];

const boardElement = document.querySelector("#board");
const statusElement = document.querySelector("#status");
const restartButton = document.querySelector("#restart");

let state;
let selectedSquare = null;
let selectedMoves = [];
let gameOver = false;

function createState() {
  return {
    board: STARTING_BOARD.map(row => [...row]),
    whiteToMove: true,
    castling: { K: true, Q: true, k: true, q: true },
    enPassant: null,
    lastMove: null
  };
}

function cloneState(source) {
  return {
    board: source.board.map(row => [...row]),
    whiteToMove: source.whiteToMove,
    castling: { ...source.castling },
    enPassant: source.enPassant ? [...source.enPassant] : null,
    lastMove: source.lastMove
  };
}

function isInside(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function isWhite(piece) {
  return piece !== null && piece === piece.toUpperCase();
}

function sameColor(pieceA, pieceB) {
  return pieceA && pieceB && isWhite(pieceA) === isWhite(pieceB);
}

function findKing(position, white) {
  const king = white ? "K" : "k";

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if (position.board[row][col] === king) {
        return [row, col];
      }
    }
  }

  return null;
}

function isSquareAttacked(position, row, col, byWhite) {
  const board = position.board;

  // Пешки атакуют по диагонали.
  const pawnSourceRow = row + (byWhite ? 1 : -1);
  const pawn = byWhite ? "P" : "p";

  for (const pawnCol of [col - 1, col + 1]) {
    if (
      isInside(pawnSourceRow, pawnCol) &&
      board[pawnSourceRow][pawnCol] === pawn
    ) {
      return true;
    }
  }

  // Кони.
  const knight = byWhite ? "N" : "n";
  const knightSteps = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ];

  for (const [dr, dc] of knightSteps) {
    const r = row + dr;
    const c = col + dc;

    if (isInside(r, c) && board[r][c] === knight) {
      return true;
    }
  }

  // Король.
  const king = byWhite ? "K" : "k";

  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;

      const r = row + dr;
      const c = col + dc;

      if (isInside(r, c) && board[r][c] === king) {
        return true;
      }
    }
  }

  // Ладья, ферзь, слон.
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [-1, 1], [1, -1], [1, 1]
  ];

  for (let index = 0; index < directions.length; index += 1) {
    const [dr, dc] = directions[index];
    const isStraight = index < 4;
    let r = row + dr;
    let c = col + dc;

    while (isInside(r, c)) {
      const piece = board[r][c];

      if (piece) {
        if (isWhite(piece) === byWhite) {
          const type = piece.toLowerCase();

          if (
            type === "q" ||
            (isStraight && type === "r") ||
            (!isStraight && type === "b")
          ) {
            return true;
          }
        }

        break;
      }

      r += dr;
      c += dc;
    }
  }

  return false;
}

function isInCheck(position, white) {
  const kingSquare = findKing(position, white);

  if (!kingSquare) return true;

  return isSquareAttacked(
    position,
    kingSquare[0],
    kingSquare[1],
    !white
  );
}

function addMove(moves, fromRow, fromCol, toRow, toCol, extra = {}) {
  if (!isInside(toRow, toCol)) return;

  moves.push({
    from: [fromRow, fromCol],
    to: [toRow, toCol],
    ...extra
  });
}

function getPseudoMoves(position, row, col) {
  const board = position.board;
  const piece = board[row][col];
  const moves = [];

  if (!piece) return moves;

  const white = isWhite(piece);
  const type = piece.toLowerCase();

  if (type === "p") {
    const direction = white ? -1 : 1;
    const startRow = white ? 6 : 1;
    const promotionRow = white ? 0 : 7;
    const oneStep = row + direction;

    if (isInside(oneStep, col) && !board[oneStep][col]) {
      addMove(moves, row, col, oneStep, col, {
        promotion: oneStep === promotionRow
      });

      const twoSteps = row + direction * 2;

      if (row === startRow && !board[twoSteps][col]) {
        addMove(moves, row, col, twoSteps, col);
      }
    }

    for (const targetCol of [col - 1, col + 1]) {
      const targetRow = row + direction;

      if (!isInside(targetRow, targetCol)) continue;

      const target = board[targetRow][targetCol];

      if (target && !sameColor(piece, target)) {
        addMove(moves, row, col, targetRow, targetCol, {
          promotion: targetRow === promotionRow
        });
      } else if (
        position.enPassant &&
        position.enPassant[0] === targetRow &&
        position.enPassant[1] === targetCol
      ) {
        addMove(moves, row, col, targetRow, targetCol, {
          enPassant: true
        });
      }
    }

    return moves;
  }

  if (type === "n") {
    const steps = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    for (const [dr, dc] of steps) {
      const targetRow = row + dr;
      const targetCol = col + dc;

      if (
        isInside(targetRow, targetCol) &&
        !sameColor(piece, board[targetRow][targetCol])
      ) {
        addMove(moves, row, col, targetRow, targetCol);
      }
    }

    return moves;
  }

  if (type === "k") {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;

        const targetRow = row + dr;
        const targetCol = col + dc;

        if (
          isInside(targetRow, targetCol) &&
          !sameColor(piece, board[targetRow][targetCol])
        ) {
          addMove(moves, row, col, targetRow, targetCol);
        }
      }
    }

    const homeRow = white ? 7 : 0;
    const enemyIsWhite = !white;
    const shortRight = white ? "K" : "k";
    const longRight = white ? "Q" : "q";

    if (
      row === homeRow &&
      col === 4 &&
      !isInCheck(position, white)
    ) {
      // Короткая рокировка.
      if (
        position.castling[shortRight] &&
        board[homeRow][5] === null &&
        board[homeRow][6] === null &&
        board[homeRow][7] === (white ? "R" : "r") &&
        !isSquareAttacked(position, homeRow, 5, enemyIsWhite) &&
        !isSquareAttacked(position, homeRow, 6, enemyIsWhite)
      ) {
        addMove(moves, row, col, homeRow, 6, { castle: "short" });
      }

      // Длинная рокировка.
      if (
        position.castling[longRight] &&
        board[homeRow][1] === null &&
        board[homeRow][2] === null &&
        board[homeRow][3] === null &&
        board[homeRow][0] === (white ? "R" : "r") &&
        !isSquareAttacked(position, homeRow, 3, enemyIsWhite) &&
        !isSquareAttacked(position, homeRow, 2, enemyIsWhite)
      ) {
        addMove(moves, row, col, homeRow, 2, { castle: "long" });
      }
    }

    return moves;
  }

  const directions = [];

  if (type === "r" || type === "q") {
    directions.push([-1, 0], [1, 0], [0, -1], [0, 1]);
  }

  if (type === "b" || type === "q") {
    directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
  }

  for (const [dr, dc] of directions) {
    let targetRow = row + dr;
    let targetCol = col + dc;

    while (isInside(targetRow, targetCol)) {
      const target = board[targetRow][targetCol];

      if (!target) {
        addMove(moves, row, col, targetRow, targetCol);
      } else {
        if (!sameColor(piece, target)) {
          addMove(moves, row, col, targetRow, targetCol);
        }

        break;
      }

      targetRow += dr;
      targetCol += dc;
    }
  }

  return moves;
}

function revokeRookRight(row, col) {
  if (row === 7 && col === 0) state.castling.Q = false;
  if (row === 7 && col === 7) state.castling.K = false;
  if (row === 0 && col === 0) state.castling.q = false;
  if (row === 0 && col === 7) state.castling.k = false;
}

function applyMove(position, move, promotionChoice = "Q") {
  const board = position.board;
  const [fromRow, fromCol] = move.from;
  const [toRow, toCol] = move.to;
  const piece = board[fromRow][fromCol];
  const capturedPiece = board[toRow][toCol];

  if (piece.toLowerCase() === "k") {
    if (isWhite(piece)) {
      position.castling.K = false;
      position.castling.Q = false;
    } else {
      position.castling.k = false;
      position.castling.q = false;
    }
  }

  if (piece.toLowerCase() === "r") {
    revokeRookRight(fromRow, fromCol);
  }

  if (capturedPiece && capturedPiece.toLowerCase() === "r") {
    revokeRookRight(toRow, toCol);
  }

  board[fromRow][fromCol] = null;

  if (move.enPassant) {
    board[fromRow][toCol] = null;
  }

  if (move.castle === "short") {
    board[toRow][5] = board[toRow][7];
    board[toRow][7] = null;
  } else if (move.castle === "long") {
    board[toRow][3] = board[toRow][0];
    board[toRow][0] = null;
  }

  let placedPiece = piece;

  if (move.promotion) {
    const chosen = promotionChoice.toUpperCase();
    const validChoice = ["Q", "R", "B", "N"].includes(chosen)
      ? chosen
      : "Q";

    placedPiece = isWhite(piece) ? validChoice : validChoice.toLowerCase();
  }

  board[toRow][toCol] = placedPiece;
  position.enPassant = null;

  if (piece.toLowerCase() === "p" && Math.abs(toRow - fromRow) === 2) {
    position.enPassant = [(fromRow + toRow) / 2, fromCol];
  }

  position.lastMove = {
    from: [fromRow, fromCol],
    to: [toRow, toCol]
  };

  position.whiteToMove = !position.whiteToMove;
}

function getLegalMoves(position, row, col) {
  const piece = position.board[row][col];

  if (!piece || isWhite(piece) !== position.whiteToMove) {
    return [];
  }

  return getPseudoMoves(position, row, col).filter(move => {
    const testPosition = cloneState(position);
    applyMove(testPosition, move);
    return !isInCheck(testPosition, !testPosition.whiteToMove);
  });
}

function getAllLegalMoves(position) {
  const allMoves = [];

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      allMoves.push(...getLegalMoves(position, row, col));
    }
  }

  return allMoves;
}

function getStatus() {
  const whiteToMove = state.whiteToMove;
  const inCheck = isInCheck(state, whiteToMove);
  const hasMoves = getAllLegalMoves(state).length > 0;

  if (!hasMoves && inCheck) {
    gameOver = true;
    return `Мат! Победили ${whiteToMove ? "чёрные" : "белые"}.`;
  }

  if (!hasMoves) {
    gameOver = true;
    return "Пат! Ничья.";
  }

  gameOver = false;

  if (inCheck) {
    return `Шах! Ход ${whiteToMove ? "белых" : "чёрных"}.`;
  }

  return `Ход ${whiteToMove ? "белых" : "чёрных"}`;
}

function renderBoard() {
  boardElement.replaceChildren();

  const checkedKing = isInCheck(state, state.whiteToMove)
    ? findKing(state, state.whiteToMove)
    : null;

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const square = document.createElement("button");
      const piece = state.board[row][col];
      const isSelected =
        selectedSquare &&
        selectedSquare[0] === row &&
        selectedSquare[1] === col;
      const isLegal = selectedMoves.some(
        move => move.to[0] === row && move.to[1] === col
      );
      const isLastMove =
        state.lastMove &&
        (
          (state.lastMove.from[0] === row && state.lastMove.from[1] === col) ||
          (state.lastMove.to[0] === row && state.lastMove.to[1] === col)
        );

      square.type = "button";
      square.className = `square ${(row + col) % 2 === 0 ? "light" : "dark"}`;
      square.dataset.row = String(row);
      square.dataset.col = String(col);
      square.setAttribute(
        "aria-label",
        `${row + 1} ${col + 1}${piece ? `, фигура ${piece}` : ""}`
      );

      if (isSelected) square.classList.add("selected");
      if (isLastMove) square.classList.add("last-move");

      if (checkedKing && checkedKing[0] === row && checkedKing[1] === col) {
        square.classList.add("in-check");
      }

      if (isLegal) {
        square.classList.add(piece ? "legal-capture" : "legal-move");
      }

      if (piece) {
        const pieceElement = document.createElement("span");
        pieceElement.className = `piece ${isWhite(piece) ? "white-piece" : "black-piece"}`;
        pieceElement.textContent = PIECES[piece];
        pieceElement.setAttribute("aria-hidden", "true");
        square.append(pieceElement);
      }

      boardElement.append(square);
    }
  }

  statusElement.textContent = getStatus();
}

function choosePromotion() {
  const answer = window.prompt(
    "Во что превратить пешку? Введите: Q — ферзь, R — ладья, B — слон, N — конь.",
    "Q"
  );

  if (answer === null) return "Q";

  const choice = answer.trim().toUpperCase();
  return ["Q", "R", "B", "N"].includes(choice) ? choice : "Q";
}

function makeMove(move) {
  const promotionChoice = move.promotion ? choosePromotion() : "Q";

  applyMove(state, move, promotionChoice);
  selectedSquare = null;
  selectedMoves = [];
  renderBoard();
}

boardElement.addEventListener("click", event => {
  const square = event.target.closest(".square");

  if (!square || gameOver) return;

  const row = Number(square.dataset.row);
  const col = Number(square.dataset.col);

  if (selectedSquare) {
    const chosenMove = selectedMoves.find(
      move => move.to[0] === row && move.to[1] === col
    );

    if (chosenMove) {
      makeMove(chosenMove);
      return;
    }
  }

  const piece = state.board[row][col];

  if (piece && isWhite(piece) === state.whiteToMove) {
    selectedSquare = [row, col];
    selectedMoves = getLegalMoves(state, row, col);
  } else {
    selectedSquare = null;
    selectedMoves = [];
  }

  renderBoard();
});

restartButton.addEventListener("click", () => {
  state = createState();
  selectedSquare = null;
  selectedMoves = [];
  gameOver = false;
  renderBoard();
});

state = createState();
renderBoard();