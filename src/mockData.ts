import { 
  BudgetState, 
  DayRecord, 
  PlannedItem, 
  WishlistItem, 
  CushionMonthPlan, 
  MandatoryExpense,
  BankAccount,
  BankTransaction,
  IncomeItem
} from './types';
import { generatePeriodTemplateForMonth } from './utils/periodUtils';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentPeriodDates(baseSalaryDay: number = 5): { startDate: string; endDate: string; title: string } {
  // Default to August 2026 budget period template (05.08.2026 — 03.09.2026)
  const template = generatePeriodTemplateForMonth(2026, 8, baseSalaryDay, 20, '2026-08-26');
  return {
    startDate: template.startDateStr,
    endDate: template.endDateStr,
    title: template.formattedLabel,
  };
}

const INITIAL_PLANNED_ITEMS: PlannedItem[] = [
  { id: 'p1', title: 'Wildberries', amount: 6139.00, category: 'покупки', isPaid: true, notes: 'Одежда и бытовые мелочи', period: 'current' },
  { id: 'p2', title: 'OZON', amount: 1472.00, category: 'покупки', isPaid: true, notes: 'Заказ товаров для дома', period: 'current' },
  { id: 'p3', title: 'PS4', amount: 10000.00, category: 'игры_хобби', isPaid: true, notes: 'Игровая приставка', period: 'current' },
  { id: 'p4', title: 'It takes two', amount: 2950.00, category: 'игры_хобби', isPaid: true, notes: 'Кооперативная игра', period: 'current' },
  { id: 'p5', title: 'Геймпад', amount: 1250.00, category: 'игры_хобби', isPaid: true, notes: 'Дополнительный джойстик DualShock', period: 'current' },
  { id: 'p6', title: 'МФУ', amount: 14299.00, category: 'покупки', isPaid: true, notes: 'Принтер/сканер для дома', period: 'current' },
  { id: 'p7', title: 'Ростелеком', amount: 857.83, category: 'обязательные', isPaid: true, notes: 'Интернет + ТВ тариф', period: 'current' },
  { 
    id: 'p8', 
    title: 'Бенз', 
    amount: 18000.00, 
    spentAmount: 12000.00, 
    isProgressTracked: true, 
    category: 'авто', 
    isPaid: false, 
    period: 'current',
    notes: 'Топливо на расчетный период' 
  },
  { id: 'p9', title: 'DDX', amount: 1900.00, category: 'обязательные', isPaid: true, notes: 'Фитнес-клуб месячный абонемент', period: 'current' },
  { id: 'p10', title: 'Джоггеры зимние', amount: 3981.00, category: 'покупки', isPaid: true, notes: 'Теплая одежда на осень-зиму', period: 'current' },
  { id: 'p11', title: 'Полка навесная', amount: 4610.00, category: 'покупки', isPaid: true, notes: 'Мебель для комнаты', period: 'current' },
  { id: 'p12', title: 'Сход-развал', amount: 2000.00, category: 'авто', isPaid: true, notes: 'Техническое обслуживание подвески', period: 'current' },
  { id: 'p13', title: 'Наконечник рулевой тяги', amount: 1635.00, category: 'авто', isPaid: true, notes: 'Запчасть для автомобиля', period: 'current' },
  { id: 'p14', title: 'Новоселье (еда + напитки)', amount: 8147.04, category: 'мероприятия', isPaid: true, notes: 'Празднование новоселья с друзьями', period: 'current' },
  { id: 'p15', title: 'Подарок Соне', amount: 2500.00, category: 'мероприятия', isPaid: true, notes: 'Подарок на день рождения', period: 'current' },
  { id: 'p16', title: 'Корректировка', amount: 336.60, category: 'прочее', isPaid: true, notes: 'Банковские комиссии и округления', period: 'current' },
  { id: 'p17', title: 'Билеты на поезд', amount: 12782.00, category: 'мероприятия', isPaid: true, notes: 'Поездка туда и обратно', period: 'current' },
];

