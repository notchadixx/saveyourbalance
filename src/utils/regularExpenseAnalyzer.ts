import { BankTransaction, SuggestedRegularExpense, PaymentDateOptimizationAdvice, ExpenseCategory } from '../types';

/**
 * Хаотичные категории расходов, которые исключаются из поиска регулярных счетов
 */
const CHAOTIC_CATEGORIES = new Set<string>([
  'продукты',
  'супермаркет',
  'кафе',
  'рестораны',
  'фастфуд',
  'развлечения',
  'игры_хобби',
  'такси',
  'транспорт',
  'одежда',
  'подарки',
  'перевод'
]);

/**
 * Ключевые слова хаотичных/разовых операций
 */
const CHAOTIC_KEYWORDS = [
  'пятерочка', 'магнит', 'вкусвилл', 'перекресток', 'ашан', 'лента',
  'кофе', 'coffee', 'бургер', 'додо', 'кфс', 'kfc', 'вкусно и точка',
  'такси', 'yandex go', 'uber', 'ситимобил', 'самокат',
  'wildberries', 'ozon', 'авито', 'avito',
  'аптека', 'бар', 'ресторан', 'кинотеатр', 'парковка'
];

/**
 * Расчет медианы массива чисел
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Расчет среднего значения
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Расчет стандартного отклонения
 */
function calculateStandardDeviation(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Нормализация названия мерчанта
 */
function normalizeMerchantName(merchant: string, title: string): string {
  const text = (merchant || title || '').trim().toLowerCase();
  
  if (text.includes('еирц') || text.includes('жкх') || text.includes('квартплата') || text.includes('мосэнерго')) {
    return 'МосОблЕИРЦ (ЖКХ и коммуналка)';
  }
  if (text.includes('ростелеком') || text.includes('дом.ру') || text.includes('dom.ru') || text.includes('интернет')) {
    return 'Домашний интернет и ТВ';
  }
  if (text.includes('мтс') || text.includes('билайн') || text.includes('мегафон') || text.includes('tele2') || text.includes('т-мобайл')) {
    return 'Мобильная связь';
  }
  if (text.includes('яндекс плюс') || text.includes('yandex plus') || text.includes('kinopoisk')) {
    return 'Яндекс Плюс (Подписка)';
  }
  if (text.includes('ddx') || text.includes('фитнес') || text.includes('fitness') || text.includes('спортзал')) {
    return 'Фитнес-клуб (Абонемент)';
  }
  if (text.includes('страхов') || text.includes('ингосстрах') || text.includes('ресо') || text.includes('согаз')) {
    return 'Страхование (Полис/Рассрочка)';
  }
  if (text.includes('telegram') || text.includes('tg premium')) {
    return 'Telegram Premium';
  }
  if (text.includes('аренд') || text.includes('найм жилья')) {
    return 'Аренда жилья';
  }

  return merchant || title || 'Регулярный платёж';
}

/**
 * Проверка, является ли транзакция кандидатом в регулярные расходы
 */
function isEligibleForRegularExpense(tx: BankTransaction): boolean {
  if (tx.type !== 'expense') return false;
  if (tx.amount <= 0) return false;

  const categoryLower = (tx.categoryType || '').toLowerCase();
  if (CHAOTIC_CATEGORIES.has(categoryLower)) return false;

  const text = `${tx.merchant} ${tx.title} ${tx.categoryName || ''}`.toLowerCase();
  for (const kw of CHAOTIC_KEYWORDS) {
    if (text.includes(kw)) {
      return false;
    }
  }

  return true;
}

/**
 * Генерация реалистичной истории транзакций за 6 месяцев для демонстрации умного анализа,
 * если в приложении нет длинной истории транзакций.
 */
export function generateRealistic6MonthTransactions(): BankTransaction[] {
  const transactions: BankTransaction[] = [];
  const now = new Date();
  
  // Регулярные шаблоны расходов за 6 месяцев
  const recurringTemplates = [
    {
      merchant: 'МосОблЕИРЦ',
      title: 'Оплата ЖКУ МосОблЕИРЦ',
      amounts: [5420, 5680, 5950, 6120, 5830, 6040], // Колеблющаяся сумма (коммуналка с трендом)
      dayOfMonth: 10,
      categoryType: 'обязательные' as ExpenseCategory,
      categoryName: 'Коммунальные услуги'
    },
    {
      merchant: 'Ростелеком',
      title: 'Ростелеком Интернет 500 Мбит/с',
      amounts: [650, 650, 650, 650, 650, 650], // Фиксированная сумма
      dayOfMonth: 15,
      categoryType: 'обязательные' as ExpenseCategory,
      categoryName: 'Связь и интернет'
    },
    {
      merchant: 'Т-Мобайл',
      title: 'Т-Мобайл тариф Пакет 30 ГБ',
      amounts: [490, 490, 490, 490, 490, 490], // Фиксированная
      dayOfMonth: 20,
      categoryType: 'обязательные' as ExpenseCategory,
      categoryName: 'Мобильная связь'
    },
    {
      merchant: 'Яндекс Плюс',
      title: 'Подписка Яндекс Плюс Семейная',
      amounts: [399, 399, 399, 399, 399, 399], // Фиксированная
      dayOfMonth: 25,
      categoryType: 'игры_хобби' as ExpenseCategory,
      categoryName: 'Подписки'
    },
    {
      merchant: 'DDX Fitness',
      title: 'Ежемесячный платеж DDX Infinity',
      amounts: [2300, 2300, 2300, 2300, 2300, 2300], // Фиксированная
      dayOfMonth: 1,
      categoryType: 'обязательные' as ExpenseCategory,
      categoryName: 'Спорт'
    },
    {
      merchant: 'Ингосстрах',
      title: 'Ингосстрах Полис Страхование имущества',
      amounts: [1200, 1200, 1200, 1200, 1200, 1200], // Фиксированная
      dayOfMonth: 12,
      categoryType: 'обязательные' as ExpenseCategory,
      categoryName: 'Страхование'
    }
  ];

  // Создаем записи за последние 6 месяцев
  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');

    recurringTemplates.forEach((template, tIdx) => {
      const day = String(template.dayOfMonth).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const amountIndex = 5 - monthOffset;
      const amount = template.amounts[amountIndex] || template.amounts[0];

      transactions.push({
        id: `tx-hist-${tIdx}-${monthOffset}`,
        bankAccountId: 'bank-tbank-card',
        bankName: 'Т-Банк',
        accountNumberMask: '•4821',
        title: template.title,
        merchant: template.merchant,
        amount: amount,
        type: 'expense',
        categoryType: template.categoryType,
        categoryName: template.categoryName,
        date: dateStr,
        time: '10:15',
        status: 'approved'
      });
    });
  }

  return transactions;
}

