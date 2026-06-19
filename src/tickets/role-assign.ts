// c:\Users\Matheus\freestalkers-bot\src\tickets\role-assign.ts
import { Client, GuildMember } from "discord.js";
import { config } from "../config.js";

export async function handleAssignDefaultRole(client: Client, data: any) {
  const { discord_user_id } = data;
  
  if (!discord_user_id || !config.unofficalRoleId) return;
  
  try {
    const guild = await client.guilds.fetch(config.guildId);
    const member = await guild.members.fetch(discord_user_id).catch(() => null);
    
    if (!member) {
      console.warn(`⚠ Usuário ${discord_user_id} não encontrado no servidor`);
      return;
    }
    
    // Verifica se o usuário já tem o cargo
    if (member.roles.cache.has(config.unofficalRoleId)) {
      console.log(`✓ Usuário ${member.user.tag} já tem o cargo padrão`);
      return;
    }
    
    // Atribui o cargo padrão
    await member.roles.add(config.unofficalRoleId);
    console.log(`✓ Cargo padrão atribuído a ${member.user.tag}`);
    
  } catch (error) {
    console.error(`Erro ao atribuir cargo padrão para ${discord_user_id}:`, error);
  }
}