const INITIAL_WISHLIST: WishlistItem[] = [
  {
    id: 'w1',
    title: 'Смарт-часы Huawei',
    url: 'https://www.dns-shop.ru/product/3ef75bb05',
    marketplace: 'dns',
    price: 12799.00,
    isPurchased: false,
    priority: 'high',
    category: 'Гаджеты',
    notes: 'AMOLED дисплей, датчики пульса и сна',
  },
  {
    id: 'w2',
    title: 'Набор инструментов',
    url: 'https://www.dns-shop.ru/product/2a380f7a4',
    marketplace: 'dns',
    price: 9099.00,
    isPurchased: false,
    priority: 'medium',
    category: 'Инструменты',
    notes: 'Чемодан 94 предмета с трещотками',
  },
  {
    id: 'w3',
    title: 'Монитор',
    url: 'https://www.dns-shop.ru/product/7329627da',
    marketplace: 'dns',
    price: 12199.00,
    isPurchased: false,
    priority: 'high',
    category: 'Компьютеры',
    notes: '27 дюймов 144Hz IPS для рабочего стола',
  },
  {
    id: 'w4',
    title: 'Видеокарта',
    url: 'https://www.dns-shop.ru/product/5a2b97240',
    marketplace: 'dns',
    price: 77499.00,
    isPurchased: false,
    priority: 'high',
    category: 'Компьютеры',
    notes: 'RTX 4070 Ti 12GB для рендеринга и игр',
  },
  {
    id: 'w5',
    title: 'Кольцо помолвочное',
    url: 'https://sunlight.net/catalog/ring_380556.htm',
    marketplace: 'sunlight',
    price: 29460.00,
    isPurchased: false,
    priority: 'high',
    category: 'Ювелирные изделия',
    notes: 'Белое золото с бриллиантом',
  },
  {
    id: 'w6',
    title: 'Кольцо помолвочное (вариант 2)',
    url: 'https://sunlight.net/catalog/ring_408617.htm',
    marketplace: 'sunlight',
    price: 27193.00,
    isPurchased: false,
    priority: 'high',
    category: 'Ювелирные изделия',
    notes: 'Классическая огранка',
  },
  {
    id: 'w7',
    title: 'Клавиатура механика с NumPad (DNS)',
    url: 'https://www.dns-shop.ru/product/ed6ec83b9',
    marketplace: 'dns',
    price: 6399.00,
    isPurchased: false,
    priority: 'medium',
    category: 'Периферия',
    notes: 'Красные тихие переключатели Red Switches',
  },
  {
    id: 'w8',
    title: 'Клавиатура механика с NumPad (OZON)',
    url: 'https://ozon.ru/t/HqkMFcq',
    marketplace: 'ozon',
    articleId: '1768220048',
    price: 6033.00,
    isPurchased: false,
    priority: 'medium',
    category: 'Периферия',
    notes: 'Беспроводная 2.4G + Bluetooth',
  },
  {
    id: 'w9',
    title: 'Кронштейн для двух мониторов',
    url: 'https://www.ozon.ru/product/kronshteyn-dlya',
    marketplace: 'ozon',
    articleId: '2936983737',
    price: 2001.00,
    isPurchased: true,
    priority: 'medium',
    category: 'Рабочее место',
    notes: 'Газлифт регулировка по высоте',
  },
  {
    id: 'w10',
    title: 'Готический смокинг',
    url: 'https://www.wildberries.ru/catalog/9295270',
    marketplace: 'wildberries',
    articleId: '968420676',
    price: 2504.00,
    isPurchased: false,
    priority: 'low',
    category: 'Одежда',
    notes: 'Праздничный пиджак для фотосессии',
  },
  {
    id: 'w11',
    title: 'Мужские готические брюки с змейкой',
    url: 'https://www.wildberries.ru/catalog/1062011',
    marketplace: 'wildberries',
    articleId: '1062011646',
    price: 2156.00,
    isPurchased: false,
    priority: 'low',
    category: 'Одежда',
    notes: 'В комплекте к смокингу',
  },
  {
    id: 'w12',
    title: 'Туфли классические',
    url: 'https://ozon.ru/t/hi0RbwJ',
    marketplace: 'ozon',
    articleId: '5454376965',
    price: 3561.00,
    isPurchased: false,
    priority: 'medium',
    category: 'Обувь',
    notes: 'Натуральная кожа, черный цвет',
  },
];