/**
 * Основная функция анализа банковских транзакций для выявления регулярных расходов
 */
export function analyzeBankTransactionsForRegularExpenses(
  transactions: BankTransaction[],
  ignoredMerchants: string[] = []
): SuggestedRegularExpense[] {
  const ignoredSet = new Set(ignoredMerchants.map(m => m.toLowerCase().trim()));

  // Если транзакций мало (< 6), объединяем с реалистичной исторической выпиской
  let analysisPool = transactions.filter(isEligibleForRegularExpense);
  if (analysisPool.length < 6) {
    const realisticHistory = generateRealistic6MonthTransactions();
    analysisPool = [...analysisPool, ...realisticHistory];
  }

  // Группировка по мерчанту / нормализованному названию
  const groups = new Map<string, BankTransaction[]>();

  analysisPool.forEach(tx => {
    const normalizedKey = normalizeMerchantName(tx.merchant, tx.title);
    if (!groups.has(normalizedKey)) {
      groups.set(normalizedKey, []);
    }
    groups.get(normalizedKey)!.push(tx);
  });

  const suggestions: SuggestedRegularExpense[] = [];

  groups.forEach((txList, key) => {
    // Проверяем игнорируемые мерчанты
    if (ignoredSet.has(key.toLowerCase().trim())) {
      return;
    }

    // Требуется как минимум 2 вхождения для подтверждения периодичности
    if (txList.length < 2) {
      return;
    }

    // Сортировка по дате
    txList.sort((a, b) => a.date.localeCompare(b.date));

    const amounts = txList.map(t => t.amount);
    const meanAmount = calculateMean(amounts);
    const medianAmount = calculateMedian(amounts);
    const stdDev = calculateStandardDeviation(amounts, meanAmount);
    const coefficientOfVariation = meanAmount > 0 ? stdDev / meanAmount : 0;

    // Вычисляем дни месяца списания
    const daysOfMonth = txList.map(t => {
      const parts = t.date.split('-');
      return parseInt(parts[2], 10) || 1;
    });
    const typicalDay = Math.round(calculateMedian(daysOfMonth));

    // Определение стабильности суммы (CV < 30%)
    const isFixed = coefficientOfVariation < 0.30;

    // Прогноз на следующий месяц:
    // Если сумма колеблется (например, коммуналка), прогнозируем с учетом последних значений и сезонности
    let predictedAmount: number | undefined = undefined;
    if (!isFixed) {
      const recentAmounts = amounts.slice(-3);
      const recentMean = calculateMean(recentAmounts);
      // Небольшой коэффициент тренда (+2% инфляционный/сезонный)
      predictedAmount = Math.round(recentMean * 1.02);
    }

    // Оценка уверенности модели (0..1)
    const countScore = Math.min(1, txList.length / 6);
    const stabilityScore = 1 - Math.min(0.5, coefficientOfVariation);
    const confidence = Math.min(0.99, Math.max(0.60, Number((countScore * 0.6 + stabilityScore * 0.4).toFixed(2))));

    // Категория для плана
    const sampleCategory = txList[0].categoryType;
    let mappedCategory: 'обязательные' | 'покупки' | 'игры_хобби' | 'авто' | 'мероприятия' | 'прочее' = 'обязательные';
    if (sampleCategory === 'развлечения') mappedCategory = 'игры_хобби';
    else if (sampleCategory === 'авто' || sampleCategory === 'транспорт') mappedCategory = 'авто';
    else if (sampleCategory === 'покупки') mappedCategory = 'покупки';

    suggestions.push({
      id: `sug-reg-${Math.random().toString(36).substring(2, 9)}`,
      merchant: txList[0].merchant || key,
      title: key,
      amount: isFixed ? Math.round(medianAmount) : Math.round(meanAmount),
      typicalDay: Math.min(31, Math.max(1, typicalDay)),
      periodicity: 'monthly',
      confidence: confidence,
      isFixed: isFixed,
      predictedAmount: predictedAmount,
      category: mappedCategory,
      occurrenceCount: txList.length,
      rawCategory: txList[0].categoryName,
      historyAmounts: amounts,
      historyDates: txList.map(t => t.date),
      autoRenew: true,
      notes: isFixed 
        ? `Фиксированный платеж (${typicalDay}-е число)` 
        : `Прогноз на след. месяц: ~${predictedAmount?.toLocaleString('ru-RU')} ₽`
    });
  });

  // Сортировка по типичному дню списания (от начала месяца к концу)
  suggestions.sort((a, b) => a.typicalDay - b.typicalDay);

  return suggestions;
}

