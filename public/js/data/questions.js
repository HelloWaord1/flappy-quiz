// Phase 1: Quiz gates — bird flies through correct answer
// correct: "a" = top passage, "b" = bottom passage
// Randomized so player has to actually read!
export const phase1Questions = [
  // Level 1-5: Stupid easy
  { q: "Qual é a capital do Brasil?", a: "Brasília", b: "Rio de Janeiro", correct: "a" },
  { q: "Quanto é 2 + 2?", a: "5", b: "4", correct: "b" },
  { q: "Qual a cor do céu?", a: "Verde", b: "Azul", correct: "b" },
  { q: "Quantos dias tem uma semana?", a: "7", b: "5", correct: "a" },
  { q: "O sol nasce no...?", a: "Oeste", b: "Leste", correct: "b" },
  // Level 6-10: Medium
  { q: "Qual o maior oceano?", a: "Atlântico", b: "Pacífico", correct: "b" },
  { q: "Em que ano o homem pisou na Lua?", a: "1969", b: "1975", correct: "a" },
  { q: "Quantos estados tem o Brasil?", a: "24", b: "26 + DF", correct: "b" },
  { q: "O que é PIX?", a: "Pagamento instantâneo", b: "Rede social", correct: "a" },
  { q: "Qual moeda dos EUA?", a: "Euro", b: "Dólar", correct: "b" },
  // Level 11-14: Qualifying
  { q: "Sua renda mensal?", a: "Mais de R$2.000", b: "Menos de R$2.000", correct: "a", qualifying: true },
  { q: "Tem dinheiro para investir?", a: "Não tenho", b: "Sim, tenho reserva", correct: "b", qualifying: true },
  { q: "Já investiu alguma vez?", a: "Sim, já tentei", b: "Nunca", correct: "a", qualifying: true },
  { q: "Sua idade?", a: "21 ou mais", b: "Menos de 21", correct: "a", qualifying: true },
];

// Phase 2: Financial quiz (fullscreen Q&A between flappy phases)
export const phase2Questions = [
  { q: "O que é inflação?", options: ["Aumento geral dos preços", "Queda do dólar", "Taxa de juros", "Imposto"], correct: 0 },
  { q: "O que significa diversificar\ninvestimentos?", options: ["Investir em vários ativos", "Investir tudo em ações", "Guardar na poupança", "Comprar dólar"], correct: 0 },
  { q: "O que é Tesouro Direto?", options: ["Títulos públicos", "Ações da bolsa", "Criptomoeda", "Conta poupança"], correct: 0 },
  { q: "Qual o maior risco de investir?", options: ["Perder o capital", "Ganhar muito", "Pagar impostos", "Nenhum risco"], correct: 0 },
  { q: "O que é renda passiva?", options: ["Dinheiro sem trabalho ativo", "Salário mensal", "Empréstimo", "Dívida"], correct: 0 },
];

// Phase 3: Trading scenarios (price direction)
export const phase3Scenarios = [
  { direction: "up", hint: "Notícia: Banco Central corta juros" },
  { direction: "down", hint: "Notícia: Inflação sobe 2%" },
  { direction: "up", hint: "Notícia: PIB cresce 3%" },
  { direction: "down", hint: "Notícia: Crise global se aprofunda" },
  { direction: "up", hint: "Notícia: Empresa bate recorde de lucro" },
  { direction: "down", hint: "Notícia: Taxa de desemprego sobe" },
  { direction: "up", hint: "Notícia: Novo acordo comercial assinado" },
  { direction: "down", hint: "Notícia: Dólar dispara" },
];