const INITIAL_MANDATORY_EXPENSES: MandatoryExpense[] = [
  { id: 'm1', title: 'Ростелеком (интернет и связь)', amount: 845.00, category: 'Связь' },
  { id: 'm2', title: 'Бензин', amount: 18000.00, category: 'Авто' },
  { id: 'm3', title: 'DDX Фитнес', amount: 1900.00, category: 'Спорт' },
  { id: 'm4', title: 'Прочее (питание, такси и т.д.)', amount: 33686.37, category: 'Жизнь' },
];

const RAW_DAILY_EXPENSES = [
  { date: '2026-08-01', dayNumber: 1, dayOfWeekShort: 'Сб', dayOfWeekFull: 'Суббота', spent: 350.00, items: [{ title: 'Кофе и выпечка', amount: 350.00, category: 'еда_вне_дома', catName: 'Кофейня' }] },
  { date: '2026-08-02', dayNumber: 2, dayOfWeekShort: 'Вс', dayOfWeekFull: 'Воскресенье', spent: 540.00, items: [{ title: 'Продукты на ужин', amount: 540.00, category: 'продукты', catName: 'Магнит' }] },
  { date: '2026-08-03', dayNumber: 3, dayOfWeekShort: 'Пн', dayOfWeekFull: 'Понедельник', spent: 210.00, items: [{ title: 'Столовая обед', amount: 210.00, category: 'еда_вне_дома', catName: 'Столовая' }] },
  { date: '2026-08-04', dayNumber: 4, dayOfWeekShort: 'Вт', dayOfWeekFull: 'Вторник', spent: 0.00, items: [] },
  { date: '2026-08-05', dayNumber: 5, dayOfWeekShort: 'Ср', dayOfWeekFull: 'Среда', spent: 0.00, items: [] },
  { date: '2026-08-06', dayNumber: 6, dayOfWeekShort: 'Чт', dayOfWeekFull: 'Четверг', spent: 199.00, items: [{ title: 'Кофе и перекус', amount: 199.00, category: 'еда_вне_дома', catName: 'Кофейня' }] },
  { date: '2026-08-07', dayNumber: 7, dayOfWeekShort: 'Пт', dayOfWeekFull: 'Пятница', spent: 155.00, items: [{ title: 'Продукты', amount: 155.00, category: 'продукты', catName: 'Магнит' }] },
  { date: '2026-08-08', dayNumber: 8, dayOfWeekShort: 'Сб', dayOfWeekFull: 'Суббота', spent: 847.98, items: [{ title: 'Супермаркет Пятерочка', amount: 847.98, category: 'продукты', catName: 'Пятерочка' }] },
  { date: '2026-08-09', dayNumber: 9, dayOfWeekShort: 'Вс', dayOfWeekFull: 'Воскресенье', spent: 666.00, items: [{ title: 'Аптека и быт', amount: 666.00, category: 'здоровье', catName: 'Аптека' }] },
  { date: '2026-08-10', dayNumber: 10, dayOfWeekShort: 'Пн', dayOfWeekFull: 'Понедельник', spent: 301.98, items: [{ title: 'Магнит у дома', amount: 301.98, category: 'продукты', catName: 'Магнит' }] },
  { date: '2026-08-11', dayNumber: 11, dayOfWeekShort: 'Вт', dayOfWeekFull: 'Вторник', spent: 155.00, items: [{ title: 'Кофе с собой', amount: 155.00, category: 'еда_вне_дома', catName: 'Surf Coffee' }] },
  { date: '2026-08-12', dayNumber: 12, dayOfWeekShort: 'Ср', dayOfWeekFull: 'Среда', spent: 812.62, items: [{ title: 'Перекресток продукты', amount: 812.62, category: 'продукты', catName: 'Перекресток' }] },
  { date: '2026-08-13', dayNumber: 13, dayOfWeekShort: 'Чт', dayOfWeekFull: 'Четверг', spent: 560.88, items: [{ title: 'Бизнес-ланч', amount: 560.88, category: 'еда_вне_дома', catName: 'Кафе' }] },
  { date: '2026-08-14', dayNumber: 14, dayOfWeekShort: 'Пт', dayOfWeekFull: 'Пятница', spent: 155.00, items: [{ title: 'Магнит продукты', amount: 155.00, category: 'продукты', catName: 'Магнит' }] },
  { date: '2026-08-15', dayNumber: 15, dayOfWeekShort: 'Сб', dayOfWeekFull: 'Суббота', spent: 1285.00, items: [{ title: 'Ужин с друзьями', amount: 1285.00, category: 'развлечения', catName: 'Ресторан' }] },
  { date: '2026-08-16', dayNumber: 16, dayOfWeekShort: 'Вс', dayOfWeekFull: 'Воскресенье', spent: 100.00, items: [{ title: 'Вода и снек', amount: 100.00, category: 'продукты', catName: 'Магазин' }] },
  { date: '2026-08-17', dayNumber: 17, dayOfWeekShort: 'Пн', dayOfWeekFull: 'Понедельник', spent: 305.00, items: [{ title: 'Обед', amount: 305.00, category: 'еда_вне_дома', catName: 'Столовая' }] },
  { date: '2026-08-18', dayNumber: 18, dayOfWeekShort: 'Вт', dayOfWeekFull: 'Вторник', spent: 155.00, items: [{ title: 'Магнит мелочи', amount: 155.00, category: 'продукты', catName: 'Магнит' }] },
  { date: '2026-08-19', dayNumber: 19, dayOfWeekShort: 'Ср', dayOfWeekFull: 'Среда', spent: 557.00, items: [{ title: 'Хозтовары', amount: 557.00, category: 'дом', catName: 'FixPrice' }] },
  { date: '2026-08-20', dayNumber: 20, dayOfWeekShort: 'Чт', dayOfWeekFull: 'Четверг', spent: 1015.00, items: [{ title: 'Супермаркет лента', amount: 1015.00, category: 'продукты', catName: 'Лента' }] },
  { date: '2026-08-21', dayNumber: 21, dayOfWeekShort: 'Пт', dayOfWeekFull: 'Пятница', spent: 1185.00, items: [{ title: 'Заказ пиццы', amount: 1185.00, category: 'еда_вне_дома', catName: 'Додо Пицца' }] },
  { date: '2026-08-22', dayNumber: 22, dayOfWeekShort: 'Сб', dayOfWeekFull: 'Суббота', spent: 1645.00, items: [{ title: 'Кино и попкорн', amount: 1645.00, category: 'развлечения', catName: 'Киномакс' }] },
  { date: '2026-08-23', dayNumber: 23, dayOfWeekShort: 'Вс', dayOfWeekFull: 'Воскресенье', spent: 852.97, items: [{ title: 'Продукты на неделю', amount: 852.97, category: 'продукты', catName: 'Магнит' }] },
  { date: '2026-08-24', dayNumber: 24, dayOfWeekShort: 'Пн', dayOfWeekFull: 'Понедельник', spent: 533.00, items: [{ title: 'Ланч и кофе', amount: 533.00, category: 'еда_вне_дома', catName: 'Кафе' }] },
  { date: '2026-08-25', dayNumber: 25, dayOfWeekShort: 'Вт', dayOfWeekFull: 'Вторник', spent: 676.77, items: [{ title: 'Магнит продукты', amount: 676.77, category: 'продукты', catName: 'Магнит' }] },
  { 
    date: '2026-08-26', 
    dayNumber: 26, 
    dayOfWeekShort: 'Ср', 
    dayOfWeekFull: 'Среда', 
    spent: 450.00, 
    items: [
      { title: 'Обед в столовой', amount: 240.00, category: 'еда_вне_дома', catName: 'Столовая #1' },
      { title: 'Кофе капучино', amount: 155.00, category: 'еда_вне_дома', catName: 'Surf Coffee' },
      { title: 'Минеральная вода', amount: 55.00, category: 'продукты', catName: 'Магнит' },
    ] 
  },
  { 
    date: '2026-08-27', 
    dayNumber: 27, 
    dayOfWeekShort: 'Чт', 
    dayOfWeekFull: 'Четверг', 
    spent: 380.00, 
    items: [
      { title: 'Бизнес-ланч и напиток', amount: 380.00, category: 'еда_вне_дома', catName: 'Кафе' }
    ] 
  },
  { 
    date: '2026-08-28', 
    dayNumber: 28, 
    dayOfWeekShort: 'Пт', 
    dayOfWeekFull: 'Пятница', 
    spent: 1240.00, 
    items: [
      { title: 'Ужин и пицца', amount: 980.00, category: 'еда_вне_дома', catName: 'Додо Пицца' },
      { title: 'Кофе с собой', amount: 260.00, category: 'еда_вне_дома', catName: 'Surf Coffee' }
    ] 
  },
  { 
    date: '2026-08-29', 
    dayNumber: 29, 
    dayOfWeekShort: 'Сб', 
    dayOfWeekFull: 'Суббота', 
    spent: 890.00, 
    items: [
      { title: 'Супермаркет Пятерочка', amount: 890.00, category: 'продукты', catName: 'Пятерочка' }
    ] 
  },
  { 
    date: '2026-08-30', 
    dayNumber: 30, 
    dayOfWeekShort: 'Вс', 
    dayOfWeekFull: 'Воскресенье', 
    spent: 310.00, 
    items: [
      { title: 'Аптека витамины', amount: 310.00, category: 'здоровье', catName: 'Аптека Ригла' }
    ] 
  },
  { 
    date: '2026-08-31', 
    dayNumber: 31, 
    dayOfWeekShort: 'Пн', 
    dayOfWeekFull: 'Понедельник', 
    spent: 560.00, 
    items: [
      { title: 'Обед в столовой', amount: 360.00, category: 'еда_вне_дома', catName: 'Столовая' },
      { title: 'Магнит перекус', amount: 200.00, category: 'продукты', catName: 'Магнит' }
    ] 
  },
  { date: '2026-09-01', dayNumber: 1, dayOfWeekShort: 'Вт', dayOfWeekFull: 'Вторник', spent: 0.00, items: [] },
  { date: '2026-09-02', dayNumber: 2, dayOfWeekShort: 'Ср', dayOfWeekFull: 'Среда', spent: 0.00, items: [] },
  { date: '2026-09-03', dayNumber: 3, dayOfWeekShort: 'Чт', dayOfWeekFull: 'Четверг', spent: 0.00, items: [] },
  { date: '2026-09-04', dayNumber: 4, dayOfWeekShort: 'Пт', dayOfWeekFull: 'Пятница', spent: 0.00, items: [] },
];

