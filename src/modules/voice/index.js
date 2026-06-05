const { EmbedBuilder } = require('discord.js');
const { extractId, formatDuration, normalizeText } = require('../../utils/format');
const { hasAnyRole, requireManager } = require('../../utils/permissions');

function registerVoiceModule({ client, router, db }) {
  client.once('ready', () => {
    initializeVoiceSessions(client, db);
  });

  client.on('voiceStateUpdate', async (oldState, newState) => {
    if (!oldState.guild) return;

    const userId = newState.id || oldState.id;
    const guildId = oldState.guild.id;

    if (oldState.channelId && oldState.channelId !== newState.channelId) {
      closeVoiceSession(db, guildId, userId);
    }

    if (newState.channelId && oldState.channelId !== newState.channelId) {
      db.updateGuild(guildId, (data) => {
        data.voice.activeSessions[userId] = {
          channelId: newState.channelId,
          startedAt: Date.now()
        };
      });
    }
  });

  router.register({
    name: 'callrank',
    aliases: ['rankcall', 'voice'],
    category: 'call',
    description: 'Mostra ranking de tempo em call por grupo.',
    usage: 'mcallrank staff',
    execute: async ({ message, args }) => {
      const rankId = normalizeText(args.shift() || 'comunidade');
      const limit = Math.max(1, Math.min(20, Number(args.shift()) || 10));
      await sendVoiceRank({ message, db, rankId, limit });
    }
  });

  router.register({
    name: 'calltime',
    aliases: ['meutempo'],
    category: 'call',
    description: 'Mostra o tempo em call de um membro.',
    usage: 'mcalltime @membro',
    execute: async ({ message, args }) => {
      const targetId = extractId(args[0]) || message.author.id;
      const total = getLiveTotal(db, message.guild.id, targetId);
      await message.reply(`Tempo em call de <@${targetId}>: **${formatDuration(total)}**.`);
    }
  });

  router.register({
    name: 'setcall',
    aliases: ['configcall'],
    category: 'call',
    description: 'Configura rankings de call.',
    usage: 'msetcall cargos staff @Staff',
    execute: async ({ message, args }) => {
      if (!requireManager(message)) return;

      const action = (args.shift() || '').toLowerCase();

      if (action === 'add') return addVoiceRank({ message, args, db });
      if (action === 'cargos') return setVoiceRankRoles({ message, args, db });
      if (action === 'canal') return setVoiceRankChannel({ message, args, db });
      if (action === 'todos') return setVoiceRankEveryone({ message, args, db });
      if (action === 'publicar') return publishVoiceRank({ message, args, db });

      return message.reply([
        'Uso de configuracao:',
        '`msetcall add <id> <nome>`',
        '`msetcall cargos <id> @Cargo @Cargo2`',
        '`msetcall canal <id> #canal`',
        '`msetcall todos <id> on/off`',
        '`msetcall publicar <id>`'
      ].join('\n'));
    }
  });
}

function initializeVoiceSessions(client, db) {
  const now = Date.now();

  for (const guild of client.guilds.cache.values()) {
    db.updateGuild(guild.id, (data) => {
      data.voice.activeSessions = {};

      for (const voiceState of guild.voiceStates.cache.values()) {
        if (!voiceState.channelId || voiceState.member?.user.bot) continue;

        data.voice.activeSessions[voiceState.id] = {
          channelId: voiceState.channelId,
          startedAt: now
        };
      }
    });
  }
}

function closeVoiceSession(db, guildId, userId) {
  db.updateGuild(guildId, (data) => {
    const session = data.voice.activeSessions[userId];
    if (!session) return;

    const duration = Date.now() - session.startedAt;
    data.voice.totalsMs[userId] = (data.voice.totalsMs[userId] || 0) + Math.max(0, duration);
    delete data.voice.activeSessions[userId];
  });
}

