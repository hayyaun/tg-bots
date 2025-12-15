import { Language } from "../../shared/types";
import { ResultType } from "./types";

interface IStyle {
  name: { [key in Language]: string };
  emoji: string;
  description: { [key in Language]: string };
  traits: { [key in Language]: string[] };
}

const styles: { [k: string]: IStyle } = {
  [ResultType.StrongLeft]: {
    name: {
      [Language.Persian]: "تحلیلگر قوی",
      [Language.English]: "Strong Analyst",
      [Language.Russian]: "Сильный аналитик",
      [Language.Arabic]: "محلل قوي",
    },
    emoji: "🧮",
    description: {
      [Language.Persian]:
        "شما یک فرد کاملاً تحلیلی و منطقی هستید. قدرت شما در تفکر منظم، دقت در جزئیات و حل مسائل پیچیده به صورت گام‌به‌گام است.",
      [Language.English]:
        "You are a completely analytical and logical person. Your strength lies in systematic thinking, attention to detail and solving complex problems step by step.",
      [Language.Russian]:
        "Вы полностью аналитический и логичный человек. Ваша сила в систематическом мышлении, внимании к деталям и решении сложных проблем пошагово.",
      [Language.Arabic]:
        "أنت شخص تحليلي ومنطقي تماما. قوتك تكمن في التفكير المنهجي والاهتمام بالتفاصيل وحل المشاكل المعقدة خطوة بخطوة.",
    },
    traits: {
      [Language.Persian]: [
        "📊 تفکر منطقی و تحلیلی قوی",
        "🔢 مهارت بالا در ریاضیات و علوم دقیق",
        "📝 سازماندهی و برنامه‌ریزی دقیق",
        "🎯 توجه به جزئیات و حقایق",
        "📖 پردازش کلامی و زبانی قوی",
      ],
      [Language.English]: [
        "📊 Strong logical and analytical thinking",
        "🔢 High skill in mathematics and exact sciences",
        "📝 Precise organization and planning",
        "🎯 Attention to details and facts",
        "📖 Strong verbal and linguistic processing",
      ],
      [Language.Russian]: [
        "📊 Сильное логическое и аналитическое мышление",
        "🔢 Высокий навык в математике и точных науках",
        "📝 Точная организация и планирование",
        "🎯 Внимание к деталям и фактам",
        "📖 Сильная вербальная и языковая обработка",
      ],
      [Language.Arabic]: [
        "📊 تفكير منطقي وتحليلي قوي",
        "🔢 مهارة عالية في الرياضيات والعلوم الدقيقة",
        "📝 تنظيم وتخطيط دقيق",
        "🎯 اهتمام بالتفاصيل والحقائق",
        "📖 معالجة لفظية ولغوية قوية",
      ],
    },
  },
  [ResultType.Left]: {
    name: {
      [Language.Persian]: "تحلیلگر",
      [Language.English]: "Analyst",
      [Language.Russian]: "Аналитик",
      [Language.Arabic]: "محلل",
    },
    emoji: "📐",
    description: {
      [Language.Persian]:
        "شما تمایل قوی به تفکر منطقی و تحلیلی دارید. ترجیح می‌دهید مسائل را به صورت منظم و گام‌به‌گام حل کنید، اما توانایی استفاده از خلاقیت را نیز دارید.",
      [Language.English]:
        "You have a strong tendency toward logical and analytical thinking. You prefer to solve problems systematically and step by step, but you also have the ability to use creativity.",
      [Language.Russian]:
        "У вас сильная склонность к логическому и аналитическому мышлению. Вы предпочитаете решать проблемы систематически и пошагово, но также обладаете способностью использовать творчество.",
      [Language.Arabic]:
        "لديك ميل قوي نحو التفكير المنطقي والتحليلي. تفضل حل المشاكل بشكل منهجي وخطوة بخطوة، ولكن لديك أيضا القدرة على استخدام الإبداع.",
    },
    traits: {
      [Language.Persian]: [
        "🧠 تفکر منطقی و منظم",
        "📋 برنامه‌ریزی و سازماندهی",
        "🔍 دقت در جزئیات",
        "💭 توانایی تحلیل مسائل پیچیده",
        "🎨 انعطاف در استفاده از خلاقیت",
      ],
      [Language.English]: [
        "🧠 Logical and systematic thinking",
        "📋 Planning and organization",
        "🔍 Attention to detail",
        "💭 Ability to analyze complex problems",
        "🎨 Flexibility in using creativity",
      ],
      [Language.Russian]: [
        "🧠 Логическое и систематическое мышление",
        "📋 Планирование и организация",
        "🔍 Внимание к деталям",
        "💭 Способность анализировать сложные проблемы",
        "🎨 Гибкость в использовании творчества",
      ],
      [Language.Arabic]: [
        "🧠 تفكير منطقي ومنهجي",
        "📋 تخطيط وتنظيم",
        "🔍 اهتمام بالتفاصيل",
        "💭 القدرة على تحليل المشاكل المعقدة",
        "🎨 مرونة في استخدام الإبداع",
      ],
    },
  },
  [ResultType.Balanced]: {
    name: {
      [Language.Persian]: "متعادل",
      [Language.English]: "Balanced",
      [Language.Russian]: "Сбалансированный",
      [Language.Arabic]: "متوازن",
    },
    emoji: "⚖️",
    description: {
      [Language.Persian]:
        "شما تعادل عالی بین تفکر تحلیلی و خلاق دارید. می‌توانید هم به صورت منطقی و هم شهودی فکر کنید و از هر دو سبک شناختی بهره ببرید.",
      [Language.English]:
        "You have an excellent balance between analytical and creative thinking. You can think both logically and intuitively and benefit from both cognitive styles.",
      [Language.Russian]:
        "У вас отличный баланс между аналитическим и творческим мышлением. Вы можете думать как логически, так и интуитивно и извлекать пользу из обоих когнитивных стилей.",
      [Language.Arabic]:
        "لديك توازن ممتاز بين التفكير التحليلي والإبداعي. يمكنك التفكير بشكل منطقي وبديهي والاستفادة من كلا النمطين المعرفيين.",
    },
    traits: {
      [Language.Persian]: [
        "🔄 تعادل بین منطق و خلاقیت",
        "🌟 انعطاف‌پذیری شناختی بالا",
        "🎭 توانایی استفاده از هر دو سبک",
        "🧩 حل مسائل با رویکردهای متنوع",
        "🌈 دیدگاه جامع و همه‌جانبه",
      ],
      [Language.English]: [
        "🔄 Balance between logic and creativity",
        "🌟 High cognitive flexibility",
        "🎭 Ability to use both styles",
        "🧩 Solving problems with diverse approaches",
        "🌈 Comprehensive and holistic perspective",
      ],
      [Language.Russian]: [
        "🔄 Баланс между логикой и творчеством",
        "🌟 Высокая когнитивная гибкость",
        "🎭 Способность использовать оба стиля",
        "🧩 Решение проблем разнообразными подходами",
        "🌈 Комплексная и целостная перспектива",
      ],
      [Language.Arabic]: [
        "🔄 توازن بين المنطق والإبداع",
        "🌟 مرونة معرفية عالية",
        "🎭 القدرة على استخدام كلا الأسلوبين",
        "🧩 حل المشاكل بمناهج متنوعة",
        "🌈 منظور شامل وكلي",
      ],
    },
  },
  [ResultType.Right]: {
    name: {
      [Language.Persian]: "خلاق",
      [Language.English]: "Creative",
      [Language.Russian]: "Творческий",
      [Language.Arabic]: "مبدع",
    },
    emoji: "🎨",
    description: {
      [Language.Persian]:
        "شما تمایل قوی به تفکر خلاق و شهودی دارید. قدرت شما در دیدن تصویر کلی، تخیل و ترکیب ایده‌هاست، اما می‌توانید در صورت نیاز به صورت منطقی نیز فکر کنید.",
      [Language.English]:
        "You have a strong tendency toward creative and intuitive thinking. Your strength lies in seeing the big picture, imagination and combining ideas, but you can also think logically when needed.",
      [Language.Russian]:
        "У вас сильная склонность к творческому и интуитивному мышлению. Ваша сила в видении общей картины, воображении и комбинировании идей, но вы также можете думать логически, когда это необходимо.",
      [Language.Arabic]:
        "لديك ميل قوي نحو التفكير الإبداعي والبديهي. قوتك تكمن في رؤية الصورة الكبيرة والخيال والجمع بين الأفكار، ولكن يمكنك أيضا التفكير منطقيا عند الحاجة.",
    },
    traits: {
      [Language.Persian]: [
        "💡 خلاقیت و نوآوری",
        "🖼️ تفکر بصری-فضایی قوی",
        "🌐 دیدن تصویر کلی و الگوها",
        "🎭 تخیل و بینش شهودی",
        "🔧 انعطاف در استفاده از منطق",
      ],
      [Language.English]: [
        "💡 Creativity and innovation",
        "🖼️ Strong visual-spatial thinking",
        "🌐 Seeing the big picture and patterns",
        "🎭 Imagination and intuitive insight",
        "🔧 Flexibility in using logic",
      ],
      [Language.Russian]: [
        "💡 Творчество и инновации",
        "🖼️ Сильное визуально-пространственное мышление",
        "🌐 Видение общей картины и паттернов",
        "🎭 Воображение и интуитивное понимание",
        "🔧 Гибкость в использовании логики",
      ],
      [Language.Arabic]: [
        "💡 الإبداع والابتكار",
        "🖼️ تفكير بصري مكاني قوي",
        "🌐 رؤية الصورة الكبيرة والأنماط",
        "🎭 الخيال والبصيرة البديهية",
        "🔧 مرونة في استخدام المنطق",
      ],
    },
  },
  [ResultType.StrongRight]: {
    name: {
      [Language.Persian]: "خلاق قوی",
      [Language.English]: "Strong Creative",
      [Language.Russian]: "Сильный творческий",
      [Language.Arabic]: "مبدع قوي",
    },
    emoji: "🌟",
    description: {
      [Language.Persian]:
        "شما یک فرد کاملاً خلاق و شهودی هستید. قدرت شما در تخیل، دیدن روابط پنهان، هنر و تفکر غیرخطی است. شما به صورت طبیعی از الگوها و بینش استفاده می‌کنید.",
      [Language.English]:
        "You are a completely creative and intuitive person. Your strength lies in imagination, seeing hidden relationships, art and nonlinear thinking. You naturally use patterns and insights.",
      [Language.Russian]:
        "Вы полностью творческий и интуитивный человек. Ваша сила в воображении, видении скрытых отношений, искусстве и нелинейном мышлении. Вы естественно используете паттерны и озарения.",
      [Language.Arabic]:
        "أنت شخص مبدع وبديهي تماما. قوتك تكمن في الخيال ورؤية العلاقات الخفية والفن والتفكير غير الخطي. أنت تستخدم الأنماط والرؤى بشكل طبيعي.",
    },
    traits: {
      [Language.Persian]: [
        "🎨 خلاقیت و هنرمندی بالا",
        "🌈 تفکر غیرخطی و شهودی",
        "🎵 مهارت در هنرها و موسیقی",
        "🔮 بینش و درک کلی قوی",
        "🌍 تفکر فضایی-بصری عالی",
      ],
      [Language.English]: [
        "🎨 High creativity and artistry",
        "🌈 Nonlinear and intuitive thinking",
        "🎵 Skill in arts and music",
        "🔮 Strong insight and holistic understanding",
        "🌍 Excellent spatial-visual thinking",
      ],
      [Language.Russian]: [
        "🎨 Высокое творчество и артистизм",
        "🌈 Нелинейное и интуитивное мышление",
        "🎵 Навык в искусстве и музыке",
        "🔮 Сильное понимание и целостное понимание",
        "🌍 Отличное пространственно-визуальное мышление",
      ],
      [Language.Arabic]: [
        "🎨 إبداع وفنية عالية",
        "🌈 تفكير غير خطي وبديهي",
        "🎵 مهارة في الفنون والموسيقى",
        "🔮 بصيرة وفهم شامل قوي",
        "🌍 تفكير مكاني بصري ممتاز",
      ],
    },
  },
};

export default styles;
