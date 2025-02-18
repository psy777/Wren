import { SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('score')
  .setDescription('Calculate the current score');

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

    let score;
    try {
      // Calculate current score
      score = game.board.calculateScore();
    } catch (error) {
      console.error('Error calculating score:', error);
      await interaction.reply({
        content: 'Failed to calculate current score.',
        ephemeral: true
      });
      return;
    }

    const leader = score.black > score.white ? 'Black' : 'White';
    const margin = Math.abs(score.black - score.white);

    // Format territory and captures info
    let scoreDetails = '';
    try {
      scoreDetails = `\nTerritory - Black: ${score.territory.black.size}, White: ${score.territory.white.size}`;
      if ('stones' in score) {
        scoreDetails += `\nStones - Black: ${score.stones.black}, White: ${score.stones.white}`;
      }
      if ('captures' in score) {
        scoreDetails += `\nCaptures - Black: ${score.captures.black}, White: ${score.captures.white}`;
      }
    } catch (error) {
      console.error('Error formatting score details:', error);
      scoreDetails = '\n(Detailed score breakdown unavailable)';
    }

    let boardImage;
    try {
      boardImage = game.renderer.render(game.board);
    } catch (error) {
      console.error('Error rendering board:', error);
      await interaction.reply({
        content: `Current Score:\nBlack: ${score.black}\nWhite: ${score.white}\n${leader} leads by ${margin} points!${scoreDetails}\n(Failed to render board)`,
      });
      return;
    }

    try {
      await interaction.reply({
        content: `Current Score:\nBlack: ${score.black}\nWhite: ${score.white}\n${leader} leads by ${margin} points!${scoreDetails}`,
      });
    } catch (error) {
      console.error('Error sending score message:', error);
      try {
        await interaction.reply({
          content: 'Failed to send score information. Please try again.',
          ephemeral: true
        });
      } catch (followUpError) {
        console.error('Error sending error message:', followUpError);
      }
    }
  } catch (error) {
    console.error('Unexpected error in score command:', error);
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
