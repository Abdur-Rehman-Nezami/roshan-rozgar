import { z } from "zod";
import type { Display } from "./schemas.ts";

// Text only at F-03. Committed MP3 generation and playback are C-02.
export const PROMPTS = {
  "p.start": {
    ur: "شروع کرنے کے لیے بڑا بٹن دبائیں۔",
    roman: "Shuru karne ke liye bara button dabayein.",
    en: "Press the big button to start.",
  },
  "p.welcome": {
    ur: "روشن روزگار میں خوش آمدید۔ اپنی زبان چنیں۔",
    roman: "Roshan Rozgar mein khush aamdeed. Apni zabaan chunein.",
    en: "Welcome to Roshan Rozgar. Choose your language.",
  },
  "p.role": {
    ur: "کیا آپ کو کام چاہیے، یا آپ کو کاریگر چاہیے؟",
    roman: "Kya aap ko kaam chahiye, ya aap ko kaarigar chahiye?",
    en: "Do you want work, or do you need a worker?",
  },
  "p.mic_check": {
    ur: "مائیک کا بٹن دبا کر رکھیں اور کچھ بولیں۔",
    roman: "Mic ka button daba kar rakhein aur kuch bolein.",
    en: "Press and hold the mic and say something.",
  },
  "p.mic_ok": {
    ur: "آواز آ رہی ہے۔ شاباش!",
    roman: "Awaaz aa rahi hai. Shabash!",
    en: "We can hear you. Well done!",
  },
  "p.mic_fail": {
    ur: "آواز نہیں آئی۔ کوئی بات نہیں، بٹن دبا کر چلائیں۔",
    roman: "Awaaz nahi aayi. Koi baat nahi, button daba kar chalayein.",
    en: "No sound came through. That's fine, use the buttons.",
  },
  "p.phone": {
    ur: "اپنا موبائل نمبر بولیں یا بٹن دبا کر لکھیں۔",
    roman: "Apna mobile number bolein ya button daba kar likhein.",
    en: "Say your mobile number or tap it in.",
  },
  "p.otp_demo": {
    ur: "کوڈ خود بخود آ گیا ہے۔ آگے چلیں۔",
    roman: "Code khud ba khud aa gaya hai. Aage chalein.",
    en: "The code was filled in for you. Continue.",
  },
  "p.trade": {
    ur: "آپ کیا کام کرتے ہیں؟ تصویر دبائیں یا بول کر بتائیں۔",
    roman: "Aap kya kaam karte hain? Tasveer dabayein ya bol kar batayein.",
    en: "What work do you do? Tap a picture or say it.",
  },
  "q.name": {
    ur: "آپ کا نام کیا ہے؟",
    roman: "Aap ka naam kya hai?",
    en: "What is your name?",
  },
  "q.years": {
    ur: "آپ یہ کام کتنے سال سے کر رہے ہیں؟",
    roman: "Aap yeh kaam kitne saal se kar rahe hain?",
    en: "How many years have you done this work?",
  },
  "q.jobs": {
    ur: "آپ کون کون سے کام کرتے ہیں؟ مثلاً گیزر، نل یا پائپ۔",
    roman: "Aap kaun kaun se kaam karte hain? Maslan geyser, nal ya pipe.",
    en: "Which jobs do you do? For example geyser, tap or pipe.",
  },
  "q.areas": {
    ur: "آپ کن علاقوں میں کام کرتے ہیں؟",
    roman: "Aap kin ilaqon mein kaam karte hain?",
    en: "Which areas do you work in?",
  },
  "q.rate": {
    ur: "ایک عام کام کے آپ کتنے پیسے لیتے ہیں؟",
    roman: "Aik aam kaam ke aap kitne paise lete hain?",
    en: "How much do you usually charge for a job?",
  },
  "p.readback": {
    ur: "یہ آپ کی پروفائل ہے۔ ٹھیک ہے تو «ٹھیک ہے» کہیں، ورنہ «دوبارہ» کہیں۔",
    roman: 'Yeh aap ki profile hai. Theek hai to "theek hai" kahein, warna "dobara" kahein.',
    en: 'This is your profile. Say "theek hai" if it\'s right, or "dobara" to change it.',
  },
  "p.silence": {
    ur: "آواز نہیں آئی۔ دوبارہ بولیں، یا نیچے والا بٹن دبائیں۔",
    roman: "Awaaz nahi aayi. Dobara bolein, ya neeche wala button dabayein.",
    en: "We didn't hear you. Speak again, or tap the button below.",
  },
  "p.home_free": {
    ur: "آپ اب حاضر ہیں۔ نیا کام آتے ہی اطلاع ملے گی۔",
    roman: "Aap ab haazir hain. Naya kaam aate hi ittila milegi.",
    en: "You are now available. You'll be told as soon as a job comes.",
  },
  "p.new_job": {
    ur: "نیا کام آیا ہے۔",
    roman: "Naya kaam aaya hai.",
    en: "A new job has come in.",
  },
  "p.confirm_price": {
    ur: "(dynamic) کیا یہ کام {price} روپے میں طے ہے؟",
    roman: "(dynamic) Kya yeh kaam {price} rupay mein tay hai?",
    en: "(dynamic) Is this job agreed at Rs {price}?",
  },
  "p.c_home": {
    ur: "کیا خراب ہے؟ بول کر بتائیں یا تصویر کھینچیں۔",
    roman: "Kya kharab hai? Bol kar batayein ya tasveer khenchein.",
    en: "What's broken? Say it or take a photo.",
  },
  "p.c_review": {
    ur: "کام کیسا رہا؟ بیس سیکنڈ بول کر بتائیں۔",
    roman: "Kaam kaisa raha? Bees second bol kar batayein.",
    en: "How was the work? Tell us in 20 seconds.",
  },
  "p.photos": {
    ur: "اپنے کام کی تصویر لگائیں یا آگے چلیں۔",
    roman: "Apne kaam ki tasveer lagayein ya aage chalein.",
    en: "Add a work photo or continue.",
  },
  "p.chat": {
    ur: "بات کریں اور قیمت طے کریں۔",
    roman: "Baat karein aur qeemat tay karein.",
    en: "Talk and agree on a price.",
  },
  "p.job_steps": {
    ur: "کام کا اگلا مرحلہ چنیں۔",
    roman: "Kaam ka agla marhala chunein.",
    en: "Choose the next job step.",
  },
  "p.done": {
    ur: "آخری رقم کی تصدیق کریں۔",
    roman: "Aakhri raqam ki tasdeeq karein.",
    en: "Confirm the final amount.",
  },
  "p.earnings": {
    ur: "یہ آپ کی کمائی ہے۔",
    roman: "Yeh aap ki kamai hai.",
    en: "Here are your earnings.",
  },
  "p.reputation": {
    ur: "دیکھیں لوگ آپ کے کام کے بارے میں کیا کہتے ہیں۔",
    roman: "Dekhein log aap ke kaam ke baare mein kya kehte hain.",
    en: "See what customers say about your work.",
  },
  "p.settings": {
    ur: "زبان اور آواز کی رفتار چنیں۔",
    roman: "Zabaan aur awaaz ki raftaar chunein.",
    en: "Choose language and voice speed.",
  },
  "p.describe": {
    ur: "مسئلہ بول کر یا لکھ کر بتائیں۔",
    roman: "Masla bol kar ya likh kar batayein.",
    en: "Describe the problem by speaking or typing.",
  },
  "p.workers": {
    ur: "یہ دستیاب کاریگر ہیں۔ بات کرنے کے لیے چنیں۔",
    roman: "Yeh dastiyaab kaarigar hain. Baat karne ke liye chunein.",
    en: "Choose an available worker to talk to.",
  },
  "p.worker_profile": {
    ur: "کاریگر کا تجربہ اور پچھلا کام دیکھیں۔",
    roman: "Kaarigar ka tajurba aur pichla kaam dekhein.",
    en: "See this worker’s experience and past jobs.",
  },
  "p.confirm_booking": {
    ur: "کام کی تفصیل دیکھ کر تصدیق کریں۔",
    roman: "Kaam ki tafseel dekh kar tasdeeq karein.",
    en: "Review the job details and confirm.",
  },
  "p.track": {
    ur: "کام کی موجودہ حالت دیکھیں۔",
    roman: "Kaam ki mojooda haalat dekhein.",
    en: "See the current job status.",
  },
  "p.pay_demo": {
    ur: "یہ نمونہ ہے۔ کوئی اصل ادائیگی نہیں ہوگی۔",
    roman: "Yeh namoona hai. Koi asal adaigi nahi hogi.",
    en: "This is a demo. No real payment will occur.",
  },
  "p.bookings": {
    ur: "اپنے آنے والے اور پچھلے کام دیکھیں۔",
    roman: "Apne aanay walay aur pichlay kaam dekhein.",
    en: "See your upcoming and past jobs.",
  },
  "p.demo": {
    ur: "یہ نمونہ دکھانے کا کنٹرول پینل ہے۔",
    roman: "Yeh namoona dikhanay ka control panel hai.",
    en: "This is the demonstration control panel.",
  },
} as const satisfies Record<string, Display>;
export type PromptId = keyof typeof PROMPTS;
export const PROMPT_IDS = Object.keys(PROMPTS) as PromptId[];
export const PromptIdSchema = z.enum(PROMPT_IDS as [PromptId, ...PromptId[]]);

export const SCREEN_PROMPTS = {
  W0: "p.start",
  W1: "p.mic_check",
  W2: "p.phone",
  W3: "p.trade",
  W4: "q.name",
  W5: "p.readback",
  W6: "p.photos",
  W7: "p.home_free",
  W8: "p.new_job",
  W9: "p.chat",
  W10: "p.job_steps",
  W11: "p.done",
  W12: "p.earnings",
  W13: "p.reputation",
  W14: "p.settings",
  C1: "p.phone",
  C2: "p.c_home",
  C3: "p.describe",
  C4: "p.workers",
  C5: "p.worker_profile",
  C6: "p.chat",
  C7: "p.confirm_booking",
  C8: "p.track",
  C9: "p.pay_demo",
  C10: "p.c_review",
  C11: "p.bookings",
  C12: "p.settings",
  D1: "p.demo",
} as const satisfies Record<string, PromptId>;
