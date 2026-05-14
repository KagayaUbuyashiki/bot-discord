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

export const setupRelatorioCommand = new SlashCommandBuilder()
  .setName("setup-relatorio")
  .setDescription("(Admin) Posta o painel de RELATÓRIO DE MISSÃO")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function handleSetupRelatorio(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.channel || !(interaction.channel instanceof TextChannel)) {
    await interaction.reply({ content: "Use este comando em um canal de texto.", ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xff6b00)
    .setTitle("📝 Relatórios de Missão — Free Stalkers")
    .setDescription(
      "Concluiu uma missão na Zona? Registre seus feitos para ganhar reputação e subir no ranking da facção.\n\n" +
        "**Instruções:**\n" +
        "• Clique no botão abaixo para iniciar o relato.\n" +
        "• Tenha capturas de tela prontas (se houver).\n" +
        "• Seja honesto nos detalhes — a IA do PDA valida as informações.",
    )
    .setFooter({ text: "Free Stalkers • Sistema de Relatórios" });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("open_report_ticket")
      .setLabel("Abrir Relatório")
      .setEmoji("📝")
      .setStyle(ButtonStyle.Primary),
  );

  await interaction.channel.send({ embeds: [embed], components: [row] });
  await interaction.reply({ content: "✅ Painel de relatórios postado.", ephemeral: true });
}
