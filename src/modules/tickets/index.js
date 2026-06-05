const {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events
} = require("discord.js")

module.exports = (client) => {

  // COMANDO PARA ENVIAR O PAINEL
  client.on("messageCreate", async (message) => {

    if (message.author.bot) return

    if (message.content === "mpainelticket") {

      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("❌ Você precisa ser administrador.")
      }

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("🎫 Central de Tickets")
        .setDescription(
          "Clique no botão abaixo para abrir um ticket.\n\n" +
          "Explique seu problema para nossa equipe."
        )
        .setFooter({
          text: "Sistema de Tickets"
        })

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("abrir_ticket")
            .setLabel("Abrir Ticket")
            .setEmoji("🎫")
            .setStyle(ButtonStyle.Primary)
        )

      await message.channel.send({
        embeds: [embed],
        components: [row]
      })
    }
  })

  // INTERAÇÕES
  client.on(Events.InteractionCreate, async (interaction) => {

    // BOTÃO ABRIR
    if (interaction.isButton()) {

      if (interaction.customId === "abrir_ticket") {

        const modal = new ModalBuilder()
          .setCustomId("modal_ticket")
          .setTitle("Abrir Ticket")

        const motivo = new TextInputBuilder()
          .setCustomId("motivo")
          .setLabel("Qual o motivo?")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)

        const row = new ActionRowBuilder().addComponents(motivo)

        modal.addComponents(row)

        return interaction.showModal(modal)
      }

      // ASSUMIR TICKET
      if (interaction.customId === "assumir_ticket") {

        const embed = new EmbedBuilder()
          .setColor("Green")
          .setDescription(`✅ Ticket assumido por ${interaction.user}`)

        return interaction.reply({
          embeds: [embed]
        })
      }

      // FECHAR TICKET
      if (interaction.customId === "fechar_ticket") {

        await interaction.reply({
          content: "🔒 Fechando ticket em 5 segundos...",
          ephemeral: true
        })

        setTimeout(() => {
          interaction.channel.delete().catch(() => { })
        }, 5000)
      }
    }

    // MODAL
    if (interaction.isModalSubmit()) {

      if (interaction.customId === "modal_ticket") {

        const motivo = interaction.fields.getTextInputValue("motivo")

        // VERIFICA SE JA TEM TICKET
        const ticketExistente = interaction.guild.channels.cache.find(c =>
          c.name === `ticket-${interaction.user.username.toLowerCase()}`
        )

        if (ticketExistente) {
          return interaction.reply({
            content: `❌ Você já possui um ticket aberto: ${ticketExistente}`,
            ephemeral: true
          })
        }

        // CRIA CANAL
        const canal = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,

          // ID DA CATEGORIA
          parent: "1511504224654200872",

          permissionOverwrites: [

            {
              id: interaction.guild.id,
              deny: [
                PermissionsBitField.Flags.ViewChannel
              ]
            },

            {
              id: interaction.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            },

            {
              id: client.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            }

          ]
        })

        const embed = new EmbedBuilder()
          .setColor("#5865F2")
          .setTitle("🎫 Ticket Aberto")
          .addFields(
            {
              name: "👤 Usuário",
              value: `${interaction.user}`,
              inline: true
            },
            {
              name: "📌 Status",
              value: "Aguardando equipe",
              inline: true
            },
            {
              name: "📝 Motivo",
              value: motivo
            }
          )
          .setTimestamp()

        const buttons = new ActionRowBuilder()
          .addComponents(

            new ButtonBuilder()
              .setCustomId("assumir_ticket")
              .setLabel("Assumir")
              .setEmoji("📌")
              .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
              .setCustomId("fechar_ticket")
              .setLabel("Fechar")
              .setEmoji("🔒")
              .setStyle(ButtonStyle.Danger)

          )

        await canal.send({
          content: `${interaction.user}`,
          embeds: [embed],
          components: [buttons]
        })

        await interaction.reply({
          content: `✅ Ticket criado em ${canal}`,
          ephemeral: true
        })
      }
    }
  })
}
