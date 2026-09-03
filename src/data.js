export const fallbackTopics = [
  { name: 'Greetings', slug: 'greetings', subtitle: 'Aisatsu', icon: '🌸', sort_order: 1 },
  { name: 'Self Introduction', slug: 'self-introduction', subtitle: 'Jikoshoukai', icon: '🎌', sort_order: 2 },
  ...Array.from({ length: 38 }, (_, i) => {
    const n = i + 3;
    return { name: `Topic ${String(n).padStart(2, '0')}`, slug: `topic-${n}`, subtitle: 'Coming soon', icon: '🌸', sort_order: n };
  })
];

export const greetingsQuestions = [
  { question_text: 'Which romaji greeting is commonly used in the morning?', options: ['Ohayou gozaimasu','Konnichiwa','Konbanwa','Oyasumi nasai'], correct_index: 0, sort_order: 1 },
  { question_text: 'Which greeting is commonly used during the daytime?', options: ['Ittekimasu','Konnichiwa','Tadaima','Oyasumi nasai'], correct_index: 1, sort_order: 2 },
  { question_text: 'Which greeting is commonly used in the evening?', options: ['Ohayou','Konbanwa','Mata ne','Hajimemashite'], correct_index: 1, sort_order: 3 },
  { question_text: "Which phrase means 'Good night'?", options: ['Konbanwa','Ogenki desu ka','Oyasumi nasai','Arigatou'], correct_index: 2, sort_order: 4 },
  { question_text: 'Which phrase is appropriate when meeting someone for the first time?', options: ['Hajimemashite','Tadaima','Ittekimasu','Mata ashita'], correct_index: 0, sort_order: 5 },
  { question_text: "Which phrase can be used to say 'See you' casually?", options: ['Mata ne','Sumimasen','Douzo','Daijoubu'], correct_index: 0, sort_order: 6 },
  { question_text: "Which phrase means 'Thank you very much'?", options: ['Arigatou gozaimasu','Konnichiwa','Sayonara','Okaerinasai'], correct_index: 0, sort_order: 7 },
  { question_text: "Which phrase means 'How are you?'", options: ['Ogenki desu ka','Doushite desu ka','Nani desu ka','Daijoubu deshita'], correct_index: 0, sort_order: 8 },
  { question_text: 'Which greeting is polite and commonly used when starting the day?', options: ['Ohayou gozaimasu','Mata ne','Konbanwa','Oyasumi'], correct_index: 0, sort_order: 9 },
  { question_text: 'Which phrase is commonly used when saying goodbye in a more formal situation?', options: ['Sayonara','Ohayou','Douzo','Itadakimasu'], correct_index: 0, sort_order: 10 }
];