export function buildInitialDays(): DayRecord[] {
  const normLimit = 1859.46;
  const today = getTodayDateString();
  let runningRemainder = 34665.22;
  let cumulativeAccumulated = 0;

  return RAW_DAILY_EXPENSES.map((raw) => {
    const isPast = raw.date < today;
    const isToday = raw.date === today;
    const isPastOrToday = raw.date <= today;
    const deviation = normLimit - raw.spent;
    
    if (isPastOrToday) {
      cumulativeAccumulated += deviation;
      runningRemainder -= raw.spent;
    }

    // Recorded expenses for dates with spend
    const expensesList = raw.items.map((item, itemIdx) => ({
      id: `exp-${raw.date}-${itemIdx}`,
      title: item.title,
      amount: item.amount,
      category: item.catName,
      categoryType: item.category as any,
      time: itemIdx === 0 ? '13:20' : itemIdx === 1 ? '15:45' : '17:30',
      isConfirmed: true,
    }));

    return {
      date: raw.date,
      dayNumber: raw.dayNumber,
      dayOfWeekShort: raw.dayOfWeekShort,
      dayOfWeekFull: raw.dayOfWeekFull,
      expenses: raw.items.length > 0 ? expensesList : [],
      spent: raw.spent,
      normLimit: normLimit,
      deviation: deviation,
      budgetRemainingOnDate: Math.max(0, cumulativeAccumulated),
      totalRemaining: isPastOrToday ? runningRemainder : 0,
      isToday,
      isPast,
    };
  });
}

