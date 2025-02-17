import { SlashCommandBuilder } from 'discord.js';
import { Board } from '../game/board.js';
import { BoardRenderer } from '../rendering/board.js';

const BOARD_SIZES = {
  '19x19': 19,
  '13x13': 13,
  '9x9': 9
};

const RULESETS = {
  'Chinese': 'chinese',
  'Japanese': 'japanese',
  'AGA': 'aga'
};

const data = new SlashCommandBuilder()
  .setName('game')
  .setDescription('Start a new Go game')
  .addStringOption(option =>
    option.setName('size')
      .setDescription('Board size')
      .setRequired(true)
      .addChoices(
        { name: '19x19', value: '19x19' },
        { name: '13x13', value: '13x13' },
        { name: '9x9', value: '9x9' }
      ))
  .addStringOption(option =>
    option.setName('ruleset')
      .setDescription('Game ruleset')
      .setRequired(true)
      .addChoices(
        { name: 'Chinese', value: 'Chinese' },
        { name: 'Japanese', value: 'Japanese' },
        { name: 'AGA', value: 'AGA' }
      ));

async function execute(interaction) {
  const channelId = interaction.channelId;
  const size = BOARD_SIZES[interaction.options.getString('size')];
  const ruleset = RULESETS[interaction.options.getString('ruleset')];

  // Check if there's already a game in this channel
  if (interaction.client.games.has(channelId)) {
    await interaction.reply({
      content: 'There is already a game in progress in this channel!',
      ephemeral: true
    });
    return;
  }

  // Create new game
  const board = new Board(size, ruleset);
  const renderer = new BoardRenderer(size);

  // Store game state
  interaction.client.games.set(channelId, {
    board,
    renderer,
    currentColor: 'black',
    lastMove: null,
    passes: 0
  });

  // Render initial board
  const boardImage = renderer.render(board);

  await interaction.reply({
    content: `New ${size}x${size} game started with ${ruleset} rules! Use /join to join a team.`,
    files: [{
      attachment: boardImage,
      name: 'board.png'
    }]
  });
}

export {
  data,
  execute
};
