class CommandRouter {
  constructor(prefix) {
    this.prefix = prefix.toLowerCase();
    this.commands = new Map();
  }

  register(command) {
    const aliases = [command.name, ...(command.aliases || [])];

    for (const alias of aliases) {
      this.commands.set(alias.toLowerCase(), command);
    }
  }

  list() {
    return [...new Set(this.commands.values())];
  }

  async handle(message, baseContext) {
    const content = message.content.trim();

    if (!content.toLowerCase().startsWith(this.prefix)) return;

    const body = content.slice(this.prefix.length).trim();
    if (!body) return;

    const [rawName, ...args] = body.split(/\s+/);
    const command = this.commands.get(rawName.toLowerCase());
    if (!command) return;

    try {
      await command.execute({
        ...baseContext,
        message,
        args,
        commandName: rawName.toLowerCase()
      });
    } catch (error) {
      console.error(`[Command:${command.name}]`, error);
      await message.reply('Ocorreu um erro ao executar esse comando. Verifique minhas permissoes e tente novamente.');
    }
  }
}

module.exports = { CommandRouter };
