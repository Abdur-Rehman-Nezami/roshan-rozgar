// C-03 supplies the normalizer/parser; this is the shared vocabulary contract.
export const LEXICON = {
  confirm: {
    ur: ["ٹھیک ہے", "جی ہاں", "ہاں", "جی", "بالکل"],
    roman: ["theek hai", "thik hai", "haan", "han", "ji", "jee", "bilkul"],
    en: ["ok", "okay", "yes"],
  },
  deny: { ur: ["نہیں", "نہیں جی"], roman: ["nahi", "nahin", "na"], en: ["no"] },
  retry_answer: { ur: ["دوبارہ"], roman: ["dobara", "phir se"], en: ["again"] },
  repeat_prompt: {
    ur: ["دوبارہ بولو", "پھر سے بولو"],
    roman: ["dobara bolo", "phir bolo"],
    en: ["repeat"],
  },
  back: { ur: ["واپس", "پیچھے"], roman: ["wapas", "peeche"], en: ["back"] },
  help: { ur: ["مدد"], roman: ["madad"], en: ["help"] },
  next: { ur: ["آگے", "اگلا"], roman: ["aage", "agla"], en: ["next"] },
} as const;
export type CommandIntent = keyof typeof LEXICON;
