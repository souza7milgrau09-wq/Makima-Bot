require('dotenv').config();

const path = require('path');
const { Client, Events, GatewayIntentBits, Partials } = require('discord.js');
const { CommandRouter } = require('./core/commandRouter');
const { JsonDatabase } = require('./core/jsonDatabase');
const ticketSystem = require('./modules/tickets');
const { registerVoiceModule } = require('./modules/voice');
const { registerEconomyModule } = require('./modules/economy');

const token = process.env.DISCORD_TOKEN;
const prefix = process.env.BOT_PREFIX || 'm';
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');

if (!token) {
  throw new Error('Defina DISCORD_TOKEN no arquivo .env antes de iniciar o bot.');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel, Partials.Message]
});

const db = new JsonDatabase(dataDir);
const router = new CommandRouter(prefix);
const context = { client, db, router, prefix };

ticketSystem(client);
registerVoiceModule(context);
registerEconomyModule(context);

router.register({
  name: 'help',
  aliases: ['ajuda', 'comandos'],
  category: 'geral',
  description: 'Mostra os comandos disponiveis.',
  usage: 'majuda',
  execute: async ({ message }) => {
    const commands = router
      .list()
      .filter((command) => !command.hidden)
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

    const grouped = commands.reduce((acc, command) => {
      acc[command.category] = acc[command.category] || [];
      acc[command.category].push(`**m${command.name}** - ${command.description}`);
      return acc;
    }, {});

    const lines = Object.entries(grouped).flatMap(([category, values]) => [
      `\n**${category.toUpperCase()}**`,
      ...values
    ]);

    await message.reply({
      content: [
        '**Central de comandos**',
        `Prefixo atual: \`${prefix}\``,
        ...lines,
        '\nUse `m<comando>` ou `m <comando>`. Exemplo: `mdiario` e `m diario` funcionam.'
      ].join('\n')
    });
  }
});

client.once(Events.ClientReady, () => {
  console.log(`[M Bot] Online como ${client.user.tag}. Prefixo: ${prefix}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (!message.guild || message.author.bot) return;
  await router.handle(message, context);
});

process.on('SIGINT', () => {
  db.save();
  process.exit(0);
});

client.login(token);
