const { EmbedBuilder } = require('discord.js');
const { extractId, formatCooldown, formatMoney, normalizeText } = require('../../utils/format');
const { requireManager } = require('../../utils/permissions');

function registerEconomyModule({ router, db }) {
  router.register({
    name: 'diario',
    aliases: ['daily'],
    category: 'banco',
    description: 'Coleta recompensa diaria.',
    usage: 'mdiario',
    execute: async ({ message }) => claimReward({ message, db, rewardKey: 'daily', label: 'diaria' })
  });

  router.register({
    name: 'semanal',
    aliases: ['weekly'],
    category: 'banco',
    description: 'Coleta recompensa semanal.',
    usage: 'msemanal',
    execute: async ({ message }) => claimReward({ message, db, rewardKey: 'weekly', label: 'semanal' })
  });

  router.register({
    name: 'mensal',
    aliases: ['monthly'],
    category: 'banco',
    description: 'Coleta recompensa mensal.',
    usage: 'mmensal',
    execute: async ({ message }) => claimReward({ message, db, rewardKey: 'monthly', label: 'mensal' })
  });

  router.register({
    name: 'trabalho',
    aliases: ['work'],
    category: 'banco',
    description: 'Trabalha e recebe um valor aleatorio.',
    usage: 'mtrabalho',
    execute: async ({ message }) => work({ message, db })
  });

  router.register({
    name: 'banco',
    aliases: ['saldo', 'balance'],
    category: 'banco',
    description: 'Mostra saldo e cooldowns.',
    usage: 'mbanco @membro',
    execute: async ({ message, args }) => showBank({ message, args, db })
  });

  router.register({
    name: 'loja',
    aliases: ['shop'],
    category: 'banco',
    description: 'Mostra itens disponiveis na loja.',
    usage: 'mloja',
    execute: async ({ message }) => showShop({ message, db })
  });

  router.register({
    name: 'comprar',
    aliases: ['buy'],
    category: 'banco',
    description: 'Compra um item da loja.',
    usage: 'mcomprar perfil-azul',
    execute: async ({ message, args }) => buyItem({ message, args, db })
  });

  router.register({
    name: 'perfil',
    aliases: ['profile'],
    category: 'banco',
    description: 'Mostra perfil economico do membro.',
    usage: 'mperfil @membro',
    execute: async ({ message, args }) => showProfile({ message, args, db })
  });

  router.register({
    name: 'usar',
    aliases: ['use'],
    category: 'banco',
    description: 'Usa um item comprado no perfil.',
    usage: 'musar perfil-azul',
    execute: async ({ message, args }) => useItem({ message, args, db })
  });

  router.register({
    name: 'seteconomia',
    aliases: ['configbanco'],
    category: 'banco',
    description: 'Configura recompensas e loja.',
    usage: 'mseteconomia reward daily 500',
    execute: async ({ message, args }) => configureEconomy({ message, args, db })
  });
}

async function claimReward({ message, db, rewardKey, label }) {
  const guildData = db.guild(message.guild.id);
  const economyConfig = guildData.config.economy;
  const user = ensureEconomyUser(guildData, message.author.id);
  const cooldown = economyConfig.cooldownsMs[rewardKey];
  const lastClaim = user.cooldowns[rewardKey] || 0;
  const availableAt = lastClaim + cooldown;

  if (Date.now() < availableAt) {
    return message.reply(`Sua recompensa ${label} ainda esta em cooldown: **${formatCooldown(availableAt)}**.`);
  }

  const amount = economyConfig.rewards[rewardKey];
  db.updateGuild(message.guild.id, (data) => {
    const currentUser = ensureEconomyUser(data, message.author.id);
    currentUser.balance += amount;
    currentUser.cooldowns[rewardKey] = Date.now();
    addTransaction(data, message.author.id, amount, `recompensa_${rewardKey}`);
  });

  return message.reply(`Voce coletou sua recompensa ${label}: **${formatMoney(amount, economyConfig.currencyName)}**.`);
}

