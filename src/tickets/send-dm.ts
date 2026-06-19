import { Client, EmbedBuilder } from "discord.js";

export async function handleSendDm(client: Client, data: any) {
  const { discord_user_id, content } = data;
  
  if (!discord_user_id || !content) {
    return { ok: false, error: "discord_user_id e content são obrigatórios" };
  }
  
  try {
    const user = await client.users.fetch(discord_user_id);
    if (!user) {
      return { ok: false, error: "Usuário não encontrado" };
    }
    
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("📨 Mensagem do PDA Free Stalkers")
      .setDescription(content)
      .setFooter({ text: "Sistema PDA • Free Stalkers" });
    
    await user.send({ embeds: [embed] }).catch(() => null);
    
    console.log(`✓ DM enviada para ${user.tag}`);
    return { ok: true };
    
  } catch (error) {
    console.error(`Erro ao enviar DM para ${discord_user_id}:`, error);
    return { ok: false, error: "Erro ao enviar mensagem" };
  }
}