export function buildCushionSchedule(
  currentSalary: number = 82650.00,
  isDepositMade: boolean = true,
  actualDepositAmount: number = 8265.00,
  bankAccumulated: number = 8269.53,
  startMonth: number = 8,
  startYear: number = 2026,
  normMode: 'percent' | 'fixed' = 'percent',
  normPercent: number = 10,
  normFixedAmount: number = 8265.00
): CushionMonthPlan[] {
  const schedule: CushionMonthPlan[] = [];
  const monthlyNorm = normMode === 'fixed' 
    ? normFixedAmount 
    : Math.round(currentSalary * (normPercent / 100) * 100) / 100;

  const allMonths = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  // Month 0 (August 2026) target:
  // If deposit made: target = actualDepositAmount (includes difference from norm)
  // If deposit not made: target = monthlyNorm
  const targetMonth0 = isDepositMade ? actualDepositAmount : monthlyNorm;

  let currentY = startYear;
  let currentM = startMonth;
  let runningTarget = targetMonth0;

  const TOTAL_MONTHS = 48; // 4 years projection

  for (let i = 0; i < TOTAL_MONTHS; i++) {
    const monthName = allMonths[currentM - 1];

    if (i === 0) {
      // Current month (August 2026): filled because contribution is already deposited
      const depositThisMonth = isDepositMade ? actualDepositAmount : 0;
      const balanceThisMonth = isDepositMade ? bankAccumulated : 0;
      const capitalizationThisMonth = isDepositMade
        ? Math.max(0, Math.round((bankAccumulated - depositThisMonth) * 100) / 100) || 4.53
        : 0;
      const deviationThisMonth = isDepositMade
        ? Math.round((balanceThisMonth - targetMonth0) * 100) / 100
        : -targetMonth0;

      schedule.push({
        year: currentY,
        monthName,
        targetAccumulated: targetMonth0,
        monthlyDeposit: depositThisMonth,
        rateInfo: '13.5%',
        capitalization: capitalizationThisMonth,
        expense: 0,
        balance: balanceThisMonth,
        deviation: deviationThisMonth,
      });

      runningTarget = targetMonth0;
    } else {
      // Future months: Цель на период = Цель(предыдущего месяца) + норма от зарплаты (или фикс)
      runningTarget = Math.round((runningTarget + monthlyNorm) * 100) / 100;

      // Only "Цель на период" is filled for future rows; other columns remain empty/unfilled
      schedule.push({
        year: currentY,
        monthName,
        targetAccumulated: runningTarget,
        monthlyDeposit: 0,
        rateInfo: '—',
        capitalization: 0,
        expense: 0,
        balance: 0,
        deviation: 0,
      });
    }

    currentM++;
    if (currentM > 12) {
      currentM = 1;
      currentY++;
    }
  }

  return schedule;
}