async function work({ message, db }) {
  const guildData = db.guild(message.guild.id);
  const economyConfig = guildData.config.economy;
  const user = ensureEconomyUser(guildData, message.author.id);
  const cooldown = economyConfig.cooldownsMs.work;
  const availableAt = (user.cooldowns.work || 0) + cooldown;

  if (Date.now() < availableAt) {
    return message.reply(`Voce precisa descansar antes de trabalhar novamente: **${formatCooldown(availableAt)}**.`);
  }

  const min = economyConfig.rewards.workMin;
  const max = economyConfig.rewards.workMax;
  const amount = Math.floor(Math.random() * (max - min + 1)) + min;
  const jobs = [
    'organizou eventos no servidor',
    'ajudou membros novos',
    'fez uma missao da comunidade',
    'entregou uma tarefa da equipe'
  ];
  const job = jobs[Math.floor(Math.random() * jobs.length)];

  db.updateGuild(message.guild.id, (data) => {
    const currentUser = ensureEconomyUser(data, message.author.id);
    currentUser.balance += amount;
    currentUser.cooldowns.work = Date.now();
    addTransaction(data, message.author.id, amount, 'trabalho');
  });

  return message.reply(`Voce ${job} e recebeu **${formatMoney(amount, economyConfig.currencyName)}**.`);
}

