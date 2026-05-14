import { Client, EmbedBuilder } from "discord.js";
import { config } from "../config.js";

export async function handleApprovalNotification(client: Client, data: any) {
  const { discord_user_id, role_assigned, discord_username } = data;

  if (!discord_user_id) return;

  try {
    const user = await client.users.fetch(discord_user_id);
    if (!user) return;

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle("📡 PDA SINCRONIZADO — FREE STALKERS")
      .setDescription(
        `Olá, **${discord_username || "Stalker"}**!\n\n` +
          `Seu acesso à rede interna da facção foi **aprovado**.\n` +
          `Seu PDA agora está operando em modo oficial.\n\n` +
          `**Cargo Atribuído:** ${role_assigned || "Oficial"}\n\n` +
          `Acesse agora o sistema completo:\n` +
          `https://pda-free-stalker.vercel.app/`,
      )
      .setThumbnail("https://pda-free-stalker.vercel.app/pda-icon.png") // Opcional se existir
      .setFooter({ text: "Boa sorte na Zona, Stalker." });

    await user.send({ embeds: [embed] });
    console.log(`✓ Notificação de aprovação enviada para ${discord_username}`);

    // Remover cargo de novato se necessário
    if (config.guildId && config.unofficalRoleId) {
      const guild = await client.guilds.fetch(config.guildId);
      const member = await guild.members.fetch(discord_user_id).catch(() => null);
      if (member) {
        await member.roles.remove(config.unofficalRoleId).catch(() => null);
        console.log(`✓ Cargo de novato removido de ${discord_username}`);
      }
    }
  } catch (error) {
    console.error(`Erro ao enviar notificação de aprovação para ${discord_user_id}:`, error);
  }
}
