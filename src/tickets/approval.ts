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
      .setThumbnail("https://pda-free-stalker.vercel.app/pda-icon.png")
      .setFooter({ text: "Boa sorte na Zona, Stalker." });

    await user.send({ embeds: [embed] }).catch(() => null);
    console.log(`✓ Notificação de aprovação enviada para ${discord_username}`);

    if (!config.guildId) return;
    const guild = await client.guilds.fetch(config.guildId);
    const member = await guild.members.fetch(discord_user_id).catch(() => null);
    if (!member) return;

    // Remove cargo de novato/não-oficial
    if (config.unofficalRoleId) {
      await member.roles.remove(config.unofficalRoleId).catch(() => null);
      console.log(`✓ Cargo de novato removido de ${discord_username}`);
    }

    // Atribui o cargo aprovado, se mapeado
    const roleKey = (role_assigned || "").toLowerCase();
    const targetRoleId = config.roleIds[roleKey];
    if (targetRoleId) {
      await member.roles.add(targetRoleId).catch((err) => {
        console.error(`Falha ao adicionar cargo ${roleKey}:`, err);
      });
      console.log(`✓ Cargo ${roleKey} (${targetRoleId}) atribuído a ${discord_username}`);
    } else if (roleKey) {
      console.warn(
        `⚠ Sem Role ID configurado para "${roleKey}". Configure DISCORD_ROLE_${roleKey.toUpperCase()}_ID no Railway.`,
      );
    }
  } catch (error) {
    console.error(`Erro ao processar aprovação para ${discord_user_id}:`, error);
  }
}

// .