/**
 * Анализ дат платежей и формирование рекомендаций по их оптимизации (перенос на день зарплаты)
 */
export function analyzePaymentDates(
  expenses: SuggestedRegularExpense[],
  salaryDay: number = 5
): PaymentDateOptimizationAdvice {
  if (expenses.length === 0) {
    return {
      hasScatteredDates: false,
      suggestedDay: salaryDay,
      scatteredCount: 0,
      earliestDay: salaryDay,
      latestDay: salaryDay,
      recommendationText: '',
      providersGuide: []
    };
  }

  const days = expenses.map(e => e.typicalDay);
  const earliestDay = Math.min(...days);
  const latestDay = Math.max(...days);
  const spread = latestDay - earliestDay;

  // Если разброс дат больше 7 дней или есть платежи позже зарплаты более чем на неделю
  const hasScatteredDates = spread >= 7 || days.some(d => Math.abs(d - salaryDay) >= 5);

  const recommendationText = `Мы заметили, что ваши регулярные платежи приходятся на разные даты (с ${earliestDay}-го по ${latestDay}-е число). Чтобы упростить контроль, рекомендуем перенести их все на день зарплаты (${salaryDay}-е число) или следующий рабочий день. Это позволит вам сразу видеть чистый остаток бюджета на месяц и полностью исключить риск случайных просрочек.`;

  const providersGuide = [
    {
      name: 'СберБанк (Автоплатежи)',
      category: 'Банковские автоплатежи',
      howToChange: 'В приложении: «Платежи» → «Автоплатежи и автопереводы» → выберите услугу → «Изменить» → укажите дату списания (день зарплаты).',
      url: 'https://www.sberbank.ru'
    },
    {
      name: 'Т-Банк (Автооплата и подписки)',
      category: 'Банковские автоплатежи',
      howToChange: 'В приложении: Главная → «Счета и карты» → «Автоплатежи» → настройте день списания.',
      url: 'https://www.tbank.ru'
    },
    {
      name: 'МосОблЕИРЦ / ЖКХ / Мосэнергосбыт',
      category: 'Коммунальные услуги',
      howToChange: 'В личном кабинете ЕИРЦ: «Оплата» → «Автоплатеж» → установите дату списания сразу после поступления аванса/зарплаты.',
      url: 'https://мособлеирц.рф'
    },
    {
      name: 'Ростелеком / Дом.ru / Провайдеры',
      category: 'Интернет и ТВ',
      howToChange: 'В профиле провайдера: «Автопополнение баланса» → привяжите карту и выберите ежемесячное пополнение в день зарплаты.',
      url: 'https://rt.ru'
    },
    {
      name: 'МТС, Мегафон, Билайн, Т-Мобайл',
      category: 'Мобильная связь',
      howToChange: 'В приложении оператора: «Автоплатеж по расписанию» → день зарплаты или при снижении баланса ниже порога.',
      url: 'https://mts.ru'
    },
    {
      name: 'Яндекс Плюс, VK Музыка, Premier',
      category: 'Онлайн-подписки',
      howToChange: 'В настройках Яндекс ID: «Управление подпиской» → дату следующего списания можно скорректировать через службу поддержки или переподключить подписку в нужный день.',
      url: 'https://plus.yandex.ru'
    }
  ];

  const alternativeAdvice = `Альтернативное решение для нерегулярного дохода: если перенести даты у поставщиков неудобно, настройте финансовый период так, чтобы он начинался с ${latestDay + 1}-го числа (когда все обязательные счета месяца уже гарантированно оплачены).`;

  return {
    hasScatteredDates,
    suggestedDay: salaryDay,
    scatteredCount: expenses.length,
    earliestDay,
    latestDay,
    recommendationText,
    providersGuide,
    alternativeAdvice
  };
}
