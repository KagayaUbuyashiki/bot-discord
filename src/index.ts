import {
  Client,
  GatewayIntentBits,
  Events,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
  REST,
  Routes,
  ButtonInteraction,
  CategoryChannel,
} from "discord.js";
import { config } from "./config.js";
import { createTicket, getTicket, deleteTicket } from "./tickets/state.js";
import { askCurrentQuestion, handleAnswer, processSubmit } from "./tickets/flow.js";
import { setupPainelCommand, handleSetupPainel } from "./commands/setup-painel.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// === Slash commands registration ===
async function registerCommands(): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(config.token);
  try {
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: [setupPainelCommand.toJSON()] },
    );
    console.log("✓ Slash commands registrados");
  } catch (e) {
    console.error("Erro ao registrar comandos:", e);
  }
}

// === Bot ready ===
client.once(Events.ClientReady, async (c) => {
  console.log(`✓ Bot online como ${c.user.tag}`);
  await registerCommands();
});

// === Slash command handler ===
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand() && interaction.commandName === "setup-painel") {
    await handleSetupPainel(interaction);
    return;
  }

  // === Botão "Abrir Relatório" ===
  if (interaction.isButton() && interaction.customId === "open_report_ticket") {
    await handleOpenTicket(interaction);
    return;
  }

  // === Botão "Enviar relatório" ===
  if (interaction.isButton() && interaction.customId.startsWith("ticket_submit_")) {
    await handleSubmitButton(interaction);
    return;
  }

  // === Botão "Cancelar" ===
  if (interaction.isButton() && interaction.customId.startsWith("ticket_cancel_")) {
    await handleCancelButton(interaction);
    return;
  }
});

async function handleOpenTicket(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const guild = interaction.guild;
    if (!guild) throw new Error("Sem guild");

    const category = await guild.channels.fetch(config.categoryId);
    if (!category || category.type !== ChannelType.GuildCategory) {
      await interaction.editReply("❌ Categoria de relatórios não encontrada. Avisa um admin.");
      return;
    }

    // Sanitiza nome do usuário pro nome do canal
    const safeName = interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .slice(0, 20);
    const channelName = `relatorio-${safeName}`;

    // Verifica se já existe um canal aberto pra esse user
    const existing = guild.channels.cache.find(
      (c) => c.parentId === config.categoryId && c.name === channelName,
    );
    if (existing) {
      await interaction.editReply(`Você já tem um relatório aberto em <#${existing.id}>`);
      return;
    }

    // Permissões: ninguém vê, exceto o user, o bot e (opcional) a role autorizada
    const permissionOverwrites: Array<{
      id: string;
      allow?: bigint[];
      deny?: bigint[];
    }> = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: client.user!.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
    ];

    if (config.authorizedRoleId) {
      permissionOverwrites.push({
        id: config.authorizedRoleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
      });
    }

    const newChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: config.categoryId,
      permissionOverwrites,
    });

    const state = createTicket(newChannel.id, interaction.user.id, interaction.user.username);

    await newChannel.send(
      `Bem-vindo, <@${interaction.user.id}>! Vou te fazer algumas perguntas pra registrar seu relatório. ` +
      `Se quiser cancelar a qualquer momento, é só fechar o canal.`,
    );
    await askCurrentQuestion(newChannel as TextChannel, state);

    await interaction.editReply(`✅ Canal criado: <#${newChannel.id}>`);
  } catch (e) {
    console.error("handleOpenTicket error:", e);
    await interaction.editReply(
      `❌ Erro ao abrir canal: ${e instanceof Error ? e.message : "desconhecido"}`,
    );
  }
}

async function handleSubmitButton(interaction: ButtonInteraction): Promise<void> {
  const channelId = interaction.customId.replace("ticket_submit_", "");
  const state = getTicket(channelId);
  if (!state) {
    await interaction.reply({ content: "Sessão de ticket expirada.", ephemeral: true });
    return;
  }
  if (interaction.user.id !== state.userId) {
    await interaction.reply({
      content: "Apenas o autor do ticket pode enviar.",
      ephemeral: true,
    });
    return;
  }
  await interaction.deferUpdate();
  await processSubmit(interaction.channel as TextChannel, state);
}

async function handleCancelButton(interaction: ButtonInteraction): Promise<void> {
  const channelId = interaction.customId.replace("ticket_cancel_", "");
  const state = getTicket(channelId);
  if (!state) {
    await interaction.reply({ content: "Sessão expirada.", ephemeral: true });
    return;
  }
  if (interaction.user.id !== state.userId) {
    await interaction.reply({
      content: "Apenas o autor pode cancelar.",
      ephemeral: true,
    });
    return;
  }
  await interaction.reply("❌ Relatório cancelado. Canal será apagado em 5 segundos.");
  deleteTicket(channelId);
  setTimeout(() => {
    (interaction.channel as TextChannel).delete().catch(() => {});
  }, 5_000);
}

// === Mensagens em canais de ticket ===
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.channel.isTextBased() || message.channel.isDMBased()) return;

  const channel = message.channel as TextChannel;
  if (channel.parentId !== config.categoryId) return;

  const state = getTicket(channel.id);
  if (!state) return;
  if (state.userId !== message.author.id) return;
  if (state.step === "awaiting_confirmation" || state.step === "submitting" || state.step === "done") {
    return;
  }

  try {
    await handleAnswer(message, state);
  } catch (e) {
    console.error("handleAnswer error:", e);
    await channel.send(`⚠ Erro: ${e instanceof Error ? e.message : "desconhecido"}`);
  }
});

// === Channel deleted: limpa estado ===
client.on(Events.ChannelDelete, (channel) => {
  if (channel.type === ChannelType.GuildText) {
    deleteTicket(channel.id);
  }
});

// === Login ===
client.login(config.token).catch((e) => {
  console.error("❌ Falha ao logar no Discord:", e);
  process.exit(1);
});

// === Graceful shutdown ===
process.on("SIGINT", () => {
  console.log("Encerrando bot...");
  client.destroy();
  process.exit(0);
});