async function sendVoiceRank({ message, db, rankId, limit }) {
  const guildData = db.guild(message.guild.id);
  const rank = findVoiceRank(guildData, rankId);

  if (!rank) return message.reply('Ranking nao encontrado. Veja ou crie com `msetcall add <id> <nome>`.');

  const rows = await buildVoiceRows({ guild: message.guild, db, rank, limit });
  const description = rows.length
    ? rows.map((row, index) => `**${index + 1}.** <@${row.userId}> - ${formatDuration(row.totalMs)}`).join('\n')
    : 'Nenhum tempo registrado ainda.';

  const embed = new EmbedBuilder()
    .setColor(0x38a169)
    .setTitle(`Ranking de Call - ${rank.name}`)
    .setDescription(description)
    .setFooter({ text: 'Ranking calculado com base no tempo que o bot ficou online.' })
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

async function publishVoiceRank({ message, args, db }) {
  const rankId = normalizeText(args.shift());
  const guildData = db.guild(message.guild.id);
  const rank = findVoiceRank(guildData, rankId);

  if (!rank) return message.reply('Ranking nao encontrado.');
  if (!rank.reportChannelId) return message.reply('Configure um canal com `msetcall canal <id> #canal`.');

  const channel = message.guild.channels.cache.get(rank.reportChannelId);
  if (!channel?.isTextBased()) return message.reply('O canal configurado nao existe ou nao e de texto.');

  const rows = await buildVoiceRows({ guild: message.guild, db, rank, limit: 10 });
  const description = rows.length
    ? rows.map((row, index) => `**${index + 1}.** <@${row.userId}> - ${formatDuration(row.totalMs)}`).join('\n')
    : 'Nenhum tempo registrado ainda.';

  const embed = new EmbedBuilder()
    .setColor(0x38a169)
    .setTitle(`Ranking de Call - ${rank.name}`)
    .setDescription(description)
    .setTimestamp();

  await channel.send({ embeds: [embed] });
  return message.reply(`Ranking publicado em <#${rank.reportChannelId}>.`);
}

async function buildVoiceRows({ guild, db, rank, limit }) {
  const guildData = db.guild(guild.id);
  const rows = [];
  const userIds = new Set([
    ...Object.keys(guildData.voice.totalsMs),
    ...Object.keys(guildData.voice.activeSessions)
  ]);

  for (const userId of userIds) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) continue;
    if (!rank.includeEveryone && !hasAnyRole(member, rank.roleIds)) continue;

    rows.push({
      userId,
      totalMs: getLiveTotal(db, guild.id, userId)
    });
  }

  return rows.sort((a, b) => b.totalMs - a.totalMs).slice(0, limit);
}

function getLiveTotal(db, guildId, userId) {
  const guildData = db.guild(guildId);
  const saved = guildData.voice.totalsMs[userId] || 0;
  const session = guildData.voice.activeSessions[userId];

  if (!session) return saved;
  return saved + Math.max(0, Date.now() - session.startedAt);
}

async function addVoiceRank({ message, args, db }) {
  const id = normalizeText(args.shift()).replace(/[^a-z0-9-]/g, '');
  const name = args.join(' ').trim();

  if (!id || !name) return message.reply('Uso: `msetcall add <id> <nome>`.');

  db.updateGuild(message.guild.id, (data) => {
    const existing = findVoiceRank(data, id);
    if (existing) {
      existing.name = name;
      return;
    }

    data.config.voiceRanks.push({
      id,
      name,
      roleIds: [],
      reportChannelId: null,
      includeEveryone: false
    });
  });

  return message.reply(`Ranking \`${id}\` salvo como **${name}**.`);
}

async function setVoiceRankRoles({ message, args, db }) {
  const id = normalizeText(args.shift());
  const roleIds = args.map(extractId).filter(Boolean);

  if (!id || roleIds.length === 0) return message.reply('Uso: `msetcall cargos <id> @Cargo @Cargo2`.');

  const updated = db.updateGuild(message.guild.id, (data) => {
    const rank = findVoiceRank(data, id);
    if (!rank) return false;
    rank.roleIds = roleIds;
    rank.includeEveryone = false;
    return true;
  });

  if (!updated) return message.reply('Ranking nao encontrado.');
  return message.reply(`Cargos do ranking \`${id}\`: ${roleIds.map((roleId) => `<@&${roleId}>`).join(', ')}.`);
}

async function setVoiceRankChannel({ message, args, db }) {
  const id = normalizeText(args.shift());
  const channelId = extractId(args.shift());

  if (!id || !channelId) return message.reply('Uso: `msetcall canal <id> #canal`.');

  const channel = message.guild.channels.cache.get(channelId);
  if (!channel?.isTextBased()) return message.reply('Informe um canal de texto valido.');

  const updated = db.updateGuild(message.guild.id, (data) => {
    const rank = findVoiceRank(data, id);
    if (!rank) return false;
    rank.reportChannelId = channelId;
    return true;
  });

  if (!updated) return message.reply('Ranking nao encontrado.');
  return message.reply(`Canal do ranking \`${id}\` definido como <#${channelId}>.`);
}

async function setVoiceRankEveryone({ message, args, db }) {
  const id = normalizeText(args.shift());
  const value = normalizeText(args.shift());
  const includeEveryone = ['on', 'sim', 'true', '1', 'ativo'].includes(value);

  if (!id || !value) return message.reply('Uso: `msetcall todos <id> on/off`.');

  const updated = db.updateGuild(message.guild.id, (data) => {
    const rank = findVoiceRank(data, id);
    if (!rank) return false;
    rank.includeEveryone = includeEveryone;
    return true;
  });

  if (!updated) return message.reply('Ranking nao encontrado.');
  return message.reply(`Ranking \`${id}\` agora ${includeEveryone ? 'inclui todos os membros' : 'usa apenas cargos configurados'}.`);
}

function findVoiceRank(guildData, id) {
  return guildData.config.voiceRanks.find((rank) => rank.id === id);
}

module.exports = { registerVoiceModule };
