import { FoodItem, FoodPriceHistoryEntry, DayRecord, ExpenseCategory } from '../types';

/**
 * Предустановленный список базовых популярных продуктов с актуальными ориентировочными ценами и объемами.
 */
export const POPULAR_FOOD_TEMPLATES: Array<Omit<FoodItem, 'id' | 'lastUpdated'>> = [
  // Молочка
  {
    name: 'Молоко 3.2% (пастеризованное, 900 мл)',
    price: 89,
    quantityPerMonth: 8,
    unit: 'бут',
    category: 'молочка',
    frequency: 'weekly',
  },
  {
    name: 'Творог 5% (180-200 г)',
    price: 105,
    quantityPerMonth: 6,
    unit: 'пач',
    category: 'молочка',
    frequency: 'weekly',
  },
  {
    name: 'Сыр полутвердый Российский / Тильзитер (200 г)',
    price: 195,
    quantityPerMonth: 4,
    unit: 'уп',
    category: 'молочка',
    frequency: 'weekly',
  },
  {
    name: 'Сметана 15-20% (300 г)',
    price: 98,
    quantityPerMonth: 4,
    unit: 'бан',
    category: 'молочка',
    frequency: 'weekly',
  },

  // Яйца
  {
    name: 'Яйцо куриное С1 (10 шт)',
    price: 115,
    quantityPerMonth: 4,
    unit: 'дес',
    category: 'яйца',
    frequency: 'weekly',
  },

  // Хлеб
  {
    name: 'Хлеб нарезной пшеничный / ржаной',
    price: 46,
    quantityPerMonth: 8,
    unit: 'шт',
    category: 'хлеб',
    frequency: 'every_2_days',
  },

  // Мясо и птица
  {
    name: 'Филе грудки куриное (1 кг)',
    price: 380,
    quantityPerMonth: 5,
    unit: 'кг',
    category: 'мясо',
    frequency: 'weekly',
  },
  {
    name: 'Фарш домашний / свино-говяжий (1 кг)',
    price: 430,
    quantityPerMonth: 3,
    unit: 'кг',
    category: 'мясо',
    frequency: 'biweekly',
  },

  // Бакалея и крупы
  {
    name: 'Крупа гречневая ядрица (800 г)',
    price: 79,
    quantityPerMonth: 2,
    unit: 'уп',
    category: 'крупы',
    frequency: 'biweekly',
  },
  {
    name: 'Рис шлифованный круглозерный / длинный (800 г)',
    price: 94,
    quantityPerMonth: 2,
    unit: 'уп',
    category: 'крупы',
    frequency: 'biweekly',
  },
  {
    name: 'Макароны из твердых сортов пшеницы (450 г)',
    price: 75,
    quantityPerMonth: 4,
    unit: 'уп',
    category: 'крупы',
    frequency: 'weekly',
  },
  {
    name: 'Овсяные хлопья «Геркулес» (500 г)',
    price: 65,
    quantityPerMonth: 2,
    unit: 'уп',
    category: 'крупы',
    frequency: 'biweekly',
  },

  // Овощи и фрукты
  {
    name: 'Картофель свежий (1 кг)',
    price: 48,
    quantityPerMonth: 8,
    unit: 'кг',
    category: 'овощи_фрукты',
    frequency: 'weekly',
  },
  {
    name: 'Томаты свежие (1 кг)',
    price: 185,
    quantityPerMonth: 3,
    unit: 'кг',
    category: 'овощи_фрукты',
    frequency: 'weekly',
  },
  {
    name: 'Огурцы гладкие / короткоплодные (1 кг)',
    price: 145,
    quantityPerMonth: 3,
    unit: 'кг',
    category: 'овощи_фрукты',
    frequency: 'weekly',
  },
  {
    name: 'Бананы (1 кг)',
    price: 140,
    quantityPerMonth: 4,
    unit: 'кг',
    category: 'овощи_фрукты',
    frequency: 'weekly',
  },
  {
    name: 'Яблоки сезонные (1 кг)',
    price: 120,
    quantityPerMonth: 4,
    unit: 'кг',
    category: 'овощи_фрукты',
    frequency: 'weekly',
  },

  // Масло и соусы
  {
    name: 'Масло сливочное 82.5% (180 г)',
    price: 185,
    quantityPerMonth: 3,
    unit: 'пач',
    category: 'масло',
    frequency: 'biweekly',
  },
  {
    name: 'Масло растительное подсолнечное рафинированное (1 л)',
    price: 125,
    quantityPerMonth: 1.5,
    unit: 'бут',
    category: 'масло',
    frequency: 'monthly',
  },

  // Напитки и чай
  {
    name: 'Чай черный листовой / пакетированный (100 пак)',
    price: 290,
    quantityPerMonth: 1,
    unit: 'уп',
    category: 'напитки',
    frequency: 'monthly',
  },
  {
    name: 'Кофе зерновой / молотый (250 г)',
    price: 360,
    quantityPerMonth: 1.5,
    unit: 'уп',
    category: 'напитки',
    frequency: 'monthly',
  },
];

