// Phase 1: General quiz + qualifying
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
  // Level 11-14: Qualifying (any answer = correct)
  { q: "Sua renda mensal?", a: "Mais de R$2.000", b: "Menos de R$2.000", correct: "a", qualifying: true },
  { q: "Tem dinheiro para investir?", a: "Não tenho", b: "Sim, tenho reserva", correct: "b", qualifying: true },
  { q: "Já investiu alguma vez?", a: "Sim, já tentei", b: "Nunca", correct: "a", qualifying: true },
  { q: "Sua idade?", a: "21 ou mais", b: "Menos de 21", correct: "a", qualifying: true },
];

// Phase 2: Financial quiz — ALSO as flappy bird gates (Level 2)
export const phase2Questions = [
  { q: "O que é inflação?", a: "Preços sobem", b: "Preços caem", correct: "a" },
  { q: "Diversificar é...", a: "Vários ativos", b: "Tudo em um só", correct: "a" },
  { q: "Tesouro Direto é...", a: "Títulos públicos", b: "Criptomoeda", correct: "a" },
  { q: "Maior risco de investir?", a: "Perder capital", b: "Nenhum risco", correct: "a" },
  { q: "Renda passiva é...", a: "Ganho sem trabalho ativo", b: "Salário mensal", correct: "a" },
  { q: "Juros compostos são...", a: "Juros sobre juros", b: "Juros fixos", correct: "a" },
  { q: "O que é uma ação?", a: "Parte de uma empresa", b: "Tipo de imposto", correct: "a" },
  { q: "Poupança rende mais que\ninflação?", a: "Nem sempre", b: "Sempre", correct: "a" },
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
