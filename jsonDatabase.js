const fs = require('fs');
const path = require('path');
const { createDefaultGuildData } = require('../config/defaultGuildData');

class JsonDatabase {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, 'db.json');
    this.data = this.load();
  }

  load() {
    fs.mkdirSync(this.dataDir, { recursive: true });

    if (!fs.existsSync(this.filePath)) {
      return { guilds: {} };
    }

    try {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    } catch (error) {
      throw new Error(`Nao foi possivel ler ${this.filePath}: ${error.message}`);
    }
  }

  save() {
    fs.mkdirSync(this.dataDir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  guild(guildId) {
    if (!this.data.guilds[guildId]) {
      this.data.guilds[guildId] = createDefaultGuildData();
      this.save();
    }

    return this.data.guilds[guildId];
  }

  updateGuild(guildId, mutator) {
    const guildData = this.guild(guildId);
    const result = mutator(guildData);
    this.save();
    return result;
  }
}

module.exports = { JsonDatabase };