/**
 * Расчет общей месячной стоимости потребительской корзины
 */
export function calculateBasketTotal(items: FoodItem[]): number {
  if (!items || items.length === 0) return 0;
  const total = items.reduce((sum, item) => {
    const itemPrice = typeof item.price === 'number' && !isNaN(item.price) ? Math.max(0, item.price) : 0;
    const itemQty = typeof item.quantityPerMonth === 'number' && !isNaN(item.quantityPerMonth) ? Math.max(0, item.quantityPerMonth) : 1;
    return sum + (itemPrice * itemQty);
  }, 0);
  return Math.round(total * 100) / 100;
}

/**
 * Маппинг категории Open Food Facts на категории нашего приложения
 */
function mapOffCategoryToInternal(categories: string = '', productName: string = ''): FoodItem['category'] {
  const combined = (categories + ' ' + productName).toLowerCase();

  if (combined.includes('milk') || combined.includes('молок') || combined.includes('творог') || combined.includes('сыр') || combined.includes('сметан') || combined.includes('йогурт') || combined.includes('dairy') || combined.includes('кефир')) {
    return 'молочка';
  }
  if (combined.includes('egg') || combined.includes('яйц') || combined.includes('яйцо')) {
    return 'яйца';
  }
  if (combined.includes('bread') || combined.includes('хлеб') || combined.includes('батон') || combined.includes('выпечка') || combined.includes('булочк')) {
    return 'хлеб';
  }
  if (combined.includes('meat') || combined.includes('мясо') || combined.includes('птиц') || combined.includes('куриц') || combined.includes('говядин') || combined.includes('свинин') || combined.includes('фарш') || combined.includes('колбас') || combined.includes('сосиск')) {
    return 'мясо';
  }
  if (combined.includes('rice') || combined.includes('рис') || combined.includes('гречк') || combined.includes('крупа') || combined.includes('макарон') || combined.includes('pasta') || combined.includes('хлопья') || combined.includes('геркулес') || combined.includes('мука')) {
    return 'крупы';
  }
  if (combined.includes('vegetable') || combined.includes('fruit') || combined.includes('овощ') || combined.includes('фрукт') || combined.includes('яблок') || combined.includes('банан') || combined.includes('томат') || combined.includes('огур') || combined.includes('картоф') || combined.includes('морков')) {
    return 'овощи_фрукты';
  }
  if (combined.includes('oil') || combined.includes('butter') || combined.includes('масло') || combined.includes('соус') || combined.includes('кетчуп') || combined.includes('майонез')) {
    return 'масло';
  }
  if (combined.includes('tea') || combined.includes('чай') || combined.includes('coffee') || combined.includes('кофе') || combined.includes('water') || combined.includes('вода') || combined.includes('сок') || combined.includes('juice') || combined.includes('напиток')) {
    return 'напитки';
  }

  return 'прочее';
}

/**
 * Запрос информации о товаре по штрихкоду GTIN / EAN-13 через Open Food Facts API
 */
export async function fetchProductByGTIN(gtin: string): Promise<{
  success: boolean;
  item?: Partial<FoodItem>;
  message?: string;
}> {
  const cleanGtin = gtin.trim().replace(/[^0-9]/g, '');
  if (!cleanGtin || cleanGtin.length < 8) {
    return { success: false, message: 'Некорректный номер штрих-кода GTIN' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${cleanGtin}.json`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DailyBudgetApp/1.0 (Personal Finance App; React)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        item: {
          gtin: cleanGtin,
          name: `Товар #${cleanGtin}`,
          quantityPerMonth: 1,
          category: 'прочее',
        },
        message: 'Товар не найден в глобальной базе, введите название и цену вручную',
      };
    }

    const data = await response.json();

    if (data.status === 1 && data.product) {
      const p = data.product;
      const name = p.product_name_ru || p.product_name || p.generic_name_ru || p.generic_name || `Товар (${p.brands || cleanGtin})`;
      const category = mapOffCategoryToInternal(p.categories || '', name);
      const brand = p.brands || undefined;
      const imageUrl = p.image_front_small_url || p.image_small_url || p.image_url || undefined;
      
      // Ориентировочная цена (если доступна в базе или приблизительная оценка)
      let estimatedPrice: number | undefined = undefined;
      if (typeof p.price === 'number' && p.price > 0) {
        estimatedPrice = Math.round(p.price);
      }

      return {
        success: true,
        item: {
          gtin: cleanGtin,
          name: name.trim(),
          brand,
          imageUrl,
          category,
          price: estimatedPrice,
          quantityPerMonth: 2,
          unit: 'шт',
        },
        message: 'Товар успешно найден в Open Food Facts!',
      };
    } else {
      return {
        success: false,
        item: {
          gtin: cleanGtin,
          name: `Товар #${cleanGtin}`,
          quantityPerMonth: 1,
          category: 'прочее',
        },
        message: 'Товар с таким штрих-кодом отсутствует в базе. Вы можете задать параметры вручную.',
      };
    }
  } catch (error: any) {
    console.warn('Open Food Facts fetch error:', error);
    return {
      success: false,
      item: {
        gtin: cleanGtin,
        name: `Товар #${cleanGtin}`,
        quantityPerMonth: 1,
        category: 'прочее',
      },
      message: 'Не удалось связаться с сервером штрих-кодов. Введите название и цену вручную.',
    };
  }
}

