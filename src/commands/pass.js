const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('pass')
  .setDescription('Pass your turn in the current game');

async function execute(interaction) {
  const channelId = interaction.channelId;
  const game = interaction.client.games.get(channelId);
  
  if (!game) {
    await interaction.reply({
      content: 'No game in progress! Use /game to start a new game.',
      ephemeral: true
    });
    return;
  }

  const playerId = interaction.user.id;

  // Check if it's a valid player's turn
  if (!game.board.teams[game.currentColor].has(playerId)) {
    await interaction.reply({
      content: `It's ${game.currentColor}'s turn and you're not on that team!`,
      ephemeral: true
    });
    return;
  }

  // Increment pass counter
  game.passes++;

  // Switch turns
  game.currentColor = game.currentColor === 'black' ? 'white' : 'black';

  // Check if game is over (two consecutive passes)
  if (game.passes >= 2) {
    // Calculate final score
    const score = game.board.calculateScore();
    const winner = score.black > score.white ? 'Black' : 'White';
    const margin = Math.abs(score.black - score.white);

    // Format territory and captures info
    let scoreDetails = `\nTerritory - Black: ${score.territory.black.size}, White: ${score.territory.white.size}`;
    if ('stones' in score) {
      scoreDetails += `\nStones - Black: ${score.stones.black}, White: ${score.stones.white}`;
    }
    if ('captures' in score) {
      scoreDetails += `\nCaptures - Black: ${score.captures.black}, White: ${score.captures.white}`;
    }

    // Clear game state
    interaction.client.games.delete(channelId);

    await interaction.reply({
      content: `Game Over! Both players passed.\n${winner} wins by ${margin} points!\nFinal Score - Black: ${score.black}, White: ${score.white}${scoreDetails}`,
      files: [{
        attachment: game.renderer.render(game.board),
        name: 'final-board.png'
      }]
    });
  } else {
    await interaction.reply({
      content: `${interaction.user} passed. It's ${game.currentColor}'s turn!`,
      files: [{
        attachment: game.renderer.render(game.board),
        name: 'board.png'
      }]
    });
  }
}

module.exports = {
  data,
  execute
};
