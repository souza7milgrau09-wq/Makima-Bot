const { PermissionFlagsBits } = require('discord.js');

function isServerManager(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator)
    || member.permissions.has(PermissionFlagsBits.ManageGuild);
}

function hasAnyRole(member, roleIds) {
  if (!roleIds || roleIds.length === 0) return false;
  return roleIds.some((roleId) => member.roles.cache.has(roleId));
}

function requireManager(message) {
  if (isServerManager(message.member)) return true;
  message.reply('Apenas administradores ou pessoas com permissao de gerenciar servidor podem usar esse comando.');
  return false;
}

module.exports = {
  hasAnyRole,
  isServerManager,
  requireManager
};
