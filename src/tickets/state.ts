/**
 * Estado da conversa de cada ticket. Mantido em memória — se o bot reiniciar,
 * o usuário só clica em "Abrir Relatório" novamente.
 */

export type TicketStep =
  | "ask_steam_id"
  | "ask_completed"
  | "ask_mission_name"
  | "ask_how_was_it"
  | "ask_difficulty"
  | "ask_mutants_killed"
  | "ask_observations"
  | "ask_attachments"
  | "awaiting_confirmation"
  | "submitting"
  | "done";

export interface TicketState {
  channelId: string;
  userId: string;
  username: string;
  step: TicketStep;
  createdAt: number;
  answers: {
    steam_id?: string;
    completed?: string;
    mission_name?: string;
    how_was_it?: string;
    difficulty?: string;
    mutants_killed?: string;
    observations?: string;
  };
  attachments: string[];
}

const tickets = new Map<string, TicketState>();

export function createTicket(channelId: string, userId: string, username: string): TicketState {
  const state: TicketState = {
    channelId,
    userId,
    username,
    step: "ask_steam_id",
    createdAt: Date.now(),
    answers: {},
    attachments: [],
  };
  tickets.set(channelId, state);
  return state;
}

export function getTicket(channelId: string): TicketState | undefined {
  return tickets.get(channelId);
}

export function deleteTicket(channelId: string): void {
  tickets.delete(channelId);
}

// Limpa tickets abandonados há mais de 1h (roda a cada 10min)
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, state] of tickets.entries()) {
    if (state.createdAt < cutoff) tickets.delete(id);
  }
}, 10 * 60 * 1000);