/**
 * Подсчет суммы фактических трат на продукты за все дни текущего периода
 */
export function calculateTotalFoodSpentInPeriod(days: DayRecord[], startDate?: string, endDate?: string): number {
  if (!days || days.length === 0) return 0;
  
  let totalSpent = 0;
  for (const day of days) {
    if (startDate && day.date < startDate) continue;
    if (endDate && day.date > endDate) continue;

    for (const exp of day.expenses || []) {
      const cat = (exp.category || '').toLowerCase();
      const catType = exp.categoryType;
      const title = (exp.title || '').toLowerCase();

      if (
        catType === 'продукты' ||
        cat.includes('продукт') ||
        cat.includes('супермаркет') ||
        cat.includes('магазин') ||
        title.includes('пятерочк') ||
        title.includes('магнит') ||
        title.includes('перекресток') ||
        title.includes('вкусвилл') ||
        title.includes('ашан') ||
        title.includes('лента') ||
        title.includes('самокат') ||
        title.includes('лавка')
      ) {
        totalSpent += exp.amount;
      }
    }
  }

  return Math.round(totalSpent * 100) / 100;
}

/**
 * Генерация истории изменения цен на потребительскую корзину (инфляция корзины)
 */
export function generateDefaultFoodPriceHistory(currentBasketTotal: number): FoodPriceHistoryEntry[] {
  const base = currentBasketTotal > 0 ? currentBasketTotal : 14850;
  
  return [
    {
      month: 'Март 2026',
      period: 'Март 2026',
      basketTotal: Math.round(base * 0.93),
      totalBasketCost: Math.round(base * 0.93),
      actualSpent: Math.round(base * 0.95),
      changePercentage: 0,
      inflationRate: 0,
    },
    {
      month: 'Апрель 2026',
      period: 'Апрель 2026',
      basketTotal: Math.round(base * 0.945),
      totalBasketCost: Math.round(base * 0.945),
      actualSpent: Math.round(base * 0.96),
      changePercentage: 1.6,
      inflationRate: 1.6,
    },
    {
      month: 'Май 2026',
      period: 'Май 2026',
      basketTotal: Math.round(base * 0.96),
      totalBasketCost: Math.round(base * 0.96),
      actualSpent: Math.round(base * 0.98),
      changePercentage: 1.6,
      inflationRate: 1.6,
    },
    {
      month: 'Июнь 2026',
      period: 'Июнь 2026',
      basketTotal: Math.round(base * 0.975),
      totalBasketCost: Math.round(base * 0.975),
      actualSpent: Math.round(base * 0.97),
      changePercentage: 1.5,
      inflationRate: 1.5,
    },
    {
      month: 'Июль 2026',
      period: 'Июль 2026',
      basketTotal: Math.round(base * 0.988),
      totalBasketCost: Math.round(base * 0.988),
      actualSpent: Math.round(base * 1.02),
      changePercentage: 1.3,
      inflationRate: 1.3,
    },
    {
      month: 'Август 2026',
      period: 'Август 2026',
      basketTotal: base,
      totalBasketCost: base,
      actualSpent: Math.round(base * 1.01),
      changePercentage: 1.2,
      inflationRate: 1.2,
    },
  ];
}

/**
 * Получение человекочитаемого названия категории продукта
 */
export function getFoodCategoryLabel(cat?: string): { label: string; emoji: string } {
  switch (cat) {
    case 'молочка':
      return { label: 'Молочные продукты', emoji: '🥛' };
    case 'хлеб':
      return { label: 'Хлеб и выпечка', emoji: '🍞' };
    case 'мясо':
      return { label: 'Мясо и птица', emoji: '🥩' };
    case 'яйца':
      return { label: 'Яйца', emoji: '🥚' };
    case 'крупы':
      return { label: 'Крупы и бакалея', emoji: '🌾' };
    case 'овощи_фрукты':
      return { label: 'Овощи и фрукты', emoji: '🥦' };
    case 'масло':
      return { label: 'Масло и соусы', emoji: '🧈' };
    case 'напитки':
      return { label: 'Чай, кофе, напитки', emoji: '☕' };
    default:
      return { label: 'Прочие продукты', emoji: '🛒' };
  }
}
