// gameStore.js
let activeGame = null;
const games = {};

module.exports = {
  createGame(game) {
    activeGame = game;
    games[game.gameId] = game;
  },
  getActiveGame() {
    return activeGame;
  },
  getGame(gameId) {
    return games[gameId];
  },
};