// Initial Connected Banks
export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'bank-tbank-card',
    bankId: 'tbank',
    bankName: 'Т-Банк',
    accountType: 'checking',
    accountName: 'Black Дебетовая',
    accountNumberMask: '•4821',
    balance: 24810.00,
    lastSyncedAt: new Date().toISOString(),
    isConnected: true,
    color: '#fed838',
  },
  {
    id: 'bank-sber-card',
    bankId: 'sber',
    bankName: 'СберБанк',
    accountType: 'checking',
    accountName: 'СберКарта Основная',
    accountNumberMask: '•9022',
    balance: 6240.00,
    lastSyncedAt: new Date().toISOString(),
    isConnected: true,
    color: '#21a038',
  },
  {
    id: 'bank-alfa-savings',
    bankId: 'alfa',
    bankName: 'Альфа-Банк',
    accountType: 'savings',
    accountName: 'Альфа-Счет (Подушка 13.5%)',
    accountNumberMask: '•3312',
    balance: 8269.53,
    interestRate: 13.5,
    lastSyncedAt: new Date().toISOString(),
    isConnected: true,
    color: '#ef3124',
  },
];

// Initial Pending Ingested Bank Transactions for today's confirmation queue
export const INITIAL_PENDING_TRANSACTIONS: BankTransaction[] = [
  {
    id: 'tx-tb-1',
    bankAccountId: 'bank-tbank-card',
    bankName: 'Т-Банк',
    accountNumberMask: '•4821',
    title: 'ВкусВилл (Продукты и перекус)',
    merchant: 'ВкусВилл',
    amount: 640.00,
    type: 'expense',
    categoryType: 'продукты',
    categoryName: 'Супермаркет',
    date: getTodayDateString(),
    time: '14:15',
    status: 'pending',
    rawSnippet: 'Т-Банк. Покупка 640.00 ₽, ВкусВилл. Карта •4821',
  },
  {
    id: 'tx-tb-2',
    bankAccountId: 'bank-tbank-card',
    bankName: 'Т-Банк',
    accountNumberMask: '•4821',
    title: 'Яндекс Go (Такси в центр)',
    merchant: 'Яндекс Go',
    amount: 380.00,
    type: 'expense',
    categoryType: 'транспорт',
    categoryName: 'Такси',
    date: getTodayDateString(),
    time: '16:40',
    status: 'pending',
    rawSnippet: 'Т-Банк. Покупка 380.00 ₽, Yandex Go. Карта •4821',
  },
  {
    id: 'tx-sb-1',
    bankAccountId: 'bank-sber-card',
    bankName: 'СберБанк',
    accountNumberMask: '•9022',
    title: 'Аптека Ригла (Витамины и аспирин)',
    merchant: 'Аптека Ригла',
    amount: 420.00,
    type: 'expense',
    categoryType: 'здоровье',
    categoryName: 'Аптека',
    date: getTodayDateString(),
    time: '17:05',
    status: 'pending',
    rawSnippet: 'СберБанк: Покупка 420р Аптека Ригла. Баланс 6240р',
  },
  {
    id: 'tx-inc-1',
    bankAccountId: 'bank-tbank-card',
    bankName: 'Т-Банк',
    accountNumberMask: '•4821',
    title: 'Перевод от Александра В. (Возврат долга)',
    merchant: 'СБП Перевод',
    amount: 2500.00,
    type: 'income',
    categoryType: 'прочее',
    categoryName: 'Перевод',
    date: getTodayDateString(),
    time: '11:30',
    status: 'pending',
    rawSnippet: 'Т-Банк. Перевод +2 500.00 ₽ от Александр В. (СБП)',
  },
  {
    id: 'tx-inc-2',
    bankAccountId: 'bank-sber-card',
    bankName: 'СберБанк',
    accountNumberMask: '•9022',
    title: 'Кэшбэк и бонусы за прошлый месяц',
    merchant: 'СберСпасибо',
    amount: 840.00,
    type: 'income',
    categoryType: 'прочее',
    categoryName: 'Кэшбэк',
    date: getTodayDateString(),
    time: '09:00',
    status: 'pending',
    rawSnippet: 'СберБанк. Зачисление кэшбэка +840.00 ₽',
  },
  {
    id: 'tx-inc-3',
    bankAccountId: 'bank-tbank-card',
    bankName: 'Т-Банк',
    accountNumberMask: '•4821',
    title: 'Поступление от Авито (Продажа монитора)',
    merchant: 'Avito Доставка',
    amount: 5400.00,
    type: 'income',
    categoryType: 'прочее',
    categoryName: 'Продажа',
    date: getTodayDateString(),
    time: '14:20',
    status: 'pending',
    rawSnippet: 'Т-Банк. Зачисление +5 400.00 ₽ Avito Заказ',
  },
];

