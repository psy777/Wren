import { SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('score')
  .setDescription('Calculate the current score');

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

  // Calculate current score
  const score = game.board.calculateScore();
  const leader = score.black > score.white ? 'Black' : 'White';
  const margin = Math.abs(score.black - score.white);

  // Format territory and captures info
  let scoreDetails = `\nTerritory - Black: ${score.territory.black.size}, White: ${score.territory.white.size}`;
  if ('stones' in score) {
    scoreDetails += `\nStones - Black: ${score.stones.black}, White: ${score.stones.white}`;
  }
  if ('captures' in score) {
    scoreDetails += `\nCaptures - Black: ${score.captures.black}, White: ${score.captures.white}`;
  }

  await interaction.reply({
    content: `Current Score:\nBlack: ${score.black}\nWhite: ${score.white}\n${leader} leads by ${margin} points!${scoreDetails}`,
    files: [{
      attachment: game.renderer.render(game.board),
      name: 'board.png'
    }]
  });
}

export {
  data,
  execute
};
