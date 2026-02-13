// Grammar data — PT-PT conjugation tables and exercise templates

export const grammarUnits = [
  {
    id: 'ser_estar',
    title: 'Ser e Estar',
    subtitle: 'To be (permanent vs temporary)',
    icon: '🔷',
    requiredVocab: 20,
    conjugations: {
      ser: {
        eu: 'sou', tu: 'és', 'ele/ela': 'é',
        nós: 'somos', 'eles/elas': 'são'
      },
      estar: {
        eu: 'estou', tu: 'estás', 'ele/ela': 'está',
        nós: 'estamos', 'eles/elas': 'estão'
      }
    },
    exercises: [
      { type: 'fill', sentence: 'Eu ___ português.', answer: 'sou', verb: 'ser', options: ['sou', 'estou', 'são', 'está'] },
      { type: 'fill', sentence: 'Tu ___ em casa.', answer: 'estás', verb: 'estar', options: ['és', 'estás', 'são', 'estamos'] },
      { type: 'fill', sentence: 'Ela ___ professora.', answer: 'é', verb: 'ser', options: ['é', 'está', 'são', 'estou'] },
      { type: 'fill', sentence: 'Nós ___ cansados.', answer: 'estamos', verb: 'estar', options: ['somos', 'estamos', 'estão', 'são'] },
      { type: 'fill', sentence: 'Eles ___ de Lisboa.', answer: 'são', verb: 'ser', options: ['são', 'estão', 'somos', 'é'] },
      { type: 'fill', sentence: 'O café ___ quente.', answer: 'está', verb: 'estar', options: ['é', 'está', 'são', 'estou'] },
      { type: 'fill', sentence: 'A casa ___ grande.', answer: 'é', verb: 'ser', options: ['é', 'está', 'são', 'estamos'] },
      { type: 'fill', sentence: 'Eu ___ feliz hoje.', answer: 'estou', verb: 'estar', options: ['sou', 'estou', 'é', 'estás'] },
      { type: 'conjugate', verb: 'ser', pronoun: 'eu', answer: 'sou' },
      { type: 'conjugate', verb: 'estar', pronoun: 'tu', answer: 'estás' },
      { type: 'conjugate', verb: 'ser', pronoun: 'nós', answer: 'somos' },
      { type: 'conjugate', verb: 'estar', pronoun: 'eles/elas', answer: 'estão' },
    ],
  },
  {
    id: 'present_ar',
    title: 'Presente: Verbos -ar',
    subtitle: 'Present tense -ar verbs',
    icon: '🔤',
    requiredVocab: 30,
    conjugations: {
      falar: {
        eu: 'falo', tu: 'falas', 'ele/ela': 'fala',
        nós: 'falamos', 'eles/elas': 'falam'
      },
      gostar: {
        eu: 'gosto', tu: 'gostas', 'ele/ela': 'gosta',
        nós: 'gostamos', 'eles/elas': 'gostam'
      },
    },
    exercises: [
      { type: 'fill', sentence: 'Eu ___ português.', answer: 'falo', verb: 'falar', options: ['falo', 'falas', 'fala', 'falamos'] },
      { type: 'fill', sentence: 'Tu ___ no escritório.', answer: 'trabalhas', verb: 'trabalhar', options: ['trabalho', 'trabalhas', 'trabalha', 'trabalhamos'] },
      { type: 'fill', sentence: 'Ela ___ de música.', answer: 'gosta', verb: 'gostar', options: ['gosto', 'gostas', 'gosta', 'gostam'] },
      { type: 'fill', sentence: 'Nós ___ pão.', answer: 'compramos', verb: 'comprar', options: ['compro', 'compras', 'compra', 'compramos'] },
      { type: 'fill', sentence: 'Eles ___ em Lisboa.', answer: 'moram', verb: 'morar', options: ['moro', 'moras', 'mora', 'moram'] },
      { type: 'conjugate', verb: 'falar', pronoun: 'eu', answer: 'falo' },
      { type: 'conjugate', verb: 'gostar', pronoun: 'tu', answer: 'gostas' },
      { type: 'conjugate', verb: 'comprar', pronoun: 'nós', answer: 'compramos' },
      { type: 'conjugate', verb: 'morar', pronoun: 'ele/ela', answer: 'mora' },
      { type: 'sentence', words: ['Eu', 'gosto', 'de', 'café'], answer: 'Eu gosto de café' },
      { type: 'sentence', words: ['Tu', 'falas', 'português', 'bem'], answer: 'Tu falas português bem' },
    ],
  },
  {
    id: 'present_er_ir',
    title: 'Presente: Verbos -er / -ir',
    subtitle: 'Present tense -er and -ir verbs',
    icon: '📝',
    requiredVocab: 40,
    conjugations: {
      comer: {
        eu: 'como', tu: 'comes', 'ele/ela': 'come',
        nós: 'comemos', 'eles/elas': 'comem'
      },
      dormir: {
        eu: 'durmo', tu: 'dormes', 'ele/ela': 'dorme',
        nós: 'dormimos', 'eles/elas': 'dormem'
      },
    },
    exercises: [
      { type: 'fill', sentence: 'Eu ___ arroz ao almoço.', answer: 'como', verb: 'comer', options: ['como', 'comes', 'come', 'comemos'] },
      { type: 'fill', sentence: 'Tu ___ bem?', answer: 'dormes', verb: 'dormir', options: ['durmo', 'dormes', 'dorme', 'dormem'] },
      { type: 'fill', sentence: 'Ela ___ água.', answer: 'bebe', verb: 'beber', options: ['bebo', 'bebes', 'bebe', 'bebem'] },
      { type: 'fill', sentence: 'Nós ___ o livro.', answer: 'lemos', verb: 'ler', options: ['leio', 'lês', 'lê', 'lemos'] },
      { type: 'fill', sentence: 'Eles ___ uma carta.', answer: 'escrevem', verb: 'escrever', options: ['escrevo', 'escreves', 'escreve', 'escrevem'] },
      { type: 'conjugate', verb: 'comer', pronoun: 'eu', answer: 'como' },
      { type: 'conjugate', verb: 'dormir', pronoun: 'tu', answer: 'dormes' },
      { type: 'conjugate', verb: 'beber', pronoun: 'nós', answer: 'bebemos' },
      { type: 'sentence', words: ['Nós', 'comemos', 'peixe', 'ao', 'jantar'], answer: 'Nós comemos peixe ao jantar' },
    ],
  },
  {
    id: 'articles_gender',
    title: 'Artigos e Género',
    subtitle: 'Articles and gender',
    icon: '📎',
    requiredVocab: 30,
    exercises: [
      { type: 'fill', sentence: '___ gato dorme.', answer: 'O', options: ['O', 'A', 'Os', 'As'] },
      { type: 'fill', sentence: '___ casa é grande.', answer: 'A', options: ['O', 'A', 'Os', 'As'] },
      { type: 'fill', sentence: '___ sapatos são novos.', answer: 'Os', options: ['O', 'A', 'Os', 'As'] },
      { type: 'fill', sentence: '___ calças são azuis.', answer: 'As', options: ['O', 'A', 'Os', 'As'] },
      { type: 'fill', sentence: 'Quero ___ café.', answer: 'um', options: ['um', 'uma', 'uns', 'umas'] },
      { type: 'fill', sentence: 'Tenho ___ maçã.', answer: 'uma', options: ['um', 'uma', 'uns', 'umas'] },
      { type: 'fill', sentence: 'Vi ___ pássaros.', answer: 'uns', options: ['um', 'uma', 'uns', 'umas'] },
      { type: 'fill', sentence: 'Comprei ___ flores.', answer: 'umas', options: ['um', 'uma', 'uns', 'umas'] },
    ],
  },
  {
    id: 'plurals',
    title: 'Plurais',
    subtitle: 'Making plurals',
    icon: '➕',
    requiredVocab: 40,
    exercises: [
      { type: 'fill', sentence: 'Um gato → Dois ___.', answer: 'gatos', options: ['gatos', 'gates', 'gatões', 'gatas'] },
      { type: 'fill', sentence: 'Uma flor → Duas ___.', answer: 'flores', options: ['flors', 'flores', 'floreses', 'floris'] },
      { type: 'fill', sentence: 'Um cão → Dois ___.', answer: 'cães', options: ['cãos', 'cães', 'cãoes', 'cões'] },
      { type: 'fill', sentence: 'Um animal → Dois ___.', answer: 'animais', options: ['animals', 'animais', 'animales', 'animalos'] },
      { type: 'fill', sentence: 'Um pão → Dois ___.', answer: 'pães', options: ['pãos', 'pães', 'pãoes', 'pões'] },
      { type: 'fill', sentence: 'Uma mão → Duas ___.', answer: 'mãos', options: ['mães', 'mãos', 'mãoes', 'mões'] },
    ],
  },
  {
    id: 'possessives',
    title: 'Possessivos',
    subtitle: 'My, your, his/her...',
    icon: '👤',
    requiredVocab: 50,
    exercises: [
      { type: 'fill', sentence: 'O ___ gato é bonito. (eu)', answer: 'meu', options: ['meu', 'teu', 'seu', 'nosso'] },
      { type: 'fill', sentence: 'A ___ casa é grande. (tu)', answer: 'tua', options: ['minha', 'tua', 'sua', 'nossa'] },
      { type: 'fill', sentence: 'O ___ carro é novo. (ele)', answer: 'seu', options: ['meu', 'teu', 'seu', 'nosso'] },
      { type: 'fill', sentence: 'A ___ escola fica perto. (nós)', answer: 'nossa', options: ['minha', 'tua', 'sua', 'nossa'] },
      { type: 'fill', sentence: 'Os ___ livros são velhos. (eu)', answer: 'meus', options: ['meus', 'teus', 'seus', 'nossos'] },
      { type: 'fill', sentence: 'As ___ filhas estudam. (eles)', answer: 'suas', options: ['minhas', 'tuas', 'suas', 'nossas'] },
    ],
  },
  {
    id: 'negation',
    title: 'Negação',
    subtitle: 'Saying no and nothing',
    icon: '🚫',
    requiredVocab: 30,
    exercises: [
      { type: 'fill', sentence: 'Eu ___ falo inglês.', answer: 'não', options: ['não', 'nem', 'nada', 'nunca'] },
      { type: 'fill', sentence: 'Ela ___ come carne.', answer: 'não', options: ['não', 'nem', 'nada', 'nunca'] },
      { type: 'fill', sentence: 'Não tenho ___.', answer: 'nada', options: ['não', 'nada', 'nunca', 'nenhum'] },
      { type: 'fill', sentence: '___ vou ao cinema.', answer: 'Nunca', options: ['Não', 'Nada', 'Nunca', 'Nenhum'] },
      { type: 'fill', sentence: 'Não tenho ___ livro.', answer: 'nenhum', options: ['não', 'nada', 'nunca', 'nenhum'] },
      { type: 'sentence', words: ['Eu', 'não', 'gosto', 'de', 'café'], answer: 'Eu não gosto de café' },
      { type: 'sentence', words: ['Ela', 'nunca', 'come', 'carne'], answer: 'Ela nunca come carne' },
    ],
  },
  {
    id: 'past_tense',
    title: 'Pretérito Perfeito',
    subtitle: 'Simple past tense',
    icon: '⏪',
    requiredVocab: 60,
    conjugations: {
      falar: {
        eu: 'falei', tu: 'falaste', 'ele/ela': 'falou',
        nós: 'falámos', 'eles/elas': 'falaram'
      },
      comer: {
        eu: 'comi', tu: 'comeste', 'ele/ela': 'comeu',
        nós: 'comemos', 'eles/elas': 'comeram'
      },
    },
    exercises: [
      { type: 'fill', sentence: 'Ontem eu ___ com a Maria.', answer: 'falei', verb: 'falar', options: ['falo', 'falei', 'falaste', 'falou'] },
      { type: 'fill', sentence: 'Tu ___ peixe?', answer: 'comeste', verb: 'comer', options: ['comi', 'comeste', 'comeu', 'comemos'] },
      { type: 'fill', sentence: 'Ela ___ para o Porto.', answer: 'viajou', verb: 'viajar', options: ['viajei', 'viajaste', 'viajou', 'viajaram'] },
      { type: 'fill', sentence: 'Nós ___ um filme.', answer: 'vimos', verb: 'ver', options: ['vi', 'viste', 'viu', 'vimos'] },
      { type: 'conjugate', verb: 'falar', pronoun: 'eu', answer: 'falei', tense: 'past' },
      { type: 'conjugate', verb: 'comer', pronoun: 'tu', answer: 'comeste', tense: 'past' },
      { type: 'conjugate', verb: 'falar', pronoun: 'ele/ela', answer: 'falou', tense: 'past' },
    ],
  },
];

// Helper to check if a grammar unit is unlocked
export function isGrammarUnlocked(unitId, learnedCardCount) {
  const unit = grammarUnits.find(u => u.id === unitId);
  if (!unit) return false;
  return learnedCardCount >= (unit.requiredVocab || 0);
}