export const INITIAL_INCOMES: IncomeItem[] = [
  {
    id: 'inc-init-1',
    title: 'Подработка (Консультация по дизайну)',
    amount: 6000.00,
    date: '2026-08-15',
    time: '18:00',
    sourceType: 'freelance',
    sourceName: 'СБП Перевод',
    category: 'Подработка',
    isIncludedInBudget: true,
    isManual: true,
    notes: 'Оплата за аудит мобильного интерфейса',
    createdAt: '2026-08-15T18:00:00Z',
  },
  {
    id: 'inc-init-2',
    title: 'Возврат долга наличными от Сергея',
    amount: 3000.00,
    date: '2026-08-22',
    time: '15:30',
    sourceType: 'cash',
    sourceName: 'Наличные',
    category: 'Возврат долга',
    isIncludedInBudget: true,
    isManual: true,
    notes: 'Наличные переданы при встрече',
    createdAt: '2026-08-22T15:30:00Z',
  }
];

const periodData = getCurrentPeriodDates(5);

export const INITIAL_BUDGET_STATE: BudgetState = {
  periodTitle: periodData.title,
  periodStartDate: periodData.startDate,
  periodEndDate: periodData.endDate,
  todayDate: getTodayDateString(),
  
  // Advance and salary timeline
  salaryDateDay: 5,
  advanceDateDay: 20,
  advancePaymentDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-20`,
  estimatedAdvanceAmount: 40000.00, // Предполагаемый аванс 20-го числа
  isAdvanceReceived: new Date().getDate() >= 20,
  
  total30DaysBudget: 135789.69,
  previousMonthRemainder: 11803.76,
  safetyCushionDeposit: 8265.00,
  currentSalary: 82650.00,
  
  isBalanceSynced: false,
  
  plannedItems: INITIAL_PLANNED_ITEMS,
  days: buildInitialDays(),
  wishlist: INITIAL_WISHLIST,
  
  cushionAccumulated: 8269.53,
  cushionCash: 15000.00, // Учет наличных сбережений
  cushionTargetAmount: 163294.11, // 3 месяца
  cushionTargetMonthsCount: 3,
  cushionMonthlyContribution: 8265.00,
  mandatoryExpenses: INITIAL_MANDATORY_EXPENSES,
  mandatoryExpensesMode: 'manual',
  isCushionDepositDoneThisMonth: true,
  actualCushionDepositThisMonth: 8265.00,
  cushionNormMode: 'percent',
  cushionNormPercent: 10,
  cushionNormFixedAmount: 8265.00,
  cushionSchedule: buildCushionSchedule(82650.00, true, 8265.00, 8269.53, 8, 2026, 'percent', 10, 8265.00),
  
  // Banking integration data
  bankAccounts: INITIAL_BANK_ACCOUNTS,
  pendingBankTransactions: INITIAL_PENDING_TRANSACTIONS,
  lastBankSyncTimestamp: new Date().toISOString(),
  
  // Incomes & Additional inflows
  incomes: INITIAL_INCOMES,
  
  isMobileFrame: false,
};
