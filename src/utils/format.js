function formatMoney(value, currencyName) {
  return `${Number(value || 0).toLocaleString('pt-BR')} ${currencyName}`;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor((ms || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatCooldown(availableAt) {
  const remaining = availableAt - Date.now();
  if (remaining <= 0) return 'disponivel';
  return formatDuration(remaining);
}

function extractId(input) {
  if (!input) return null;
  const match = String(input).match(/\d{15,25}/);
  return match ? match[0] : null;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

module.exports = {
  extractId,
  formatCooldown,
  formatDuration,
  formatMoney,
  normalizeText
};
