import { Language } from "../types";
import { MBTIType } from "./types";

interface IPersonality {
  name: { [key in Language]: string };
  nickname: { [key in Language]: string };
  description: { [key in Language]: string };
}

const personalities: { [k: string]: IPersonality } = {
  [MBTIType.INTJ]: {
    name: {
      [Language.Persian]: "معمار (INTJ)",
      [Language.English]: "Architect (INTJ)",
      [Language.Russian]: "Архитектор (INTJ)",
    },
    nickname: {
      [Language.Persian]: "استراتژیست",
      [Language.English]: "Strategist",
      [Language.Russian]: "Стратег",
    },
    description: {
      [Language.Persian]:
        "معماران با تفکر استراتژیک، دانش گسترده و اعتماد به نفس بالا، قادر به حل هر مشکل پیچیده‌ای هستند. آنها مستقل، تحلیلگر و دارای چشم‌انداز بلندمدت هستند.",
      [Language.English]:
        "Architects with strategic thinking, extensive knowledge and high self-confidence are able to solve any complex problem. They are independent, analytical and have a long-term vision.",
      [Language.Russian]:
        "Архитекторы со стратегическим мышлением, обширными знаниями и высокой уверенностью в себе способны решить любую сложную проблему. Они независимы, аналитичны и имеют долгосрочное видение.",
    },
  },
  [MBTIType.INTP]: {
    name: {
      [Language.Persian]: "منطق‌دان (INTP)",
      [Language.English]: "Logician (INTP)",
      [Language.Russian]: "Логик (INTP)",
    },
    nickname: {
      [Language.Persian]: "فیلسوف",
      [Language.English]: "Philosopher",
      [Language.Russian]: "Философ",
    },
    description: {
      [Language.Persian]:
        "منطق‌دانان فلسفی و نوآور هستند و همیشه در جستجوی دانش. آنها تحلیلی، کنجکاو و علاقه‌مند به کشف الگوها و اصول پنهان در پس پدیده‌ها هستند.",
      [Language.English]:
        "Logicians are philosophical and innovative, always in search of knowledge. They are analytical, curious and interested in discovering patterns and hidden principles behind phenomena.",
      [Language.Russian]:
        "Логики философски настроены и инновационны, всегда в поиске знаний. Они аналитичны, любознательны и заинтересованы в открытии паттернов и скрытых принципов за явлениями.",
    },
  },
  [MBTIType.ENTJ]: {
    name: {
      [Language.Persian]: "فرمانده (ENTJ)",
      [Language.English]: "Commander (ENTJ)",
      [Language.Russian]: "Командир (ENTJ)",
    },
    nickname: {
      [Language.Persian]: "رهبر",
      [Language.English]: "Leader",
      [Language.Russian]: "Лидер",
    },
    description: {
      [Language.Persian]:
        "فرماندهان رهبران قاطع و پرانرژی هستند که از چالش برخوردار می‌شوند. آنها استراتژیک، قاطع و توانایی سازماندهی و هدایت جمع را دارند.",
      [Language.English]:
        "Commanders are decisive and energetic leaders who thrive on challenges. They are strategic, decisive and have the ability to organize and lead groups.",
      [Language.Russian]:
        "Командиры - решительные и энергичные лидеры, которые процветают на вызовах. Они стратегичны, решительны и обладают способностью организовывать и вести группы.",
    },
  },
  [MBTIType.ENTP]: {
    name: {
      [Language.Persian]: "مناظره‌گر (ENTP)",
      [Language.English]: "Debater (ENTP)",
      [Language.Russian]: "Дебатер (ENTP)",
    },
    nickname: {
      [Language.Persian]: "نوآور",
      [Language.English]: "Innovator",
      [Language.Russian]: "Новатор",
    },
    description: {
      [Language.Persian]:
        "مناظره‌گران کنجکاو و پرشور هستند و از چالش فکری لذت می‌برند. آنها خلاق، انعطاف‌پذیر و توانایی دیدن زوایای مختلف هر موضوع را دارند.",
      [Language.English]:
        "Debaters are curious and passionate and enjoy intellectual challenges. They are creative, flexible and have the ability to see different angles of any topic.",
      [Language.Russian]:
        "Дебатеры любознательны и страстны, наслаждаются интеллектуальными вызовами. Они креативны, гибки и обладают способностью видеть разные углы любой темы.",
    },
  },
  [MBTIType.INFJ]: {
    name: {
      [Language.Persian]: "وکیل المدافع (INFJ)",
      [Language.English]: "Advocate (INFJ)",
      [Language.Russian]: "Адвокат (INFJ)",
    },
    nickname: {
      [Language.Persian]: "مشاور",
      [Language.English]: "Counselor",
      [Language.Russian]: "Консультант",
    },
    description: {
      [Language.Persian]:
        "وکیل‌ها آرمان‌گرا و اخلاقی هستند و برای بهبود دنیا تلاش می‌کنند. آنها عمیق، همدل و دارای بینش قوی نسبت به انسان‌ها و انگیزه‌هایشان هستند.",
      [Language.English]:
        "Advocates are idealistic and ethical and strive to improve the world. They are deep, empathetic and have strong insight into people and their motivations.",
      [Language.Russian]:
        "Адвокаты идеалистичны и этичны, стремятся улучшить мир. Они глубоки, эмпатичны и имеют сильное понимание людей и их мотиваций.",
    },
  },
  [MBTIType.INFP]: {
    name: {
      [Language.Persian]: "میانجی (INFP)",
      [Language.English]: "Mediator (INFP)",
      [Language.Russian]: "Посредник (INFP)",
    },
    nickname: {
      [Language.Persian]: "رویاپرداز",
      [Language.English]: "Dreamer",
      [Language.Russian]: "Мечтатель",
    },
    description: {
      [Language.Persian]:
        "میانجی‌ها آرمان‌گرا و وفادار به ارزش‌های خود هستند. آنها خلاق، همدل و همیشه به دنبال راه‌هایی برای کمک به دیگران و درک عمیق‌تر از زندگی هستند.",
      [Language.English]:
        "Mediators are idealistic and loyal to their values. They are creative, empathetic and always looking for ways to help others and gain deeper understanding of life.",
      [Language.Russian]:
        "Посредники идеалистичны и верны своим ценностям. Они креативны, эмпатичны и всегда ищут способы помочь другим и получить более глубокое понимание жизни.",
    },
  },
  [MBTIType.ENFJ]: {
    name: {
      [Language.Persian]: "قهرمان (ENFJ)",
      [Language.English]: "Protagonist (ENFJ)",
      [Language.Russian]: "Протагонист (ENFJ)",
    },
    nickname: {
      [Language.Persian]: "معلم",
      [Language.English]: "Teacher",
      [Language.Russian]: "Учитель",
    },
    description: {
      [Language.Persian]:
        "قهرمانان رهبران کاریزماتیک و الهام‌بخش هستند. آنها همدل، متقاعدکننده و توانایی ایجاد انگیزه در دیگران برای رسیدن به اهداف مشترک را دارند.",
      [Language.English]:
        "Protagonists are charismatic and inspiring leaders. They are empathetic, persuasive and have the ability to motivate others to achieve common goals.",
      [Language.Russian]:
        "Протагонисты - харизматичные и вдохновляющие лидеры. Они эмпатичны, убедительны и обладают способностью мотивировать других для достижения общих целей.",
    },
  },
  [MBTIType.ENFP]: {
    name: {
      [Language.Persian]: "فعال (ENFP)",
      [Language.English]: "Campaigner (ENFP)",
      [Language.Russian]: "Активист (ENFP)",
    },
    nickname: {
      [Language.Persian]: "الهام‌دهنده",
      [Language.English]: "Inspirer",
      [Language.Russian]: "Вдохновитель",
    },
    description: {
      [Language.Persian]:
        "فعالان پرشور، خلاق و اجتماعی هستند. آنها مشتاق، خودجوش و توانایی ایجاد ارتباطات عمیق و معنادار با دیگران را دارند.",
      [Language.English]:
        "Campaigners are passionate, creative and social. They are enthusiastic, spontaneous and have the ability to form deep and meaningful connections with others.",
      [Language.Russian]:
        "Активисты страстны, креативны и общительны. Они энтузиасты, спонтанны и обладают способностью формировать глубокие и значимые связи с другими.",
    },
  },
  [MBTIType.ISTJ]: {
    name: {
      [Language.Persian]: "بازرس (ISTJ)",
      [Language.English]: "Logistician (ISTJ)",
      [Language.Russian]: "Логист (ISTJ)",
    },
    nickname: {
      [Language.Persian]: "وظیفه‌شناس",
      [Language.English]: "Dutiful",
      [Language.Russian]: "Должностной",
    },
    description: {
      [Language.Persian]:
        "بازرسان منطقی، عملی و قابل اعتماد هستند. آنها سازمان‌یافته، دقیق و متعهد به انجام وظایف خود با بالاترین استانداردها هستند.",
      [Language.English]:
        "Logisticians are logical, practical and reliable. They are organized, precise and committed to performing their duties to the highest standards.",
      [Language.Russian]:
        "Логисты логичны, практичны и надежны. Они организованы, точны и привержены выполнению своих обязанностей по высочайшим стандартам.",
    },
  },
  [MBTIType.ISFJ]: {
    name: {
      [Language.Persian]: "مدافع (ISFJ)",
      [Language.English]: "Defender (ISFJ)",
      [Language.Russian]: "Защитник (ISFJ)",
    },
    nickname: {
      [Language.Persian]: "حامی",
      [Language.English]: "Supporter",
      [Language.Russian]: "Поддерживающий",
    },
    description: {
      [Language.Persian]:
        "مدافعان فداکار و صبور هستند و همیشه آماده محافظت از عزیزانشان. آنها مسئولیت‌پذیر، دقیق و دارای حس قوی وظیفه هستند.",
      [Language.English]:
        "Defenders are devoted and patient and always ready to protect their loved ones. They are responsible, precise and have a strong sense of duty.",
      [Language.Russian]:
        "Защитники преданы и терпеливы, всегда готовы защищать своих близких. Они ответственны, точны и имеют сильное чувство долга.",
    },
  },
  [MBTIType.ESTJ]: {
    name: {
      [Language.Persian]: "مدیر (ESTJ)",
      [Language.English]: "Executive (ESTJ)",
      [Language.Russian]: "Исполнитель (ESTJ)",
    },
    nickname: {
      [Language.Persian]: "سرپرست",
      [Language.English]: "Supervisor",
      [Language.Russian]: "Надзиратель",
    },
    description: {
      [Language.Persian]:
        "مدیران سازمان‌دهنده و عملی هستند که اجرای نظم و قانون را برعهده می‌گیرند. آنها کارآمد، صادق و متعهد به قوانین و سنت‌های اجتماعی هستند.",
      [Language.English]:
        "Executives are organizing and practical who take on the enforcement of order and law. They are efficient, honest and committed to social rules and traditions.",
      [Language.Russian]:
        "Исполнители организуют и практичны, берут на себя обеспечение порядка и закона. Они эффективны, честны и привержены социальным правилам и традициям.",
    },
  },
  [MBTIType.ESFJ]: {
    name: {
      [Language.Persian]: "کنسول (ESFJ)",
      [Language.English]: "Consul (ESFJ)",
      [Language.Russian]: "Консул (ESFJ)",
    },
    nickname: {
      [Language.Persian]: "میزبان",
      [Language.English]: "Host",
      [Language.Russian]: "Хозяин",
    },
    description: {
      [Language.Persian]:
        "کنسول‌ها اجتماعی، محبوب و همیشه مشتاق کمک به دیگران هستند. آنها همدل، وظیفه‌شناس و توانایی ایجاد هماهنگی و همکاری در گروه را دارند.",
      [Language.English]:
        "Consuls are social, popular and always eager to help others. They are empathetic, dutiful and have the ability to create harmony and cooperation in groups.",
      [Language.Russian]:
        "Консулы общительны, популярны и всегда стремятся помочь другим. Они эмпатичны, долгосрочны и обладают способностью создавать гармонию и сотрудничество в группах.",
    },
  },
  [MBTIType.ISTP]: {
    name: {
      [Language.Persian]: "استاد (ISTP)",
      [Language.English]: "Virtuoso (ISTP)",
      [Language.Russian]: "Виртуоз (ISTP)",
    },
    nickname: {
      [Language.Persian]: "تحلیلگر",
      [Language.English]: "Analyst",
      [Language.Russian]: "Аналитик",
    },
    description: {
      [Language.Persian]:
        "استادان عملی و مشاهده‌گر هستند و از آزمایش و تجربه لذت می‌برند. آنها منطقی، خونسرد و توانایی حل سریع مشکلات عملی را دارند.",
      [Language.English]:
        "Virtuosos are practical and observant and enjoy experimentation and experience. They are logical, calm and have the ability to quickly solve practical problems.",
      [Language.Russian]:
        "Виртуозы практичны и наблюдательны, наслаждаются экспериментированием и опытом. Они логичны, спокойны и обладают способностью быстро решать практические проблемы.",
    },
  },
  [MBTIType.ISFP]: {
    name: {
      [Language.Persian]: "ماجراجو (ISFP)",
      [Language.English]: "Adventurer (ISFP)",
      [Language.Russian]: "Авантюрист (ISFP)",
    },
    nickname: {
      [Language.Persian]: "هنرمند",
      [Language.English]: "Artist",
      [Language.Russian]: "Художник",
    },
    description: {
      [Language.Persian]:
        "ماجراجویان خلاق و هنری هستند و از تجربه‌های جدید لذت می‌برند. آنها منعطف، حساس و دارای حس زیبایی‌شناسی قوی هستند.",
      [Language.English]:
        "Adventurers are creative and artistic and enjoy new experiences. They are flexible, sensitive and have a strong aesthetic sense.",
      [Language.Russian]:
        "Авантюристы креативны и артистичны, наслаждаются новым опытом. Они гибки, чувствительны и имеют сильное эстетическое чувство.",
    },
  },
  [MBTIType.ESTP]: {
    name: {
      [Language.Persian]: "کارآفرین (ESTP)",
      [Language.English]: "Entrepreneur (ESTP)",
      [Language.Russian]: "Предприниматель (ESTP)",
    },
    nickname: {
      [Language.Persian]: "انرژیک",
      [Language.English]: "Energetic",
      [Language.Russian]: "Энергичный",
    },
    description: {
      [Language.Persian]:
        "کارآفرینان پرانرژی و واقع‌گرا هستند و از زندگی در لحظه لذت می‌برند. آنها خطرپذیر، عملی و توانایی سازگاری سریع با شرایط جدید را دارند.",
      [Language.English]:
        "Entrepreneurs are energetic and realistic and enjoy living in the moment. They are risk-takers, practical and have the ability to quickly adapt to new situations.",
      [Language.Russian]:
        "Предприниматели энергичны и реалистичны, наслаждаются жизнью в моменте. Они рисковые, практичны и обладают способностью быстро адаптироваться к новым ситуациям.",
    },
  },
  [MBTIType.ESFP]: {
    name: {
      [Language.Persian]: "سرگرمی‌ساز (ESFP)",
      [Language.English]: "Entertainer (ESFP)",
      [Language.Russian]: "Развлекатель (ESFP)",
    },
    nickname: {
      [Language.Persian]: "تفریح‌کننده",
      [Language.English]: "Entertainer",
      [Language.Russian]: "Развлекатель",
    },
    description: {
      [Language.Persian]:
        "سرگرمی‌سازان خودجوش و پرشور هستند و عاشق سرگرم کردن دیگران. آنها اجتماعی، شاد و توانایی لذت بردن از لحظه حال را دارند.",
      [Language.English]:
        "Entertainers are spontaneous and passionate and love to entertain others. They are social, cheerful and have the ability to enjoy the present moment.",
      [Language.Russian]:
        "Развлекатели спонтанны и страстны, любят развлекать других. Они общительны, веселы и обладают способностью наслаждаться настоящим моментом.",
    },
  },
};

export default personalities;
