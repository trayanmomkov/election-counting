// Фиксиран списък на партиите за избори за Народно събрание.
// Порядъкът съответства на номера на бюлетината.
// "hasPrefs: false" означава, че партията няма преференции (напр. "Не подкрепям никого").

export const PARTIES = [
  { n: 1,  short: "Има такъв народ",           full: 'ПП „Има такъв народ"',                                hasPrefs: true },
  { n: 2,  short: "Пряка демокрация",          full: 'ПП „Пряка демокрация"',                               hasPrefs: true },
  { n: 3,  short: "Синя България",             full: 'КП „Синя България"',                                  hasPrefs: true },
  { n: 4,  short: "Морал единство чест",       full: 'ПП „Морал единство чест"',                            hasPrefs: true },
  { n: 5,  short: "БСП – Обединена левица",    full: 'КП „БСП – Обединена левица"',                         hasPrefs: true },
  { n: 6,  short: "Истината и само истината",  full: 'ПП „Народна партия истината и само истината"',        hasPrefs: true },
  { n: 7,  short: "ПП – ДБ",                   full: 'КП „Продължаваме Промяната – Демократична България"', hasPrefs: true },
  { n: 8,  short: "Възраждане",                full: 'ПП „Възраждане"',                                     hasPrefs: true },
  { n: 9,  short: "Моя България",              full: 'КП „Моя България"',                                   hasPrefs: true },
  { n: 10, short: "Непартийни кандидати",      full: 'ПП „Движение на непартийните кандидати"',             hasPrefs: true },
  { n: 11, short: "АПС",                       full: 'КП „Алианс за права и свободи" – АПС',                hasPrefs: true },
  { n: 12, short: "Антикорупционен блок",      full: 'КП „Антикорупционен блок"',                           hasPrefs: true },
  { n: 13, short: "Непокорна България",        full: 'ПП „Национално движение Непокорна България"',         hasPrefs: true },
  { n: 14, short: "Величие",                   full: 'ПП „Величие"',                                        hasPrefs: true },
  { n: 15, short: "ГЕРБ-СДС",                  full: "КП ГЕРБ-СДС",                                         hasPrefs: true },
  { n: 16, short: "Трети март",                full: 'КП „Трети март"',                                     hasPrefs: true },
  { n: 17, short: "ДПС",                       full: 'ПП „Движение за права и свободи"',                    hasPrefs: true },
  { n: 18, short: "Нация",                     full: 'ПП „Нация"',                                          hasPrefs: true },
  { n: 19, short: "България може",             full: 'ПП „България може"',                                  hasPrefs: true },
  { n: 20, short: "Сияние",                    full: 'КП „Сияние"',                                         hasPrefs: true },
  { n: 21, short: "Прогресивна България",      full: 'КП „Прогресивна България"',                           hasPrefs: true },
  { n: 22, short: "Съпротива",                 full: 'ПП „Съпротива"',                                      hasPrefs: true },
  { n: 23, short: "Партия на Зелените",        full: 'ПП „Партия на Зелените"',                             hasPrefs: true },
  { n: 24, short: "Глас народен",              full: 'ПП „Глас народен"',                                   hasPrefs: true },
  { n: 25, short: "Не подкрепям никого",       full: "Не подкрепям никого",                                 hasPrefs: false },
];

export const PREF_MIN = 101;
export const PREF_MAX = 138;
