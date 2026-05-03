import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────────

type Risk = "safe" | "risky" | "danger";

interface Choice {
  text: string;
  risk: Risk;
  feedback: { title: string; body: string; advice: string };
  next: string;
}

interface ChatMessage {
  side: "incoming" | "outgoing" | "system";
  avatar: string;
  name: string;
  text: string;
}

interface Scene {
  id: string;
  type: "chat" | "end";
  messages?: ChatMessage[];
  narrator?: string;
  choices?: Choice[];
  outcome?: "good" | "bad";
}

interface Scenario {
  id: string;
  title: string;
  desc: string;
  emoji: string;
  tag: string;
  accentFrom: string;
  accentTo: string;
  glowColor: string;
  scenes: Scene[];
  recommendations?: string[];
}

// ── Story data ─────────────────────────────────────────────────────────────

const SCENARIOS_EN: Scenario[] = [
  {
    id: "cyberbullying",
    title: "The Group Chat",
    desc: "Rumors about you are spreading in a class group chat. How you respond changes everything.",
    emoji: "💬",
    tag: "Cyberbullying",
    accentFrom: "#f59e0b",
    accentTo: "#d97706",
    glowColor: "rgba(245,158,11,0.25)",
    scenes: [
      {
        id: "s1",
        type: "chat",
        messages: [
          { side: "incoming", avatar: "S", name: "Sara", text: "did u guys see what Maya posted 💀 spreading everyone's secrets" },
          { side: "incoming", avatar: "T", name: "Tarek", text: "fr i can't believe her. everyone hates her now" },
          { side: "incoming", avatar: "S", name: "Sara", text: "she's such a liar honestly 🙄" },
        ],
        narrator:
          "You open your phone to 47 new messages in the class group chat. Your name is everywhere. Sara is spreading false information about you — and people are piling on.",
        choices: [
          {
            text: "Fire back publicly — defend yourself right now",
            risk: "danger",
            feedback: {
              title: "Dangerous choice",
              body: "Responding in anger online gives the bully exactly what they want: more drama and attention. Public arguments rarely end well and almost always escalate.",
              advice: "Take a breath. Reacting in the heat of the moment fuels conflict. Screenshot first, respond never.",
            },
            next: "s2b",
          },
          {
            text: "Screenshot everything and show a trusted adult",
            risk: "safe",
            feedback: {
              title: "Good instinct",
              body: "Documenting evidence before anything is deleted is the most important first step. A trusted adult — teacher, parent, or counselor — can take action you can't do alone.",
              advice: "Schools and platforms both act on documented evidence. Save everything before reporting.",
            },
            next: "s2a",
          },
          {
            text: "Leave the group chat silently",
            risk: "risky",
            feedback: {
              title: "Understandable, but incomplete",
              body: "Leaving protects your mental health in the moment, but the bullying continues without you. You've removed yourself without stopping the harm.",
              advice: "Leaving is okay — but combine it with reporting to someone who can actually intervene.",
            },
            next: "s2b",
          },
        ],
      },
      {
        id: "s2a",
        type: "chat",
        messages: [
          { side: "outgoing", avatar: "Y", name: "You", text: "I have all the screenshots. Talking to Ms. Rania tomorrow morning." },
          { side: "incoming", avatar: "F", name: "Friend", text: "Good. I'll back you up. This isn't okay at all." },
        ],
        narrator:
          "You meet with your school counselor. She takes it seriously — contacts Sara's parents and addresses the behavior with the class directly. The messages stop.",
        choices: [
          {
            text: "Block Sara and protect your peace",
            risk: "safe",
            feedback: {
              title: "Smart follow-through",
              body: "Blocking after reporting lets the adults handle the situation while you protect your mental health. You're not running — you're being strategic.",
              advice: "Protecting your peace is strength. Use every tool available to you.",
            },
            next: "end_good",
          },
          {
            text: "Post a public forgiveness message for everyone to see",
            risk: "risky",
            feedback: {
              title: "Compassionate, but be careful",
              body: "Public forgiveness can sometimes signal to others that the behavior was acceptable, or invite future testing of your boundaries.",
              advice: "Forgive privately on your own timeline. You don't owe anyone a performance.",
            },
            next: "end_good",
          },
        ],
      },
      {
        id: "s2b",
        type: "chat",
        messages: [
          { side: "incoming", avatar: "S", name: "Sara", text: "omg she left 😂 so guilty lmao" },
          { side: "incoming", avatar: "T", name: "Tarek", text: "she saw everything and ran 💀" },
          { side: "incoming", avatar: "S", name: "Sara", text: "someone tag her other account" },
        ],
        narrator:
          "A week passes. The bullying spreads to other platforms. More people join in. You feel increasingly isolated and don't know where to turn.",
        choices: [
          {
            text: "Report everything to your school counselor — it's not too late",
            risk: "safe",
            feedback: {
              title: "It's never too late",
              body: "Reporting even weeks later is completely valid. The more documented evidence you have, the stronger the case. Schools and authorities take sustained campaigns seriously.",
              advice: "Cyberbullying is a reportable offense. Evidence from multiple weeks is actually stronger than a single incident.",
            },
            next: "end_good",
          },
          {
            text: "Create an anonymous account to expose Sara publicly",
            risk: "danger",
            feedback: {
              title: "This will backfire",
              body: "Anonymous retaliation escalates the conflict and can get you in serious trouble. It also gives Sara legitimate grounds to claim she's being targeted.",
              advice: "Fighting fire with fire online only burns you too. Official channels protect you — retaliation doesn't.",
            },
            next: "end_bad",
          },
        ],
      },
      { id: "end_good", type: "end", outcome: "good" },
      { id: "end_bad", type: "end", outcome: "bad" },
    ],
    recommendations: [
      "Screenshot evidence before blocking or leaving",
      "Tell a trusted adult — parent, teacher, or counselor",
      "Don't respond in the heat of the moment",
      "Block and report on the platform",
      "Follow up with school or authorities"
    ],
  },
  {
    id: "grooming",
    title: "The New Friend",
    desc: "A stranger online is being unusually friendly — compliments, personal questions, and pressure to meet. Something feels wrong.",
    emoji: "🔒",
    tag: "Online Safety",
    accentFrom: "#ef4444",
    accentTo: "#dc2626",
    glowColor: "rgba(239,68,68,0.22)",
    scenes: [
      {
        id: "s1",
        type: "chat",
        messages: [
          { side: "incoming", avatar: "?", name: "Unknown", text: "hey! we have so many mutual friends. you seem really cool 😊" },
          { side: "outgoing", avatar: "Y", name: "You", text: "oh hi — who are you exactly?" },
          { side: "incoming", avatar: "?", name: "Unknown", text: "I'm Alex! from uni nearby. you're really pretty btw. how old are you?" },
        ],
        narrator:
          "A stranger follows you on Instagram. They're immediately complimentary and ask for your age within the first few messages. Something feels a little off — but they seem friendly.",
        choices: [
          {
            text: "Share your age and which school you go to — they seem genuine",
            risk: "danger",
            feedback: {
              title: "Danger: too much, too fast",
              body: "Predators commonly use fast compliments and false warmth to build artificial trust before collecting personal information. Age, school, and daily routine are exactly what they're looking for.",
              advice: "Never share your age, school, or location with a stranger online — no matter how friendly they seem.",
            },
            next: "s2b",
          },
          {
            text: "Be vague — don't share anything personal",
            risk: "safe",
            feedback: {
              title: "Good instinct",
              body: "Staying vague with new online contacts is always the right move. You don't owe anyone your personal information as proof of friendliness.",
              advice: "Genuine friends don't pressure you for personal details in the first conversation. Watch for that pattern.",
            },
            next: "s2a",
          },
          {
            text: "Ask how they found your profile",
            risk: "risky",
            feedback: {
              title: "Curious, but be careful",
              body: "Asking is reasonable, but they can easily lie. What matters more is their behavior pattern — fast compliments, personal questions, and pressure are warning signs regardless of their answer.",
              advice: "Trust behavior, not explanations. Look for patterns of pressure and urgency.",
            },
            next: "s2a",
          },
        ],
      },
      {
        id: "s2a",
        type: "chat",
        messages: [
          { side: "incoming", avatar: "?", name: "Alex", text: "come on, I just want to get to know you. why are you being so secretive?" },
          { side: "incoming", avatar: "?", name: "Alex", text: "can you send a selfie? just so I know you're real 🙂" },
        ],
        narrator:
          '"Alex" is now pushing harder. The friendly tone has shifted into pressure. You\'re being made to feel guilty for having boundaries — a classic manipulation tactic.',
        choices: [
          {
            text: "Block and report the account right now",
            risk: "safe",
            feedback: {
              title: "The right call",
              body: "Asking for photos from someone you just met online — especially after making you feel guilty for having boundaries — is a major warning sign. Blocking protects you. Reporting may protect others.",
              advice: "Report to the platform AND to Egypt's National Council for Childhood and Motherhood: Hotline 16000.",
            },
            next: "end_good",
          },
          {
            text: "Send an innocent photo — just to stop the pressure",
            risk: "danger",
            feedback: {
              title: "This is how it escalates",
              body: "Photos shared with strangers can be used for blackmail, shared without consent, or used to further manipulate you. The pressure you feel is intentional — it's designed to make you comply.",
              advice: "Pressure equals red flag. No genuine friend pressures you for photos. Block immediately and tell a trusted adult.",
            },
            next: "end_bad",
          },
        ],
      },
      {
        id: "s2b",
        type: "chat",
        messages: [
          { side: "incoming", avatar: "?", name: "Alex", text: "oh nice so you go to that school! you're home alone after 3pm usually? I could pick you up sometime 🙂" },
        ],
        narrator:
          "They now know your age, school, and daily schedule. The conversation has shifted toward meeting in person. This has moved from uncomfortable to genuinely dangerous.",
        choices: [
          {
            text: "Agree to meet in a public place — that should be safe",
            risk: "danger",
            feedback: {
              title: "Extremely dangerous",
              body: "Meeting someone who extracted your personal information through pressure is never safe — regardless of the location. 'Public place' is a false sense of security used to get you to agree.",
              advice: "Never meet an online stranger alone. If you feel unsafe, tell a trusted adult immediately and show them the full conversation.",
            },
            next: "end_bad",
          },
          {
            text: "Stop responding and show the conversation to a trusted adult",
            risk: "safe",
            feedback: {
              title: "Exactly right",
              body: "This conversation has all the hallmarks of grooming: fast friendship, compliments, personal information collection, and now a push to meet. An adult needs to see this.",
              advice: "You can also call 16000 (Egypt's child protection hotline). You are not overreacting — this is serious.",
            },
            next: "end_good",
          },
        ],
      },
      { id: "end_good", type: "end", outcome: "good" },
      { id: "end_bad", type: "end", outcome: "bad" },
    ],
    recommendations: [
      "Never share personal info (age, school, location)",
      "Pressure and requests for photos are red flags",
      "Never meet an online stranger alone",
      "If you feel uncomfortable, block immediately",
      "Tell a trusted adult if someone pressures you"
    ],
  },
  {
    id: "blackmail",
    title: "The Screenshot Threat",
    desc: "Someone is threatening to share something embarrassing about you unless you do what they say.",
    emoji: "⚠️",
    tag: "Blackmail",
    accentFrom: "#8b5cf6",
    accentTo: "#6d28d9",
    glowColor: "rgba(139,92,246,0.22)",
    scenes: [
      {
        id: "s1",
        type: "chat",
        messages: [
          { side: "incoming", avatar: "X", name: "Unknown", text: "hey. I have screenshots of what you sent last month." },
          { side: "incoming", avatar: "X", name: "Unknown", text: "send me 500 EGP or I'm sharing them with everyone at your uni." },
          { side: "system", avatar: "", name: "", text: "— Your stomach drops. You know exactly what they mean. —" },
        ],
        narrator:
          "You receive a threatening message from an account you don't recognize. They claim to have compromising content and are demanding money. Your hands are shaking.",
        choices: [
          {
            text: "Pay them to make it stop",
            risk: "danger",
            feedback: {
              title: "This will not stop",
              body: "Paying proves to the blackmailer that you'll comply under pressure. In almost every case, they come back and demand more. Payment funds the next demand.",
              advice: "Paying is the one action guaranteed to make things worse. Never pay — report instead.",
            },
            next: "s2b",
          },
          {
            text: "Block immediately and tell a trusted person",
            risk: "safe",
            feedback: {
              title: "Exactly right",
              body: "Blocking stops direct contact. Telling someone trusted — a parent, counselor, or authority — means you're not facing this alone. This is blackmail, which is a crime.",
              advice: "Screenshot the threat before blocking. This is evidence. You have not done anything wrong by being targeted.",
            },
            next: "s2a",
          },
          {
            text: "Try to find out who it is before doing anything",
            risk: "risky",
            feedback: {
              title: "Understandable, but risky",
              body: "Engaging further to investigate gives the blackmailer more leverage and more time. Even if you identify them, you need official help — not a confrontation.",
              advice: "Report to authorities who have tools to trace the account. Don't engage alone.",
            },
            next: "s2a",
          },
        ],
      },
      {
        id: "s2a",
        type: "chat",
        messages: [
          { side: "outgoing", avatar: "Y", name: "You", text: "I've reported this account and saved all the messages." },
          { side: "incoming", avatar: "F", name: "Friend", text: "I'm proud of you for telling someone. Let's go to the college office together." },
        ],
        narrator:
          "You report the account to the platform and to your university's student support office. A counselor helps you file a formal report. The investigation begins.",
        choices: [
          {
            text: "Contact Egypt's cybercrime hotline for further support",
            risk: "safe",
            feedback: {
              title: "Full follow-through",
              body: "Cybercrime units can trace accounts and issue legal warnings. Formal reports create a paper trail that protects you if the person tries anything further.",
              advice: "Egypt cybercrime hotline: 108. This is exactly what it exists for.",
            },
            next: "end_good",
          },
          {
            text: "Share the threat publicly to warn others",
            risk: "risky",
            feedback: {
              title: "Well-intentioned, but careful",
              body: "Posting the threat publicly can sometimes backfire — it may spread the content further or give the blackmailer more attention.",
              advice: "Let authorities handle it. Your safety comes first before warning others.",
            },
            next: "end_good",
          },
        ],
      },
      {
        id: "s2b",
        type: "chat",
        messages: [
          { side: "incoming", avatar: "X", name: "Unknown", text: "thanks. now I need 1,000 EGP by Friday or the deal's off." },
          { side: "system", avatar: "", name: "", text: "— The demands have doubled. —" },
        ],
        narrator: "As predicted, paying only confirmed you'd comply. The demands doubled within 24 hours. You feel trapped and don't know where to turn.",
        choices: [
          {
            text: "Stop paying and report everything now",
            risk: "safe",
            feedback: {
              title: "The right move — finally",
              body: "It's never too late to stop and report. Even if you've paid once, reporting now stops the cycle and gives you legal protection.",
              advice: "Bring all evidence — payment records, messages, screenshots. Contact Egypt's cybercrime unit: 108.",
            },
            next: "end_good",
          },
          {
            text: "Pay again and hope they stop",
            risk: "danger",
            feedback: {
              title: "The cycle will continue",
              body: "Each payment confirms that threats work on you. The amounts will keep rising. There is no endpoint where a blackmailer says 'enough' and stops.",
              advice: "Stop the cycle now. Report immediately. You are the victim — not the one who should be afraid.",
            },
            next: "end_bad",
          },
        ],
      },
      { id: "end_good", type: "end", outcome: "good" },
      { id: "end_bad", type: "end", outcome: "bad" },
    ],
    recommendations: [
      "Never pay or comply with a blackmailer's demands",
      "Screenshot all threats as evidence immediately",
      "Block the account after saving evidence",
      "Tell a parent or authority—blackmail is a crime",
      "Contact the Cybercrime Unit (108) for official help"
    ],
  },
];

