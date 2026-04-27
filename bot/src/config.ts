import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Variável de ambiente obrigatória: ${name}`);
    process.exit(1);
  }
  return value;
}

export const config = {
  token: required("DISCORD_TOKEN"),
  clientId: required("DISCORD_CLIENT_ID"),
  guildId: required("DISCORD_GUILD_ID"),
  categoryId: required("DISCORD_CATEGORY_ID"),
  authorizedRoleId: process.env.DISCORD_AUTHORIZED_ROLE_ID || null,
  pdaApiUrl: required("PDA_API_URL"),
  pdaSecret: required("PDA_WEBHOOK_SECRET"),
};