async function showBank({ message, args, db }) {
  const targetId = extractId(args[0]) || message.author.id;
  const guildData = db.guild(message.guild.id);
  const user = ensureEconomyUser(guildData, targetId);
  const config = guildData.config.economy;

  const embed = new EmbedBuilder()
    .setColor(0xd69e2e)
    .setTitle(`Banco de ${targetId === message.author.id ? message.author.username : 'membro'}`)
    .setDescription(`<@${targetId}>`)
    .addFields(
      { name: 'Saldo', value: formatMoney(user.balance, config.currencyName), inline: true },
      { name: 'Diario', value: formatCooldown((user.cooldowns.daily || 0) + config.cooldownsMs.daily), inline: true },
      { name: 'Semanal', value: formatCooldown((user.cooldowns.weekly || 0) + config.cooldownsMs.weekly), inline: true },
      { name: 'Mensal', value: formatCooldown((user.cooldowns.monthly || 0) + config.cooldownsMs.monthly), inline: true },
      { name: 'Trabalho', value: formatCooldown((user.cooldowns.work || 0) + config.cooldownsMs.work), inline: true }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

async function showShop({ message, db }) {
  const guildData = db.guild(message.guild.id);
  const config = guildData.config.economy;
  const items = config.shop.map((item) => {
    return `**${item.id}** - ${item.name}\n${item.description}\nPreco: **${formatMoney(item.price, config.currencyName)}**`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x805ad5)
    .setTitle('Loja')
    .setDescription(items.join('\n\n') || 'A loja ainda esta vazia.')
    .setFooter({ text: 'Compre com mcomprar <id_do_item>' });

  return message.reply({ embeds: [embed] });
}

async function buyItem({ message, args, db }) {
  const itemId = normalizeText(args.shift());
  if (!itemId) return message.reply('Uso: `mcomprar <id_do_item>`.');

  const guildData = db.guild(message.guild.id);
  const config = guildData.config.economy;
  const item = config.shop.find((shopItem) => shopItem.id === itemId);
  const user = ensureEconomyUser(guildData, message.author.id);

  if (!item) return message.reply('Item nao encontrado na loja.');
  if (user.inventory.includes(item.id)) return message.reply('Voce ja comprou esse item.');
  if (user.balance < item.price) {
    return message.reply(`Saldo insuficiente. Voce precisa de **${formatMoney(item.price, config.currencyName)}**.`);
  }

  db.updateGuild(message.guild.id, (data) => {
    const currentUser = ensureEconomyUser(data, message.author.id);
    currentUser.balance -= item.price;
    currentUser.inventory.push(item.id);
    addTransaction(data, message.author.id, -item.price, `compra_${item.id}`);
  });

  return message.reply(`Compra realizada: **${item.name}**. Use \`musar ${item.id}\` para aplicar no perfil.`);
}

async function useItem({ message, args, db }) {
  const itemId = normalizeText(args.shift());
  if (!itemId) return message.reply('Uso: `musar <id_do_item>`.');

  const guildData = db.guild(message.guild.id);
  const item = guildData.config.economy.shop.find((shopItem) => shopItem.id === itemId);
  const user = ensureEconomyUser(guildData, message.author.id);

  if (!item) return message.reply('Item nao encontrado.');
  if (!user.inventory.includes(item.id)) return message.reply('Voce ainda nao comprou esse item.');
  if (item.type !== 'profileTheme') return message.reply('Esse item ainda nao tem acao de uso configurada.');

  db.updateGuild(message.guild.id, (data) => {
    const currentUser = ensureEconomyUser(data, message.author.id);
    currentUser.profile.theme = item.value;
  });

  return message.reply(`Tema de perfil aplicado: **${item.name}**.`);
}

async function showProfile({ message, args, db }) {
  const targetId = extractId(args[0]) || message.author.id;
  const guildData = db.guild(message.guild.id);
  const user = ensureEconomyUser(guildData, targetId);
  const config = guildData.config.economy;
  const theme = user.profile.theme || 'padrao';

  const embed = new EmbedBuilder()
    .setColor(themeColor(theme))
    .setTitle('Perfil')
    .setDescription(`<@${targetId}>`)
    .addFields(
      { name: 'Saldo', value: formatMoney(user.balance, config.currencyName), inline: true },
      { name: 'Tema', value: theme, inline: true },
      { name: 'Itens', value: user.inventory.length ? user.inventory.join(', ') : 'nenhum' }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

async function configureEconomy({ message, args, db }) {
  if (!requireManager(message)) return;

  const action = (args.shift() || '').toLowerCase();

  if (action === 'reward') return setReward({ message, args, db });
  if (action === 'moeda') return setCurrency({ message, args, db });
  if (action === 'item') return configureShopItem({ message, args, db });

  return message.reply([
    'Uso de configuracao:',
    '`mseteconomia reward daily 500`',
    '`mseteconomia reward workMin 100`',
    '`mseteconomia moeda coins`',
    '`mseteconomia item add <id> <preco> <nome>`',
    '`mseteconomia item remove <id>`'
  ].join('\n'));
}

async function setReward({ message, args, db }) {
  const key = args.shift();
  const value = Number(args.shift());
  const allowed = ['daily', 'weekly', 'monthly', 'workMin', 'workMax'];

  if (!allowed.includes(key) || !Number.isFinite(value) || value < 0) {
    return message.reply(`Uso: \`mseteconomia reward <${allowed.join('|')}> <valor>\`.`);
  }

  db.updateGuild(message.guild.id, (data) => {
    data.config.economy.rewards[key] = value;
  });

  return message.reply(`Recompensa \`${key}\` atualizada para **${value}**.`);
}

async function setCurrency({ message, args, db }) {
  const currencyName = args.join(' ').trim();
  if (!currencyName) return message.reply('Uso: `mseteconomia moeda <nome>`.');

  db.updateGuild(message.guild.id, (data) => {
    data.config.economy.currencyName = currencyName;
  });

  return message.reply(`Moeda atualizada para **${currencyName}**.`);
}

async function configureShopItem({ message, args, db }) {
  const action = (args.shift() || '').toLowerCase();

  if (action === 'remove') {
    const id = normalizeText(args.shift());
    if (!id) return message.reply('Uso: `mseteconomia item remove <id>`.');

    db.updateGuild(message.guild.id, (data) => {
      data.config.economy.shop = data.config.economy.shop.filter((item) => item.id !== id);
    });

    return message.reply(`Item \`${id}\` removido da loja.`);
  }

  if (action === 'add') {
    const id = normalizeText(args.shift()).replace(/[^a-z0-9-]/g, '');
    const price = Number(args.shift());
    const name = args.join(' ').trim();

    if (!id || !Number.isFinite(price) || price < 0 || !name) {
      return message.reply('Uso: `mseteconomia item add <id> <preco> <nome>`.');
    }

    db.updateGuild(message.guild.id, (data) => {
      const existing = data.config.economy.shop.find((item) => item.id === id);
      const payload = {
        id,
        name,
        description: 'Item personalizado da loja.',
        price,
        type: 'profileTheme',
        value: id
      };

      if (existing) Object.assign(existing, payload);
      else data.config.economy.shop.push(payload);
    });

    return message.reply(`Item \`${id}\` salvo na loja.`);
  }

  return message.reply('Uso: `mseteconomia item add <id> <preco> <nome>` ou `mseteconomia item remove <id>`.');
}

function ensureEconomyUser(guildData, userId) {
  if (!guildData.economy.users[userId]) {
    guildData.economy.users[userId] = {
      balance: 0,
      cooldowns: {},
      inventory: [],
      profile: {
        theme: null
      }
    };
  }

  return guildData.economy.users[userId];
}

function addTransaction(guildData, userId, amount, reason) {
  guildData.economy.transactions.push({
    userId,
    amount,
    reason,
    createdAt: Date.now()
  });

  if (guildData.economy.transactions.length > 5000) {
    guildData.economy.transactions = guildData.economy.transactions.slice(-5000);
  }
}

function themeColor(theme) {
  const colors = {
    azul: 0x2b6cb0,
    verde: 0x38a169,
    vermelho: 0xe53e3e,
    roxo: 0x805ad5,
    padrao: 0x4a5568
  };

  return colors[theme] || 0x4a5568;
}

module.exports = { registerEconomyModule };
