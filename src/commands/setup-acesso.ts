import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";

export const setupAcessoCommand = new SlashCommandBuilder()
  .setName("setup-acesso")
  .setDescription("(Admin) Posta o painel de SOLICITAÇÃO DE ACESSO")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function handleSetupAcesso(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.channel || !(interaction.channel instanceof TextChannel)) {
    await interaction.reply({ content: "Use este comando em um canal de texto.", ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x2f3136)
    .setTitle("🔑 Solicitação de Acesso — Free Stalkers")
    .setDescription(
      "Seja bem-vindo à rede interna. Para se tornar um membro oficial e ter seu PDA sincronizado, você precisa primeiro solicitar seu acesso.\n\n" +
        "**O que acontece agora?**\n" +
        "1. Clique no botão abaixo para abrir um canal privado.\n" +
        "2. Forneça seu Steam ID e Nome do Personagem.\n" +
        "3. Um oficial irá revisar sua ficha e te dar o cargo de Membro Não Oficial.\n\n" +
        "**Nota:** Após o registro, você poderá customizar seu perfil no nosso site oficial.",
    )
    .setFooter({ text: "Free Stalkers • Sistema de Recrutamento" });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("open_register_ticket")
      .setLabel("Solicitar Acesso")
      .setEmoji("🔑")
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.channel.send({ embeds: [embed], components: [row] });
  await interaction.reply({ content: "✅ Painel de acesso postado.", ephemeral: true });
}

// .