const SCENARIOS_AR: Scenario[] = [
  {
    id: "cyberbullying_ar",
    title: "جروب الدفعة",
    desc: "إشاعات بتنتشر عنك في جروب الدفعة. رد فعلك هيغير كل حاجة.",
    emoji: "💬",
    tag: "التنمر الإلكتروني",
    accentFrom: "#f59e0b",
    accentTo: "#d97706",
    glowColor: "rgba(245,158,11,0.25)",
    recommendations: [
      "خد سكرين شوت لكل المحادثات كدليل",
      "متتردش في إنك تبلغ شخص بالغ بتثق فيه",
      "تجنب الرد في نفس اللحظة أو وقت الغضب",
      "اعمل بلوك وريبورت للمتنمرين",
      "متسيبش حقك، التبليغ هو الحل"
    ],
    scenes: [
      {
        id: "s1",
        type: "chat",
        messages: [
          { side: "incoming", avatar: "س", name: "سارة", text: "شفتوا اللي ندى نزلته 💀 بتفضح كل أسرار الناس" },
          { side: "incoming", avatar: "ط", name: "طارق", text: "بجد مش مصدقها. الكل بيكرهها دلوقتي" },
          { side: "incoming", avatar: "س", name: "سارة", text: "هي كدابة أصلاً 🙄" },
        ],
        narrator:
          "بتفتح موبايلك تلاقي 47 رسالة في جروب الدفعة. اسمك مكتوب في كل حتة، وسارة بتنشر إشاعات عنك والناس بتصدقها.",
        choices: [
          {
            text: "ترد قدام الكل وتدافع عن نفسك دلوقتي",
            risk: "danger",
            feedback: {
              title: "اختيار خطر",
              body: "الرد وقت الغضب بيدي المتنمر اللي هو عاوزه بالظبط: دراما وانتباه. النقاشات العلنية نادراً ما بتتحل وغالباً بتكبر.",
              advice: "خد نفس عميق. الرد في لحظة الغضب بيزود المشكلة. خد سكرين شوت الأول، ومتتسرعش في الرد.",
            },
            next: "s2b",
          },
          {
            text: "تاخد سكرين شوت وتكلم حد كبير تثق فيه",
            risk: "safe",
            feedback: {
              title: "تصرف سليم",
              body: "توثيق الدليل قبل ما أي حاجة تتمسح هو أهم خطوة. شخص بالغ — مدرس، أو حد من أهلك — يقدر ياخد إجراءات إنت متقدرش تاخدها لوحدك.",
              advice: "المدرسة والمنصات بياخدوا إجراءات بناءً على الأدلة. احفظ كل حاجة قبل ما تبلغ.",
            },
            next: "s2a",
          },
          {
            text: "تخرج من الجروب في صمت",
            risk: "risky",
            feedback: {
              title: "مفهوم، لكن مش كفاية",
              body: "الخروج بيحمي سلامك النفسي في اللحظة دي، بس التنمر هيستمر من غيرك. إنت بعدت بس المشكلة لسه موجودة.",
              advice: "الخروج مفيش مشكلة فيه — بس لازم تبلغ حد يقدر يوقف اللي بيحصل.",
            },
            next: "s2b",
          },
        ],
      },
      {
        id: "s2a",
        type: "chat",
        messages: [
          { side: "outgoing", avatar: "أ", name: "أنت", text: "أنا معايا كل السكرين شوتس. هكلم الأخصائية الاجتماعية بكره الصبح." },
          { side: "incoming", avatar: "ص", name: "صديق", text: "كويس جداً. أنا هقف معاك. اللي بيحصل ده مش مقبول أبداً." },
        ],
        narrator:
          "قابلت الأخصائية في المدرسة وأخدت الموضوع بجدية. تواصلت مع أهل سارة واتكلمت مع الفصل بشكل مباشر. الرسايل وقفت.",
        choices: [
          {
            text: "تعمل بلوك لسارة وتحمي سلامك النفسي",
            risk: "safe",
            feedback: {
              title: "متابعة ذكية",
              body: "البلوك بعد التبليغ بيخلي الكبار يتصرفوا وإنت بتحمي نفسك. إنت مش بتهرب — إنت بتتصرف بذكاء.",
              advice: "حماية سلامك النفسي دي قوة. استخدم كل أداة متاحة ليك.",
            },
            next: "end_good",
          },
          {
            text: "تكتب رسالة تسامح قدام الكل عشان تبان أحسن",
            risk: "risky",
            feedback: {
              title: "تصرف طيب، بس خلي بالك",
              body: "التسامح العلني ممكن يدي انطباع للناس إن التصرف كان مقبول، أو يشجعهم يختبروا حدودك تاني في المستقبل.",
              advice: "سامح بينك وبين نفسك في الوقت اللي يريحك. إنت مش مضطر تمثل قدام حد.",
            },
            next: "end_good",
          },
        ],
      },
      {
        id: "s2b",
        type: "chat",
        messages: [
          { side: "incoming", avatar: "س", name: "سارة", text: "هههه خرجت 😂 أكيد عشان مكسوفة من نفسها" },
          { side: "incoming", avatar: "ط", name: "طارق", text: "شافت الكلام وهربت 💀" },
          { side: "incoming", avatar: "س", name: "سارة", text: "حد يعملها منشن من الأكونت التاني" },
        ],
        narrator:
          "عدى أسبوع، التنمر زاد في منصات تانية والناس بدأت تشارك أكتر. حسيت بالعزلة ومش عارف تعمل إيه.",
        choices: [
          {
            text: "تبلغ الأخصائية بكل حاجة — لسه الوقت متأخرش",
            risk: "safe",
            feedback: {
              title: "عمر الوقت ما بيتأخر",
              body: "التبليغ حتى لو بعد أسابيع دايماً تصرف صح. كل ما الأدلة تزيد، موقفك بيكون أقوى. المدارس والجهات الرسمية بياخدوا حملات التنمر المستمرة بجدية.",
              advice: "التنمر الإلكتروني جريمة. الأدلة اللي متجمعة على مدار أسابيع بتكون أقوى من موقف واحد.",
            },
            next: "end_good",
          },
          {
            text: "تعمل أكونت فيك وتفضح سارة زي ما عملت",
            risk: "danger",
            feedback: {
              title: "هيجيب نتيجة عكسية",
              body: "الانتقام المجهول بيكبر المشكلة وممكن يوقعك في مشكلة كبيرة. وكمان بيدي لسارة حجة إنها مستهدفة زيك بالظبط.",
              advice: "رد الأذى بالأذى على النت هيضرك إنت كمان. الطرق الرسمية هي اللي بتحميك — مش الانتقام.",
            },
            next: "end_bad",
          },
        ],
      },
      { id: "end_good", type: "end", outcome: "good" },
      { id: "end_bad", type: "end", outcome: "bad" },
    ],
  },
  {
    id: "grooming_ar",
    title: "الصديق الجديد",
    desc: "شخص غريب على الإنترنت ودود بزيادة — مجاملات، أسئلة شخصية، وإلحاح عشان تتقابلوا. في حاجة مش مظبوطة.",
    emoji: "🔒",
    tag: "الأمان على الإنترنت",
    accentFrom: "#ef4444",
    accentTo: "#dc2626",
    glowColor: "rgba(239,68,68,0.22)",
    recommendations: [
      "متشاركش معلومات شخصية (السن، المدرسة، المكان) مع غرباء",
      "الإلحاح وطلب صور علامة خطر واضحة",
      "متقابلش حد عرفته على الإنترنت لوحدك أبداً",
      "لو حسيت بعدم ارتياح، اعمل بلوك فوراً",
      "اتكلم مع شخص بالغ لو حسيت بأي ضغط"
    ],
    scenes: [
      {
        id: "s1",
        type: "chat",
        messages: [
          { side: "incoming", avatar: "؟", name: "مجهول", text: "أهلاً! عندنا أصدقاء مشتركين كتير. شكلك شخصية لطيفة 😊" },
          { side: "outgoing", avatar: "أ", name: "أنت", text: "أهلاً، مين معايا؟" },
          { side: "incoming", avatar: "؟", name: "مجهول", text: "أنا أليكس! من جامعة قريبة. إنت شكلك حلو أوي. عندك كام سنة؟" },
        ],
        narrator:
          "شخص غريب عملك فولو على إنستجرام. بدأ كلامه بمجاملات وسأل عن سنك في أول رسايل. حاسس إن في حاجة غريبة، بس هو شكله ودود.",
        choices: [
          {
            text: "تقوله سنك ومدرستك — شكله شخص كويس",
            risk: "danger",
            feedback: {
              title: "خطر: معلومات كتير، بسرعة أوي",
              body: "المبتزين بيستخدموا المجاملات السريعة والدفء المزيف عشان يبنوا ثقة قبل ما يجمعوا معلوماتك الشخصية. السن، المدرسة، وروتينك اليومي هما اللي بيدوروا عليه.",
              advice: "عمرك ما تشارك سنك، مدرستك، أو مكانك مع شخص غريب على النت — مهما كان شكله ودود.",
            },
            next: "s2b",
          },
          {
            text: "ترد ردود عامة وماتقولش أي حاجة شخصية",
            risk: "safe",
            feedback: {
              title: "غريزة سليمة",
              body: "الردود العامة مع الناس الجديدة على النت دايماً الخطوة الصح. إنت مش ملزم تثبت حسن نيتك بمعلوماتك الشخصية.",
              advice: "الأصدقاء الحقيقيين مش بيضغطوا عليك عشان معلومات شخصية في أول محادثة. خد بالك من النمط ده.",
            },
            next: "s2a",
          },
          {
            text: "تسأله إزاي وصل للأكونت بتاعك",
            risk: "risky",
            feedback: {
              title: "فضول، بس خلي بالك",
              body: "السؤال منطقي، بس ممكن يكدب بسهولة. اللي يهم أكتر هو سلوكه — المجاملات السريعة، الأسئلة الشخصية، والإلحاح دي علامات خطر بغض النظر عن رده.",
              advice: "ثق في الأفعال مش في التبريرات. ركز على الإلحاح والاستعجال.",
            },
            next: "s2a",
          },
        ],
      },
      {
        id: "s2a",
        type: "chat",
        messages: [
          { side: "incoming", avatar: "؟", name: "أليكس", text: "يا عم مالك متكتم كده؟ أنا بس عايز نتعرف." },
          { side: "incoming", avatar: "؟", name: "أليكس", text: "ممكن تبعت صورة سيلفي؟ عشان أتأكد إنك حقيقي بس 🙂" },
        ],
        narrator:
          '"أليكس" بدأ يضغط أكتر. الطريقة الودودة اتحولت لإلحاح وبيحاول يحسسك بالذنب عشان عندك حدود — ودي طريقة تلاعب معروفة.',
        choices: [
          {
            text: "تعمل بلوك وريبورت للأكونت فوراً",
            risk: "safe",
            feedback: {
              title: "القرار الصح",
              body: "طلب صور من شخص لسه عارفه — خصوصاً لو بيحسسك بالذنب — دي علامة خطر كبيرة. البلوك بيحميك، والريبورت ممكن يحمي غيرك.",
              advice: "بلغ المنصة وكمان خط نجدة الطفل: 16000.",
            },
            next: "end_good",
          },
          {
            text: "تبعت صورة عادية عشان يبطل يزن بس",
            risk: "danger",
            feedback: {
              title: "كده المشكلة بتكبر",
              body: "الصور اللي بتتبعت لغرباء ممكن تستخدم في الابتزاز أو تتنشر بدون إذنك. الضغط اللي إنت حاسس بيه مقصود — عشان تخضع لطلباته.",
              advice: "الإلحاح = علامة خطر. مفيش صديق حقيقي بيضغط عليك عشان صور. اعمل بلوك وبلغ حد كبير فوراً.",
            },
            next: "end_bad",
          },
        ],
      },
      {
        id: "s2b",
        type: "chat",
        messages: [
          { side: "incoming", avatar: "؟", name: "أليكس", text: "حلو أوي إنك في المدرسة دي! بتروح البيت الساعة 3؟ ممكن أعدي عليك نتعرف 🙂" },
        ],
        narrator:
          "هو دلوقتي عارف سنك ومدرستك ومواعيدك. الحوار اتحول لطلب مقابلة وبقى خطر بجد مش مجرد عدم ارتياح.",
        choices: [
          {
            text: "توافق تقابله في مكان عام — ده أكيد أمان",
            risk: "danger",
            feedback: {
              title: "خطر جداً",
              body: "مقابلة شخص استدرج معلوماتك الشخصية بالإلحاح عمرها ما بتكون أمان — مهما كان المكان. 'مكان عام' ده إحساس مزيف بالأمان عشان يخليك توافق.",
              advice: "عمرك ما تقابل حد غريب من النت لوحدك. لو حسيت بخطر، بلغ حد كبير فوراً ووريه المحادثة.",
            },
            next: "end_bad",
          },
          {
            text: "توقف كلام وتوري المحادثة لشخص بالغ بتثق فيه",
            risk: "safe",
            feedback: {
              title: "ده الصح بالظبط",
              body: "المحادثة دي فيها كل علامات الاستدراج: صداقة سريعة، مجاملات، سحب معلومات، ودلوقتي طلب مقابلة. لازم حد كبير يشوف ده.",
              advice: "ممكن تتصل بـ 16000 (خط نجدة الطفل). إنت مش بتبالغ — الموضوع ده جاد جداً.",
            },
            next: "end_good",
          },
        ],
      },
      { id: "end_good", type: "end", outcome: "good" },
      { id: "end_bad", type: "end", outcome: "bad" },
    ],
  },
  {
    id: "blackmail_ar",
    title: "تهديد السكرين شوت",
    desc: "شخص بيهددك إنه هينشر حاجة محرجة ليك لو معملتش اللي هو عاوزه.",
    emoji: "⚠️",
    tag: "الابتزاز",
    accentFrom: "#8b5cf6",
    accentTo: "#6d28d9",
    glowColor: "rgba(139,92,246,0.22)",
    recommendations: [
      "إياك تدفع أو تنفذ طلبات المبتز، ده مش هيوقفه",
      "خد سكرين شوت للتهديدات فوراً",
      "اعمل بلوك بعد ما تحفظ الأدلة",
      "بلغ الأهل أو السلطات، الابتزاز جريمة",
      "اتصل بمباحث الإنترنت (108) للحصول على دعم رسمي"
    ],
    scenes: [
      {
        id: "s1",
        type: "chat",
        messages: [
          { side: "incoming", avatar: "م", name: "مجهول", text: "أهلاً. معايا سكرين شوتس للحاجات اللي بعتها الشهر اللي فات." },
          { side: "incoming", avatar: "م", name: "مجهول", text: "ابعت 500 جنيه وإلا هنشرها لكل الناس في جامعتك." },
          { side: "system", avatar: "", name: "", text: "— قلبك بيدق بسرعة. إنت عارف هو يقصد إيه. —" },
        ],
        narrator:
          "جالك رسالة تهديد من أكونت متعرفوش. بيقول إن معاه صور أو رسايل تخصك وبيطلب فلوس. إيدك بتترعش.",
        choices: [
          {
            text: "تدفعله عشان يمسح الحاجة ويسيبك في حالك",
            risk: "danger",
            feedback: {
              title: "ده مش هيوقف الموضوع",
              body: "الدفع بيثبت للمبتز إنك بتستجيب للتهديد. في معظم الحالات بيرجع يطلب فلوس أكتر. الفلوس دي بتشجعه يكمل.",
              advice: "الدفع هو أكتر حاجة هتخلي الوضع أسوأ. إياك تدفع — بلغ فوراً.",
            },
            next: "s2b",
          },
          {
            text: "تعمل بلوك فوراً وتقول لحد تثق فيه",
            risk: "safe",
            feedback: {
              title: "بالظبط كده",
              body: "البلوك بيوقف التواصل. وكلامك مع شخص تثق فيه — حد من أهلك أو السلطات — بيخليك مش لوحدك. الابتزاز جريمة.",
              advice: "خد سكرين شوت للتهديد قبل البلوك. ده دليل. إنت معملتش حاجة غلط بإنك بقيت ضحية.",
            },
            next: "s2a",
          },
          {
            text: "تحاول تعرف هو مين قبل ما تاخد أي خطوة",
            risk: "risky",
            feedback: {
              title: "مفهوم، بس خطر",
              body: "الكلام معاه بيدي المبتز مساحة يضغط عليك أكتر. حتى لو عرفت هو مين، إنت محتاج مساعدة رسمية — مش مواجهة.",
              advice: "بلغ السلطات وهما يقدروا يوصلوا ليه. متتكلمش معاه لوحدك.",
            },
            next: "s2a",
          },
        ],
      },
      {
        id: "s2a",
        type: "chat",
        messages: [
          { side: "outgoing", avatar: "أ", name: "أنت", text: "أنا بلغت عن الأكونت ده وحفظت كل الرسايل." },
          { side: "incoming", avatar: "ص", name: "صديق", text: "أنا فخور بيك إنك متسكتش. يلا نروح نبلغ في الجامعة." },
        ],
        narrator:
          "بلغت عن الأكونت في المنصة وكمان في مكتب الدعم في جامعتك. الأخصائي ساعدك تقدم بلاغ رسمي والتحقيق بدأ.",
        choices: [
          {
            text: "تتصل بمباحث الإنترنت عشان تاخد حقك بالقانون",
            risk: "safe",
            feedback: {
              title: "متابعة ممتازة",
              body: "مباحث الإنترنت تقدر تتتبع الأكونت. البلاغ الرسمي بيعملك حماية قانونية لو الشخص حاول يعمل أي حاجة تاني.",
              advice: "خط مباحث الإنترنت: 108. هما موجودين عشان ده بالظبط.",
            },
            next: "end_good",
          },
          {
            text: "تنشر التهديد على السوشيال ميديا عشان تحذر الناس",
            risk: "risky",
            feedback: {
              title: "نيتك كويسة، بس خد بالك",
              body: "النشر ممكن يجيب نتيجة عكسية — ممكن ينشر المحتوى أكتر أو يدي المبتز انتباه هو عاوزه.",
              advice: "خلي السلطات تتصرف. أمانك أهم من تحذير الناس دلوقتي.",
            },
            next: "end_good",
          },
        ],
      },
      {
        id: "s2b",
        type: "chat",
        messages: [
          { side: "incoming", avatar: "م", name: "مجهول", text: "شكراً على الفلوس. بس أنا محتاج 1000 جنيه كمان يوم الجمعة وإلا الديل لاغي." },
          { side: "system", avatar: "", name: "", text: "— المطالب زادت للضعف. —" },
        ],
        narrator: "زي ما توقعنا، الدفع خلاه يتأكد إنك بتخاف. طلباته زادت الضعف في 24 ساعة وإنت حاسس إنك محبوس ومش عارف تعمل إيه.",
        choices: [
          {
            text: "توقف الدفع وتبلغ مباحث الإنترنت فوراً",
            risk: "safe",
            feedback: {
              title: "القرار الصح — أخيراً",
              body: "عمر الوقت ما بيتأخر على التبليغ. التبليغ هيوقف الدايرة دي ويديك حماية قانونية، حتى لو دفعت قبل كده.",
              advice: "جهز كل الأدلة — التحويلات، الرسايل، والسكرين شوتس. اتصل بمباحث الإنترنت: 108.",
            },
            next: "end_good",
          },
          {
            text: "تدفعله تاني وتتمنى إنه يوقّف المرادي",
            risk: "danger",
            feedback: {
              title: "الدايرة هتستمر",
              body: "كل دفعة بتأكدله إن التهديد بيجيب نتيجة. المبالغ هتزيد. المبتز عمره ما بيقول 'كفاية' ويوقف من نفسه.",
              advice: "وقف الدايرة دي دلوقتي. بلغ فوراً. إنت الضحية — مش إنت اللي المفروض تخاف.",
            },
            next: "end_bad",
          },
        ],
      },
      { id: "end_good", type: "end", outcome: "good" },
      { id: "end_bad", type: "end", outcome: "bad" },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<Risk, { label: string; dot: string; border: string; bg: string; text: string }> = {
  safe: { label: "Safe choice", dot: "#4ade80", border: "rgba(74,222,128,0.25)", bg: "rgba(74,222,128,0.07)", text: "#4ade80" },
  risky: { label: "Risky choice", dot: "#fbbf24", border: "rgba(251,191,36,0.25)", bg: "rgba(251,191,36,0.07)", text: "#fbbf24" },
  danger: { label: "Dangerous", dot: "#f87171", border: "rgba(248,113,113,0.25)", bg: "rgba(248,113,113,0.07)", text: "#f87171" },
};

function countScenes(scenes: Scene[]): number {
  return scenes.filter((s) => s.type === "chat").length;
}

function sceneIndex(scenes: Scene[], id: string): number {
  const chats = scenes.filter((s) => s.type === "chat");
  return chats.findIndex((s) => s.id === id) + 1;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TypingBubble() {
  return (
    <div className="flex gap-1 items-center px-3 py-2.5 rounded-2xl" style={{ background: "var(--color-surface-raised)", width: 56 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="rounded-full"
          style={{
            width: 5,
            height: 5,
            background: "var(--color-text-faint)",
            animation: `typingBounce 1.2s ${i * 0.2}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ScenariosPage() {
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const SCENARIOS = language === "en" ? SCENARIOS_EN : SCENARIOS_AR;
  
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [currentSceneId, setCurrentSceneId] = useState<string>("s1");
  const [pendingFeedback, setPendingFeedback] = useState<(Choice["feedback"] & { risk: Risk }) | null>(null);
  const [showMessages, setShowMessages] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [decisions, setDecisions] = useState<Array<{ text: string; risk: Risk }>>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scene = activeScenario?.scenes.find((s) => s.id === currentSceneId) ?? null;
  const totalSteps = activeScenario ? countScenes(activeScenario.scenes) : 0;
  const currentStep = activeScenario && scene?.type === "chat" ? sceneIndex(activeScenario.scenes, currentSceneId) : totalSteps;
  const progress = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 100;

  // Animate chat messages in one-by-one
  useEffect(() => {
    if (!scene || scene.type !== "chat" || !scene.messages) return;
    setShowMessages(0);
    setPendingFeedback(null);
    setIsTyping(false);

    scene.messages.forEach((_, i) => {
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setShowMessages(i + 1);
        }, 600);
      }, i * 900);
    });
  }, [currentSceneId, activeScenario]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [showMessages, isTyping, pendingFeedback]);

  function startScenario(s: Scenario) {
    setActiveScenario(s);
    setCurrentSceneId("s1");
    setDecisions([]);
    setPendingFeedback(null);
  }

  function handleChoice(choice: Choice) {
    setDecisions((prev) => [...prev, { text: choice.text, risk: choice.risk }]);
    setPendingFeedback({ ...choice.feedback, risk: choice.risk });
  }

  function handleContinue() {
    const choice = scene?.choices?.find((c) => c.feedback.title === pendingFeedback?.title);
    if (!choice) return;
    setCurrentSceneId(choice.next);
    setPendingFeedback(null);
  }

  function exitStory() {
    setActiveScenario(null);
    setCurrentSceneId("s1");
    setDecisions([]);
    setPendingFeedback(null);
  }

  // ── Scenario Picker ────────────────────────────────────────────────────

  if (!activeScenario) {
    return (
      <div className="space-y-6 pb-6 relative" dir={language === "ar" ? "rtl" : "ltr"}>
        {/* Language Toggle */}
        <div className="flex justify-start mb-2">
          <div className="flex bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full p-1 shadow-sm">
            <button
              onClick={() => setLanguage("en")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                language === "en" 
                  ? "bg-[var(--color-accent)] text-white shadow-md" 
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage("ar")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                language === "ar" 
                  ? "bg-[var(--color-accent)] text-white shadow-md" 
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              عربي
            </button>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="section-label mb-1">{language === "ar" ? "قصص تفاعلية" : "Interactive Stories"}</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-tight" style={{ color: "var(--color-text)" }}>
            {language === "ar" ? "اختار " : "Choose Your "}
            <span className="text-gradient-blue">{language === "ar" ? "مسارك" : "Path"}</span>
          </h1>
          <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {language === "ar" 
              ? "مواقف حقيقية. قرارات حقيقية. اتعلم إزاي تتجنب المخاطر على الإنترنت من خلال قصص تفاعلية."
              : "Real scenarios. Real decisions. Learn to navigate online risks through interactive stories."}
          </p>
        </motion.div>

        {/* Intro banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
        >
          <div
            className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none opacity-30"
            style={{ background: "radial-gradient(circle, var(--color-secondary-glow) 0%, transparent 70%)", transform: "translate(30%,-30%)" }}
          />
          <div className="flex items-start gap-4 relative z-10">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: "linear-gradient(135deg, var(--color-secondary), #6366f1)", boxShadow: "0 4px 14px var(--color-secondary-glow)" }}
            >
              🧭
            </div>
            <div>
              <p className="font-display font-semibold text-sm" style={{ color: "var(--color-text)" }}>
                {language === "ar" ? "إزاي بتشتغل؟" : "How it works"}
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                {language === "ar" 
                  ? "كل قصة هتحطك في موقف حقيقي. قراراتك هتبين النتيجة، وفي النهاية هتعرف إزاي تحمي نفسك وتفضل في أمان."
                  : "Each story puts you in a real situation. You make decisions — and see exactly why each choice matters. Every path ends with resources to stay safe."}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Scenario cards */}
        <div className="space-y-3">
          <p className="section-label px-0.5">{language === "ar" ? "اختار قصة" : "Pick a scenario"}</p>
          {SCENARIOS.map((s, i) => (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 + i * 0.07, duration: 0.35 }}
              onClick={() => startScenario(s)}
              className="w-full rounded-2xl p-5 text-left group relative overflow-hidden card-interactive"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-sm)" }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                style={{ background: `radial-gradient(ellipse at 10% 90%, ${s.glowColor} 0%, transparent 60%)` }}
              />
              <div className="flex items-center gap-4 relative z-10">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `linear-gradient(135deg, ${s.accentFrom}, ${s.accentTo})`, boxShadow: `0 4px 14px ${s.glowColor}` }}
                >
                  {s.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-display font-bold text-sm" style={{ color: "var(--color-text)" }}>
                      {s.title}
                    </p>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: `${s.accentFrom}18`, color: s.accentFrom }}
                    >
                      {s.tag}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                    {s.desc}
                  </p>
                </div>
                <span style={{ color: "var(--color-text-faint)", fontSize: 18 }} className="shrink-0 transition-transform duration-200 group-hover:translate-x-1">
                  →
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Safety note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl px-4 py-3 text-xs leading-relaxed"
          style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
        >
          {language === "ar" ? (
            <>
              🛡️ <strong style={{ color: "var(--color-accent)" }}>ملاحظة أمان:</strong> القصص دي للتوعية بس. لو بتتعرض لمشكلة حقيقية، اتصل بخط نجدة الطفل:{" "}
              <strong style={{ color: "var(--color-text)" }}>16000</strong>. مباحث الإنترنت:{" "}
              <strong style={{ color: "var(--color-text)" }}>108</strong>.
            </>
          ) : (
            <>
              🛡️ <strong style={{ color: "var(--color-accent)" }}>Safety note:</strong> These stories are educational simulations. If you're experiencing a real situation,
              call Egypt's child protection hotline:{" "}
              <strong style={{ color: "var(--color-text)" }}>16000</strong>. Cybercrime unit:{" "}
              <strong style={{ color: "var(--color-text)" }}>108</strong>.
            </>
          )}
        </motion.div>
      </div>
    );
  }

  // ── End Screen ─────────────────────────────────────────────────────────

  if (scene?.type === "end") {
    const isGood = scene.outcome === "good";
    const goodDecisions = decisions.filter((d) => d.risk === "safe").length;
    const badDecisions = decisions.filter((d) => d.risk === "danger").length;

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="end"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.45 }}
          className="space-y-5 pb-6"
        >
          {/* Outcome header */}
          <div className="text-center py-4 space-y-4">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl"
              style={{
                background: isGood
                  ? "radial-gradient(circle, rgba(74,222,128,0.2), rgba(74,222,128,0.04))"
                  : "radial-gradient(circle, rgba(248,113,113,0.2), rgba(248,113,113,0.04))",
                boxShadow: isGood ? "0 0 32px rgba(74,222,128,0.3)" : "0 0 32px rgba(248,113,113,0.3)",
                border: `1px solid ${isGood ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
              }}
            >
              {isGood ? "✓" : "✕"}
            </motion.div>

            <div>
              <h2 className="font-display text-2xl font-bold" style={{ color: "var(--color-text)" }}>
                {isGood ? (language === "ar" ? "أنت في أمان" : "You stayed safe") : (language === "ar" ? "اخترت مسار خطر" : "Risky path taken")}
              </h2>
              <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                {isGood
                  ? (language === "ar" ? "قراراتك حمتك. في الحقيقة، القرارات دي بتعمل فرق كبير." : "Your choices protected you. In real life, these decisions make a real difference.")
                  : (language === "ar" ? "دي الطريقة اللي المشاكل بتكبر بيها. دلوقتي عرفت إيه اللي تاخد بالك منه وتعمل إيه." : "This is how situations can escalate. Now you know what to watch for — and what to do instead.")}
              </p>
            </div>
          </div>

          {/* Decision summary */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
          >
            <p className="section-label mb-4">{language === "ar" ? "قراراتك" : "Your decisions"}</p>
            <div className="space-y-3">
              {decisions.map((d, i) => {
                const cfg = RISK_CONFIG[d.risk];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.07 }}
                    className="flex items-start gap-3 text-sm"
                  >
                    <span
                      className="shrink-0 mt-1 rounded-full"
                      style={{ width: 8, height: 8, background: cfg.dot, display: "inline-block", boxShadow: `0 0 5px ${cfg.dot}88` }}
                    />
                    <div className="flex-1 min-w-0">
                      <p style={{ color: "var(--color-text)" }}>{d.text}</p>
                      <p className="text-xs mt-0.5 font-medium" style={{ color: cfg.text }}>
                        {cfg.label}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Score bar */}
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
              <div className="flex justify-between text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>
                <span>{language === "ar" ? `${goodDecisions} آمن · ${badDecisions} خطر` : `${goodDecisions} safe · ${badDecisions} risky/dangerous`}</span>
                <span>{language === "ar" ? `إجمالي ${decisions.length} قرارات` : `${decisions.length} decisions total`}</span>
              </div>
              <div className="rounded-full overflow-hidden h-2" style={{ background: "var(--color-surface-raised)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round((goodDecisions / Math.max(decisions.length, 1)) * 100)}%`,
                    background: "linear-gradient(90deg, #4ade80, #22c55e)",
                    boxShadow: "0 0 8px rgba(74,222,128,0.4)",
                    transition: "width 1s cubic-bezier(0.16,1,0.3,1)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
          >
            <p className="section-label mb-4">{language === "ar" ? "دايماً اعمل كده" : "What to always do"}</p>
            <div className="space-y-3">
              {(activeScenario?.recommendations || []).map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span style={{ color: "#4ade80", flexShrink: 0, marginTop: 1 }}>✓</span>
                  <p style={{ color: "var(--color-text-muted)" }}>{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Report CTA */}
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }}
          >
            <p className="font-display font-semibold text-sm" style={{ color: "var(--color-text)" }}>
              {language === "ar" ? "بتواجه مشكلة حقيقية دلوقتي؟" : "Facing something real right now?"}
            </p>
            <div className="space-y-2">
              <a
                href="tel:16000"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all hover-lift"
                style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#fca5a5", textDecoration: "none" }}
              >
                <span>📞</span>
                <div>
                  <p style={{ color: "#fca5a5" }}>National Council for Childhood — Hotline</p>
                  <p className="text-xs font-bold" style={{ color: "#f87171" }}>16000</p>
                </div>
              </a>
              <a
                href="tel:108"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all hover-lift"
                style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", color: "var(--color-secondary)", textDecoration: "none" }}
              >
                <span>🛡️</span>
                <div>
                  <p style={{ color: "var(--color-secondary)" }}>Egypt Cybercrime Unit</p>
                  <p className="text-xs font-bold" style={{ color: "var(--color-secondary)" }}>108</p>
                </div>
              </a>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            <button
              onClick={() => startScenario(activeScenario)}
              className="btn-primary w-full py-3 text-sm font-medium ripple-wrapper"
            >
              {language === "ar" ? "جرب مسار تاني" : "Try a different path"}
            </button>
            <button
              onClick={exitStory}
              className="w-full rounded-2xl py-3 text-sm transition-all flex justify-center gap-2"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
            >
              {language === "ar" ? "الرجوع لكل القصص ←" : "← Back to all stories"}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── Story View ─────────────────────────────────────────────────────────

  if (!scene || scene.type !== "chat") return null;

  const msgs = scene.messages ?? [];
  const allMessagesShown = showMessages >= msgs.length;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentSceneId}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.3 }}
        className="space-y-4 pb-6"
        dir={language === "ar" ? "rtl" : "ltr"}
      >
        {/* Story header */}
        <div className="flex items-center gap-3">
          <button
            onClick={exitStory}
            className="rounded-xl px-3 py-1.5 text-xs transition-all"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
          >
            {language === "ar" ? "خروج" : "← Exit"}
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm truncate" style={{ color: "var(--color-text)" }}>
              {activeScenario.title}
            </p>
            <p className="text-[10px]" style={{ color: "var(--color-text-faint)" }}>
              {language === "ar" ? `المشهد ${currentStep} من ${totalSteps}` : `Scene ${currentStep} of ${totalSteps}`}
            </p>
          </div>
          <span
            className="text-[10px] font-medium px-2.5 py-1 rounded-full shrink-0"
            style={{ background: `${activeScenario.accentFrom}15`, color: activeScenario.accentFrom }}
          >
            {activeScenario.tag}
          </span>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-[10px] mb-1.5" style={{ color: "var(--color-text-faint)" }}>
            <span>{language === "ar" ? "نسبة الإنجاز" : "Progress"}</span>
            <span>{progress}%</span>
          </div>
          <div className="rounded-full overflow-hidden h-1" style={{ background: "var(--color-surface-raised)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${activeScenario.accentFrom}, ${activeScenario.accentTo})`,
                boxShadow: `0 0 6px ${activeScenario.glowColor}`,
                transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
              }}
            />
          </div>
        </div>

        {/* Chat scene */}
        <div
          className="rounded-2xl p-4 min-h-[180px]"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
        >
          <p className="section-label mb-3">📱 {language === "ar" ? "الرسايل" : "Messages"}</p>
          <div className="space-y-2.5">
            {msgs.slice(0, showMessages).map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-2 items-end ${msg.side === "outgoing" ? "flex-row-reverse" : ""} ${msg.side === "system" ? "justify-center" : ""}`}
              >
                {msg.side !== "system" && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{
                      background: msg.side === "incoming"
                        ? "rgba(248,113,113,0.15)"
                        : "rgba(58,163,227,0.15)",
                      color: msg.side === "incoming" ? "#f87171" : "var(--color-accent)",
                    }}
                  >
                    {msg.avatar}
                  </div>
                )}
                <div
                  className="max-w-[78%] px-3 py-2 text-sm leading-relaxed"
                  style={{
                    borderRadius: msg.side === "incoming"
                      ? "4px 16px 16px 16px"
                      : msg.side === "outgoing"
                        ? "16px 4px 16px 16px"
                        : "12px",
                    background: msg.side === "incoming"
                      ? "var(--color-surface-raised)"
                      : msg.side === "outgoing"
                        ? "rgba(58,163,227,0.15)"
                        : "transparent",
                    color: msg.side === "system" ? "var(--color-text-faint)" : "var(--color-text)",
                    fontStyle: msg.side === "system" ? "italic" : "normal",
                    fontSize: msg.side === "system" ? "0.75rem" : undefined,
                  }}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}

            {isTyping && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 items-end">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ background: "rgba(248,113,113,0.15)", color: "#f87171" }}
                >
                  ?
                </div>
                <TypingBubble />
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Narrator */}
        <AnimatePresence>
          {allMessagesShown && !isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl px-4 py-3.5 text-sm leading-relaxed"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-muted)",
                borderLeft: `3px solid ${activeScenario.accentFrom}`,
              }}
            >
              {scene.narrator}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Choices or Feedback */}
        <AnimatePresence mode="wait">
          {allMessagesShown && !isTyping && !pendingFeedback && scene.choices && (
            <motion.div
              key="choices"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.15 }}
              className="space-y-2.5"
            >
              <p className="section-label px-0.5">{language === "ar" ? "هتعمل إيه؟" : "What do you do?"}</p>
              {scene.choices.map((choice, i) => {
                return (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18 + i * 0.06 }}
                    onClick={() => handleChoice(choice)}
                    className="w-full rounded-xl px-4 py-3.5 text-left flex items-start gap-3 transition-all group"
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--color-surface-raised)";
                      (e.currentTarget as HTMLElement).style.transform = "translateX(3px)";
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--color-surface)";
                      (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
                    }}
                  >
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
                      {choice.text}
                    </p>
                  </motion.button>
                );
              })}
            </motion.div>
          )}

          {pendingFeedback && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              <div
                className="rounded-2xl p-5"
                style={{
                  background: RISK_CONFIG[pendingFeedback.risk].bg,
                  border: `1px solid ${RISK_CONFIG[pendingFeedback.risk].border}`,
                }}
              >
                <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: RISK_CONFIG[pendingFeedback.risk].text }}>
                  {RISK_CONFIG[pendingFeedback.risk].label}
                </p>
                <p className="font-display font-bold text-sm mb-2" style={{ color: "var(--color-text)" }}>
                  {pendingFeedback.title}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                  {pendingFeedback.body}
                </p>
                <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
                  <p className="text-xs leading-relaxed font-medium" style={{ color: "var(--color-text)" }}>
                    💡 {pendingFeedback.advice}
                  </p>
                </div>
              </div>
              <button onClick={handleContinue} className="btn-primary w-full py-3 text-sm ripple-wrapper">
                {language === "ar" ? "كمل القصة ←" : "Continue the story →"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Panic / Exit floating button */}
        <div className="fixed bottom-20 right-4 z-50">
          <button
            onClick={exitStory}
            className="rounded-full px-4 py-2 text-xs font-medium transition-all"
            style={{
              background: "rgba(248,113,113,0.12)",
              border: "1px solid rgba(248,113,113,0.3)",
              color: "#fca5a5",
              backdropFilter: "blur(8px)",
            }}
          >
            {language === "ar" ? "✕ خروج من القصة" : "✕ Exit story"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}