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

export const setupPainelCommand = new SlashCommandBuilder()
  .setName("setup-painel")
  .setDescription("(Admin) Posta o painel com o botão Abrir Relatório neste canal")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function handleSetupPainel(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.channel || !(interaction.channel instanceof TextChannel)) {
    await interaction.reply({ content: "Use este comando em um canal de texto.", ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xff6b00)
    .setTitle("📋 Sistema de Relatórios — Free Stalkers PDA")
    .setDescription(
      "Concluiu uma missão na Zona? Clica no botão abaixo para abrir um canal privado e enviar seu relatório.\n\n" +
      "O bot vai te fazer algumas perguntas e enviar tudo direto para o PDA dos oficiais.\n\n" +
      "**Tenha em mãos:**\n" +
      "• Seu Steam ID\n" +
      "• Capturas de tela do PDA (se tiver)\n" +
      "• Detalhes da missão",
    )
    .setFooter({ text: "Free Stalkers • Sistema de Relatórios v1.0" });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("open_report_ticket")
      .setLabel("Abrir Relatório")
      .setEmoji("📝")
      .setStyle(ButtonStyle.Primary),
  );

  await interaction.channel.send({ embeds: [embed], components: [row] });
  await interaction.reply({ content: "✅ Painel postado.", ephemeral: true });
}
