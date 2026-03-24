// Phase 1: Quiz gates — bird flies through correct answer
export const phase1Questions = [
  // Level 1-5: Stupid easy (для крео — актёр тупит на этих)
  { q: "Qual é a capital do Brasil?", a: "Brasília", b: "Rio de Janeiro", correct: "a" },
  { q: "Quanto é 2 + 2?", a: "4", b: "5", correct: "a" },
  { q: "Qual a cor do céu?", a: "Azul", b: "Verde", correct: "a" },
  { q: "Quantos dias tem uma semana?", a: "7", b: "5", correct: "a" },
  { q: "O sol nasce no...?", a: "Leste", b: "Oeste", correct: "a" },
  // Level 6-10: Medium
  { q: "Qual o maior oceano?", a: "Pacífico", b: "Atlântico", correct: "a" },
  { q: "Em que ano o Brasil ganhou\na Copa de 2002?", a: "2002", b: "2006", correct: "a" },
  { q: "Quantos estados tem o Brasil?", a: "26 + DF", b: "24", correct: "a" },
  { q: "O que é PIX?", a: "Pagamento instantâneo", b: "Rede social", correct: "a" },
  { q: "Qual moeda dos EUA?", a: "Dólar", b: "Euro", correct: "a" },
  // Level 11-14: Qualifying (answers we want on the right)
  { q: "Sua renda mensal?", a: "Menos de R$2.000", b: "Mais de R$2.000", correct: "b", qualifying: true },
  { q: "Tem dinheiro para investir?", a: "Não", b: "Sim, tenho reserva", correct: "b", qualifying: true },
  { q: "Já investiu alguma vez?", a: "Nunca", b: "Sim, já tentei", correct: "b", qualifying: true },
  { q: "Sua idade?", a: "Menos de 21", b: "21 ou mais", correct: "b", qualifying: true },
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
