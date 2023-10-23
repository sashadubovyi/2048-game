import { Grid } from "./grid.js";
import { Tile } from "./tile.js";

const gameBoard = document.getElementById("game-board");
const totalSumElement = document.getElementById("totalSum");
const bestScoreElement = document.getElementById("bestScore");
const restartGameWrapper = document.getElementById("restartGame");
const restartButton = document.getElementById("restartButton");
const yourScoreElement = document.getElementById("restartYourScore");

const grid = new Grid(gameBoard);
grid.getRandomEmptyCell().linkTile(new Tile(gameBoard));
grid.getRandomEmptyCell().linkTile(new Tile(gameBoard));
setupInputOnce();

function setupInputOnce() {
  window.addEventListener("keydown", handleInput, { once: true });
  window.addEventListener("touchstart", handleTouchStart, false);
  window.addEventListener("touchmove", handleTouchMove, false);
}

let totalSum = 0;
let bestScore = parseInt(localStorage.getItem("bestScore")) || 0;

updateBestScore();

let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(e) {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}

function handleTouchMove(e) {
  if (!touchStartX || !touchStartY) {
    return;
  }

  const touchEndX = e.touches[0].clientX;
  const touchEndY = e.touches[0].clientY;

  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    if (deltaX > 0) {
      handleInput({ key: "ArrowRight" });
    } else {
      handleInput({ key: "ArrowLeft" });
    }
  } else {
    if (deltaY > 0) {
      handleInput({ key: "ArrowDown" });
    } else {
      handleInput({ key: "ArrowUp" });
    }
  }

  touchStartX = 0;
  touchStartY = 0;
}

async function handleInput(e) {
  switch (e.key) {
    case "ArrowUp":
      if (!canMoveUp()) {
        setupInputOnce();
        return;
      }
      await moveUp();
      break;

    case "ArrowDown":
      if (!canMoveDown()) {
        setupInputOnce();
        return;
      }
      await moveDown();
      break;

    case "ArrowLeft":
      if (!canMoveLeft()) {
        setupInputOnce();
        return;
      }
      await moveLeft();
      break;

    case "ArrowRight":
      if (!canMoveRight()) {
        setupInputOnce();
        return;
      }
      await moveRight();
      break;

    default:
      setupInputOnce();
      return;
  }

  const newTile = new Tile(gameBoard);
  totalSum += newTile.value;
  grid.getRandomEmptyCell().linkTile(newTile);
  totalSumElement.textContent = "Score: " + totalSum;
  yourScoreElement.textContent = "Your Score: " + totalSum;

  if (totalSum > bestScore) {
    bestScore = totalSum;
    localStorage.setItem("bestScore", bestScore);
    updateBestScore();
  }

  if (!canMoveUp() && !canMoveDown() && !canMoveLeft() && !canMoveRight()) {
    await newTile.waitForAnimationEnd();
    restartGameWrapper.style.display = "flex";
    return;
  }

  setupInputOnce();
}

function updateBestScore() {
  bestScoreElement.textContent = "Best Score: " + bestScore;
}

async function moveUp() {
  await slideTiles(grid.cellsGroupedByColumn);
}

async function moveDown() {
  await slideTiles(grid.cellsGroupedByReversedColumn);
}

async function moveLeft() {
  await slideTiles(grid.cellsGroupedByRow);
}

async function moveRight() {
  await slideTiles(grid.cellsGroupedByReversedRow);
}

async function slideTiles(groupedCells) {
  const promises = [];
  groupedCells.forEach((group) => slideTilesInGroup(group, promises));

  await Promise.all(promises);

  grid.cells.forEach((cell) => {
    cell.hasTileForMerge() && cell.mergeTiles();
  });
}

function slideTilesInGroup(group, promises) {
  for (let i = 1; i < group.length; i++) {
    if (group[i].isEmpty()) {
      continue;
    }

    const cellWithTile = group[i];

    let targetCell;
    let j = i - 1;
    while (j >= 0 && group[j].canAccept(cellWithTile.linkedTile)) {
      targetCell = group[j];
      j--;
    }

    if (!targetCell) {
      continue;
    }

    promises.push(cellWithTile.linkedTile.waitForTransitionEnd());

    if (targetCell.isEmpty()) {
      targetCell.linkTile(cellWithTile.linkedTile);
    } else {
      targetCell.linkTileForMerge(cellWithTile.linkedTile);
    }

    cellWithTile.unlinkTile();
  }
}

function canMoveUp() {
  return canMove(grid.cellsGroupedByColumn);
}

function canMoveDown() {
  return canMove(grid.cellsGroupedByReversedColumn);
}

function canMoveLeft() {
  return canMove(grid.cellsGroupedByRow);
}

function canMoveRight() {
  return canMove(grid.cellsGroupedByReversedRow);
}

function canMove(groupedCells) {
  return groupedCells.some((group) => canMoveInGroup(group));
}

function canMoveInGroup(group) {
  return group.some((cell, index) => {
    if (index === 0) {
      return false;
    }

    if (cell.isEmpty()) {
      return false;
    }

    const targetCell = group[index - 1];
    return targetCell.canAccept(cell.linkedTile);
  });
}

if (restartButton) {
  restartButton.addEventListener("click", () => {
    location.reload();
  });
}
