// PT-PT Phoneme data for pronunciation training

export const pronunciationLessons = [
  {
    id: 1,
    title: 'Vogais Orais',
    subtitle: 'Oral vowels',
    phonemes: [
      { ipa: '/a/', description: 'Open a, like "father"', examples: ['casa', 'água', 'falar'] },
      { ipa: '/ɐ/', description: 'Reduced a, like "about"', examples: ['cama', 'fala', 'porta'] },
      { ipa: '/ɛ/', description: 'Open e, like "bed"', examples: ['café', 'pé', 'festa'] },
      { ipa: '/e/', description: 'Closed e, like "say"', examples: ['mesa', 'verde', 'ler'] },
      { ipa: '/ə/', description: 'Schwa, very reduced', examples: ['de', 'que', 'se'] },
      { ipa: '/i/', description: 'Like "see"', examples: ['dia', 'vida', 'aqui'] },
      { ipa: '/ɔ/', description: 'Open o, like "dog"', examples: ['pó', 'avó', 'cola'] },
      { ipa: '/o/', description: 'Closed o, like "go"', examples: ['avô', 'lobo', 'todo'] },
      { ipa: '/u/', description: 'Like "moon"', examples: ['lua', 'rua', 'tu'] },
    ],
    minimalPairs: [
      { word1: 'avó', word2: 'avô', distinction: '/ɔ/ vs /o/', audio1: 'avó', audio2: 'avô' },
      { word1: 'pé', word2: 'pê', distinction: '/ɛ/ vs /e/', audio1: 'pé', audio2: 'pê' },
      { word1: 'sé', word2: 'se', distinction: '/ɛ/ vs /ə/', audio1: 'sé', audio2: 'se' },
      { word1: 'todo', word2: 'tudo', distinction: '/o/ vs /u/', audio1: 'todo', audio2: 'tudo' },
      { word1: 'para', word2: 'pára', distinction: '/ɐ/ vs /a/', audio1: 'para', audio2: 'pára' },
    ],
  },
  {
    id: 2,
    title: 'Vogais Nasais',
    subtitle: 'Nasal vowels',
    phonemes: [
      { ipa: '/ɐ̃/', description: 'Nasal a', examples: ['manhã', 'campo', 'antes'] },
      { ipa: '/ẽ/', description: 'Nasal e', examples: ['bem', 'tempo', 'cem'] },
      { ipa: '/ĩ/', description: 'Nasal i', examples: ['fim', 'sim', 'vinho'] },
      { ipa: '/õ/', description: 'Nasal o', examples: ['bom', 'som', 'onde'] },
      { ipa: '/ũ/', description: 'Nasal u', examples: ['um', 'algum', 'mundo'] },
    ],
    minimalPairs: [
      { word1: 'lã', word2: 'lá', distinction: 'nasal vs oral /a/', audio1: 'lã', audio2: 'lá' },
      { word1: 'bem', word2: 'bê', distinction: 'nasal vs oral /e/', audio1: 'bem', audio2: 'bê' },
      { word1: 'som', word2: 'só', distinction: 'nasal vs oral /o/', audio1: 'som', audio2: 'só' },
      { word1: 'vim', word2: 'vi', distinction: 'nasal vs oral /i/', audio1: 'vim', audio2: 'vi' },
      { word1: 'um', word2: 'u', distinction: 'nasal vs oral /u/', audio1: 'um', audio2: 'u' },
    ],
  },
  {
    id: 3,
    title: 'Consoantes I',
    subtitle: 'Consonants: stops & fricatives',
    phonemes: [
      { ipa: '/ʃ/', description: 'Like "sh" — s before consonant or word-final', examples: ['estar', 'três', 'pois'] },
      { ipa: '/ʒ/', description: 'Like "measure" — j, g before e/i', examples: ['gente', 'janela', 'viagem'] },
      { ipa: '/v/', description: 'Like "very" — distinct from b in PT-PT', examples: ['ver', 'viver', 'nove'] },
      { ipa: '/b/', description: 'Like "boy"', examples: ['bom', 'beber', 'bola'] },
      { ipa: '/s/', description: 'Voiceless s', examples: ['saber', 'ação', 'céu'] },
      { ipa: '/z/', description: 'Voiced z — s between vowels', examples: ['casa', 'zero', 'rosa'] },
    ],
    minimalPairs: [
      { word1: 'caça', word2: 'casa', distinction: '/s/ vs /z/', audio1: 'caça', audio2: 'casa' },
      { word1: 'chá', word2: 'já', distinction: '/ʃ/ vs /ʒ/', audio1: 'chá', audio2: 'já' },
      { word1: 'vir', word2: 'bir', distinction: '/v/ vs /b/', audio1: 'vir', audio2: 'bir' },
      { word1: 'passo', word2: 'paço', distinction: '/s/ vs /s/ (spelling)', audio1: 'passo', audio2: 'paço' },
    ],
  },
  {
    id: 4,
    title: 'Consoantes II',
    subtitle: 'Consonants: liquids & special',
    phonemes: [
      { ipa: '/ʀ/', description: 'Uvular r — word-initial, rr', examples: ['rato', 'carro', 'rio'] },
      { ipa: '/ɾ/', description: 'Tap r — between vowels, clusters', examples: ['para', 'praia', 'verde'] },
      { ipa: '/ɲ/', description: 'Like "canyon" — nh', examples: ['vinho', 'anha', 'sonho'] },
      { ipa: '/ʎ/', description: 'Like "million" — lh', examples: ['filho', 'olho', 'trabalho'] },
      { ipa: '/l/', description: 'Clear l — not dark as in English', examples: ['lua', 'falar', 'alto'] },
    ],
    minimalPairs: [
      { word1: 'caro', word2: 'carro', distinction: '/ɾ/ vs /ʀ/', audio1: 'caro', audio2: 'carro' },
      { word1: 'ano', word2: 'anho', distinction: '/n/ vs /ɲ/', audio1: 'ano', audio2: 'anho' },
      { word1: 'fila', word2: 'filha', distinction: '/l/ vs /ʎ/', audio1: 'fila', audio2: 'filha' },
      { word1: 'mala', word2: 'malha', distinction: '/l/ vs /ʎ/', audio1: 'mala', audio2: 'malha' },
    ],
  },
  {
    id: 5,
    title: 'Acentuação e Ritmo',
    subtitle: 'Stress & rhythm',
    phonemes: [
      { ipa: 'Stress rules', description: 'Most words stress the penultimate syllable', examples: ['caSA', 'comiDA', 'bonITO'] },
      { ipa: 'Accented', description: 'Accent marks show irregular stress', examples: ['caFÉ', 'aVÓ', 'úTIL'] },
      { ipa: 'Vowel reduction', description: 'Unstressed vowels become very short/reduced', examples: ['portugal → purtugal', 'telefone → tlefone'] },
    ],
    minimalPairs: [
      { word1: 'sábia', word2: 'sabia', distinction: 'stress on 1st vs 2nd syllable', audio1: 'sábia', audio2: 'sabia' },
      { word1: 'número', word2: 'numero', distinction: 'proparoxytone vs paroxytone', audio1: 'número', audio2: 'numero' },
      { word1: 'prático', word2: 'pratico', distinction: 'adjective vs verb', audio1: 'prático', audio2: 'pratico' },
    ],
  },
];
