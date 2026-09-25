// Shape of the owner's first adaptive quiz ("Irregular Verbs: Base, Past,
// Participle & Catalan ADAPTIVE", 100 questions): id, type and CEFR level only,
// which is all the adaptive engine reads. Content is omitted.
const SPEC = `
1 A1 mcq|2 A1 match|3 A1 tf|4 A1 puzzle|5 A2 multi|6 A2 match|7 A2 tf|8 A2 puzzle|9 B1 error|10 B1 text
11 B1 multi|12 B1 mcq|13 B2 spellingbee|14 B2 wordle|15 B2 puzzle|16 B2 text|17 C1 text|18 C1 match|19 C1 wordle|20 C1 error
21 C2 spellingbee|22 C2 wordle|23 C2 tf|24 C2 error|25 C2 text|26 A1 mcq|27 A1 tf|28 A1 match|29 A1 puzzle|30 A2 tf
31 A2 mcq|32 A2 match|33 A2 multi|34 A2 puzzle|35 B1 text|36 B1 error|37 B1 mcq|38 B1 spellingbee|39 B1 wordle|40 B2 text
41 B2 error|42 B2 puzzle|43 B2 spellingbee|44 B2 wordle|45 C1 text|46 C1 error|47 C1 match|48 C2 wordle|49 C2 text|50 C2 error
51 A1 tf|52 A1 mcq|53 A1 match|54 A1 puzzle|55 A2 multi|56 A2 mcq|57 A2 match|58 A2 puzzle|59 B1 text|60 B1 error
61 B1 mcq|62 B1 spellingbee|63 B1 wordle|64 B2 text|65 B2 error|66 B2 match|67 B2 spellingbee|68 B2 wordle|69 C1 text|70 C1 error
71 C1 puzzle|72 C1 wordle|73 C2 text|74 C2 error|75 C2 spellingbee|76 A1 text|77 A1 tf|78 A1 puzzle|79 A1 mcq|80 A2 match
81 A2 tf|82 A2 text|83 A2 multi|84 B1 error|85 B1 spellingbee|86 B1 puzzle|87 B1 wordle|88 B2 match|89 B2 error|90 B2 wordle
91 B2 text|92 C1 error|93 C1 wordle|94 C1 text|95 C1 spellingbee|96 C2 error|97 C2 wordle|98 C2 text|99 C2 puzzle|100 C2 match`;

const TYPE = { match: 'match_pairs', error: 'error_hunt' };

const questions = SPEC.trim().split(/[|\n]/).map((entry) => {
  const [n, cefr, t] = entry.trim().split(' ');
  const type = TYPE[t] || t;
  const q = { id: `q${n}`, type, cefr };
  if (type === 'text') q.accepted = ['x'];
  return q;
});

module.exports = { questions };
