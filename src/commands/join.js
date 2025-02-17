import { SlashCommandBuilder } from 'discord.js';
import { COLORS } from '../game/board.js';

const data = new SlashCommandBuilder()
  .setName('join')
  .setDescription('Join a team in the current game')
  .addStringOption(option =>
    option.setName('team')
      .setDescription('Which team to join')
      .setRequired(true)
      .addChoices(
        { name: 'Black', value: 'black' },
        { name: 'White', value: 'white' }
      ));

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

  const team = interaction.options.getString('team');
  const playerId = interaction.user.id;
  const oppositeTeam = team === COLORS.BLACK ? COLORS.WHITE : COLORS.BLACK;

  // Check if player is already on the opposite team
  if (game.board.teams[oppositeTeam].has(playerId)) {
    await interaction.reply({
      content: `You are already on team ${oppositeTeam}!`,
      ephemeral: true
    });
    return;
  }

  // Add player to team
  game.board.addToTeam(team, playerId);

  await interaction.reply({
    content: `${interaction.user} joined team ${team}!`,
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
