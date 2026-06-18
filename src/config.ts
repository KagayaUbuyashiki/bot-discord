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
  // Obrigatórias: usa a função required() que valida se a variável existe, senão para a aplicação
  token: required("DISCORD_TOKEN"), // required pega o valor de process.env["DISCORD_TOKEN"] internamente
  clientId: required("DISCORD_CLIENT_ID"),
  guildId: required("DISCORD_GUILD_ID"),
  categoryId: required("DISCORD_CATEGORY_ID"),
  // Opcionais: usa process.env diretamente pois não são obrigatórias, se não existir retorna null
  authorizedRoleId: process.env.DISCORD_AUTHORIZED_ROLE_ID || null,
  unofficalRoleId: process.env.DISCORD_UNOFFICIAL_ROLE_ID || null,
  pdaApiUrl: required("PDA_API_URL"),
  pdaSecret: required("PDA_WEBHOOK_SECRET"),
  roleIds: {
    iniciado: process.env.DISCORD_ROLE_INICIADO_ID || null,
    medio: process.env.DISCORD_ROLE_MEDIO_ID || null,
    high: process.env.DISCORD_ROLE_HIGH_ID || null,
    admin: process.env.DISCORD_ROLE_ADMIN_ID || null,
  } as Record<string, string | null>,
};

// .
