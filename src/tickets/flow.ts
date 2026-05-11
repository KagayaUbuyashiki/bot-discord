import { Message, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { TicketState, getTicket } from "./state.js";
import { submitReport } from "./submit.js";

const QUESTIONS: Record<TicketState["step"], string | null> = {
  ask_steam_id:
    "Antes de começar, preciso do seu **Steam ID** (pode ser vanity URL ou ID numérico) — assim consigo vincular o relatório ao seu perfil de stalker.",
  ask_character_name: "Qual o nome do seu personagem na Zona?",
  ask_completed: "Iae stalker, conseguiu completar a missão? **(sim / parcialmente / não)**",
  ask_mission_name: "Qual missão te passaram?",
  ask_how_was_it: "E aí, como foi? Conta tudo nos detalhes.",
  ask_difficulty: "Achou difícil? **(fácil / médio / difícil / extremo)**",
  ask_mutants_killed:
    "Matou quantos mutantes? Se sim, quais? Pode descrever (ex: '3 cães cegos, 1 boar').",
  ask_observations:
    "Algum problema no caminho que gostaria de deixar como observação? Se não, manda **'nada'**.",
  ask_attachments:
    "Tem alguma imagem capturada pelo seu PDA pra provar? Se sim, **anexa as imagens nesta mensagem** (pode mandar várias). Se não tiver, manda **'pular'**.",
  awaiting_confirmation: null,
  submitting: null,
  done: null,
};

const NEXT_STEP: Record<TicketState["step"], TicketState["step"]> = {
  ask_steam_id: "ask_completed",
  ask_completed: "ask_mission_name",
  ask_mission_name: "ask_how_was_it",
  ask_how_was_it: "ask_difficulty",
  ask_difficulty: "ask_mutants_killed",
  ask_mutants_killed: "ask_observations",
  ask_observations: "ask_attachments",
  ask_attachments: "awaiting_confirmation",
  awaiting_confirmation: "submitting",
  submitting: "done",
  done: "done",
};

const ANSWER_KEYS: Partial<Record<TicketState["step"], keyof TicketState["answers"]>> = {
  ask_steam_id: "steam_id",
  ask_character_name: "character_name",
  ask_completed: "completed",
  ask_mission_name: "mission_name",
  ask_how_was_it: "how_was_it",
  ask_difficulty: "difficulty",
  ask_mutants_killed: "mutants_killed",
  ask_observations: "observations",
};

export async function askCurrentQuestion(channel: TextChannel, state: TicketState): Promise<void> {
  const question = QUESTIONS[state.step];
  if (question) {
    await channel.send(`📡 ${question}`);
  }
}

export async function handleAnswer(message: Message, state: TicketState): Promise<void> {
  const channel = message.channel as TextChannel;
  const content = message.content.trim();

  // Etapa de anexos: coleta imagens da mensagem
  if (state.step === "ask_attachments") {
    const imageAttachments = message.attachments.filter(
      (a) => a.contentType?.startsWith("image/") ?? false,
    );
    for (const att of imageAttachments.values()) {
      state.attachments.push(att.url);
    }

    if (imageAttachments.size === 0 && content.toLowerCase() !== "pular") {
      await channel.send("⚠ Anexa imagens nessa mensagem ou manda **'pular'**.");
      return;
    }

    if (imageAttachments.size > 0) {
      await channel.send(`✓ ${imageAttachments.size} imagem(ns) recebida(s).`);
    }

    // Pular para o fim se for registro
    if (state.type === "register") {
      state.step = "awaiting_confirmation";
    } else {
      state.step = NEXT_STEP[state.step];
    }
    await sendSummary(channel, state);
    return;
  }

  // Demais etapas: salva texto e avança
  const key = ANSWER_KEYS[state.step];
  if (key) {
    if (!content) {
      await channel.send("⚠ Resposta vazia — tenta de novo.");
      return;
    }
    state.answers[key] = content.slice(0, 2000);
  }

  // Lógica de pulo de etapas baseada no tipo de ticket
  if (state.type === "register") {
    if (state.step === "ask_steam_id") {
      state.step = "ask_character_name";
    } else if (state.step === "ask_character_name") {
      state.step = "ask_attachments";
    }
  } else {
    state.step = NEXT_STEP[state.step];
  }

  await askCurrentQuestion(channel, state);
}

async function sendSummary(channel: TextChannel, state: TicketState): Promise<void> {
  const a = state.answers;
  const isRegister = state.type === "register";

  const summary = isRegister
    ? [
        "**📋 Resumo da sua solicitação de acesso**",
        "",
        `**Nome do Personagem:** ${a.character_name ?? "—"}`,
        `**Steam ID:** ${a.steam_id ?? "—"}`,
        `**Fotos anexadas:** ${state.attachments.length}`,
        "",
        "Confirma os dados acima?",
      ]
    : [
        "**📋 Resumo do seu relatório**",
        "",
        `**Steam ID:** ${a.steam_id ?? "—"}`,
        `**Missão:** ${a.mission_name ?? "—"}`,
        `**Status:** ${a.completed ?? "—"}`,
        `**Dificuldade:** ${a.difficulty ?? "—"}`,
        `**Mutantes:** ${a.mutants_killed ?? "—"}`,
        `**Relato:** ${a.how_was_it ?? "—"}`,
        `**Observações:** ${a.observations ?? "—"}`,
        `**Fotos anexadas:** ${state.attachments.length}`,
        "",
        "Confirma o envio do relatório?",
      ];

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_submit_${state.channelId}`)
      .setLabel(isRegister ? "Enviar Solicitação" : "Enviar Relatório")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`ticket_cancel_${state.channelId}`)
      .setLabel("Cancelar")
      .setStyle(ButtonStyle.Danger),
  );

  await channel.send({
    content: summary.join("\n"),
    components: [row],
  });
}

export async function processSubmit(channel: TextChannel, state: TicketState): Promise<void> {
  state.step = "submitting";
  await channel.send("📡 Enviando para a base do PDA...");

  try {
    const result = await submitReport(state);
    if (result.ok) {
      await channel.send(
        `✅ **Relatório enviado!** ID: \`${result.id}\`\n` +
          `Os oficiais vão analisar em breve. Este canal será apagado em 30 segundos.`,
      );
      state.step = "done";
      setTimeout(() => {
        channel.delete().catch(() => {});
      }, 30_000);
    } else {
      await channel.send(`❌ Falha ao enviar: ${result.error}\nTenta de novo ou chama um oficial.`);
      state.step = "awaiting_confirmation";
    }
  } catch (e) {
    await channel.send(`❌ Erro inesperado: ${e instanceof Error ? e.message : "desconhecido"}`);
    state.step = "awaiting_confirmation";
  }
}

export function getActiveTicket(channelId: string): TicketState | undefined {
  return getTicket(channelId);
}
