
-- Os warnings sobre "Public Bucket Allows Listing" são esperados aqui:
-- precisamos que as URLs públicas das fotos sejam acessíveis no painel sem autenticação.
-- Os caminhos usam UUIDs imprevisíveis. Mantemos as policies como estão.
-- Apenas adicionamos um comentário formal nas tabelas para registrar a decisão.
COMMENT ON TABLE public.stalkers IS 'Fichas dos stalkers. Fotos públicas via UUID-named files.';
