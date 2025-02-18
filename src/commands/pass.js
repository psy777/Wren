import { SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('pass')
  .setDescription('Pass your turn in the current game');

async function execute(interaction) {
  try {
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
      let score;
      try {
        // Calculate final score
        score = game.board.calculateScore();
      } catch (error) {
        console.error('Error calculating final score:', error);
        await interaction.reply({
          content: 'Failed to calculate final score. The game state has been preserved.',
          ephemeral: true
        });
        // Reset pass counter to allow retrying
        game.passes--;
        return;
      }

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

      let boardImage;
      try {
        boardImage = game.renderer.render(game.board);
      } catch (error) {
        console.error('Error rendering final board:', error);
        await interaction.reply({
          content: `Game Over! Both players passed.\n${winner} wins by ${margin} points!\nFinal Score - Black: ${score.black}, White: ${score.white}${scoreDetails}\n(Failed to render final board)`,
        });
        interaction.client.games.delete(channelId);
        return;
      }

      try {
        await interaction.reply({
          content: `Game Over! Both players passed.\n${winner} wins by ${margin} points!\nFinal Score - Black: ${score.black}, White: ${score.white}${scoreDetails}`,
          files: [{
            attachment: boardImage,
            name: 'final-board.png'
          }]
        });
        // Clear game state only after successful reply
        interaction.client.games.delete(channelId);
      } catch (error) {
        console.error('Error sending final game state:', error);
        // Keep the game state if we couldn't send the final message
        await interaction.reply({
          content: 'Failed to send final game state. The game has been preserved.',
          ephemeral: true
        });
      }
    } else {
      let boardImage;
      try {
        boardImage = game.renderer.render(game.board);
      } catch (error) {
        console.error('Error rendering board:', error);
        await interaction.reply({
          content: `${interaction.user} passed. It's ${game.currentColor}'s turn! (Failed to render board)`,
        });
        return;
      }

      try {
        await interaction.reply({
          content: `${interaction.user} passed. It's ${game.currentColor}'s turn!`,
          files: [{
            attachment: boardImage,
            name: 'board.png'
          }]
        });
      } catch (error) {
        console.error('Error sending pass message:', error);
        // Revert the pass if we couldn't send the message
        game.passes--;
        game.currentColor = game.currentColor === 'black' ? 'white' : 'black';
        await interaction.reply({
          content: 'Failed to process pass. Please try again.',
          ephemeral: true
        });
      }
    }
  } catch (error) {
    console.error('Unexpected error in pass command:', error);
    try {
      await interaction.reply({
        content: 'An unexpected error occurred. Please try again or contact support.',
        ephemeral: true
      });
    } catch (followUpError) {
      console.error('Error sending error message:', followUpError);
    }
  }
}

export {
  data,
  execute
};
