# Преброяване НС (PWA)

Бързо, лесно и сигурно приложение за преброяване на гласовете за избори за Народно събрание. Работи в браузъра или като инсталиран PWA на телефон. Без backend, без интернет, без регистрация.

## Възможности

- **25 партии** + бутон „Не подкрепям никого" (фиксиран списък в `parties.js`)
- **38 преференции** (номера 101–138) + „Без преференция" за всеки глас
- **Недействителни бюлетини** — отделен брояч
- **Автоматично запазване** в браузъра (localStorage) — състоянието оцелява рестарт
- **Undo** на последните 100 действия
- **Debounce 180ms** — предотвратява случайно двойно броене
- **Експорт** като CSV (с BOM за Excel) или JSON (пълен backup)
- **Потвърждение при Reset** — предотвратява случайно изтриване
- **PWA** — инсталира се на телефон, работи 100% offline
- **Responsive** — работи на телефон, таблет и десктоп
- **Dark mode** — автоматично според системната настройка
- **Accessibility** — ARIA labels, keyboard support, високи контрасти

## Стартиране локално

```bash
cd /home/john/PycharmProjects/broene-izbori
python3 -m http.server 8000
```

Отворете [http://localhost:8000](http://localhost:8000) в браузъра.

> **Важно:** Service Worker-ът изисква HTTPS или localhost. При `file://` няма да работи offline.

## Как се използва

1. **Брой глас за партия:** тап на партията → тап на преференция (101–138) ИЛИ „Без преференция"
2. **„Не подкрепям никого" (№25):** един тап — брои директно без преференция
3. **Недействителна бюлетина:** тап на червения бутон долу
4. **Грешка?** Бутон „↶" в горния ъгъл — отменя последното действие (до 100 назад)
5. **Експорт:** бутон „⤓" → изберете CSV или JSON
6. **Нулиране:** бутон „⟲" → потвърждение → всичко става 0

### Клавишни команди

- `U` — Undo последно действие
- `Esc` — Затваря отворен модал

## Инсталиране на телефон (PWA)

1. Deploy-нете на статичен HTTPS хост (виж по-долу) ИЛИ минете през localhost
2. На телефона отворете страницата в Chrome / Safari
3. От менюто → **„Add to Home Screen"** (Safari: Share → Add to Home Screen)
4. От сега нататък се отваря като самостоятелно приложение, работи offline

## Deploy на статичен хост

### GitHub Pages
```bash
# Създайте git repo и push-нете файловете
git init && git add . && git commit -m "Initial"
git remote add origin git@github.com:USER/broene-izbori.git
git push -u origin main
# В GitHub → Settings → Pages → Source: main → Save
```

### Netlify / Vercel
Drag-and-drop цялата папка на [netlify.com/drop](https://app.netlify.com/drop) — готово.

### Собствен Nginx
```
server {
  listen 443 ssl;
  server_name broene.example.com;
  root /var/www/broene-izbori;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
}
```

## Структура на файловете

```
broene-izbori/
├── index.html              # HTML entry
├── app.js                  # Главна логика (state, render, handlers, export)
├── parties.js              # Фиксиран списък партии + преференции
├── styles.css              # Всички стилове (mobile-first, dark mode)
├── manifest.webmanifest    # PWA манифест
├── sw.js                   # Service Worker (cache-first offline)
├── icons/
│   ├── icon.svg            # Source SVG (visible)
│   ├── icon-maskable.svg   # Source SVG (за maskable иконата)
│   ├── icon-192.png        # 192×192 PNG
│   ├── icon-512.png        # 512×512 PNG
│   └── icon-maskable-512.png  # 512×512 maskable PNG
└── README.md
```

## Как се запазват данните

localStorage ключ: `broene-izbori-v1`

```json
{
  "version": 1,
  "counts": {
    "1": { "total": 42, "prefs": { "0": 10, "101": 3, "102": 5, "...": "..." } },
    "...": "..."
  },
  "invalid": 3,
  "history": [
    { "t": "vote", "party": "5", "pref": "103", "at": 1723000000000 }
  ]
}
```

- Auto-save: всяка промяна се запазва след 250ms (debounced)
- History: последни 100 действия за Undo
- Данните са привързани към домейна / browser profile / device

## Възстановяване от JSON backup

Ако сте изтеглили JSON backup и искате да го заредите на друго устройство:

1. Отворете приложението (то ще създаде празно localStorage)
2. Отворете DevTools → Console
3. Поставете:
   ```js
   localStorage.setItem('broene-izbori-v1', '<paste JSON content here>');
   location.reload();
   ```

(Интерфейс за import-ване от файл може да се добави в бъдеща версия.)

## Актуализация на списъка партии

За различни избори:
1. Редактирайте `parties.js`
2. Ако промените обхвата на преференциите: `PREF_MIN` и `PREF_MAX`
3. Ако състоянието е стара версия, увеличете `STORAGE_VERSION` в `app.js` (стара data ще се изтрие)

## Проблеми?

- **„Service Worker not registering"** — само HTTPS или localhost. При `file://` не работи.
- **Данните изчезват** — при „Clear browsing data" изчиства localStorage. Редовно експортирайте JSON backup.
- **Иконата не се появява на Home Screen** — някои iOS версии изискват PNG apple-touch-icon (има го).
- **„Добави на Home Screen" липсва на Android** — трябва да сте поне веднъж върху страницата и да е валиден manifest. Проверете DevTools → Application → Manifest.

## Лиценз

Public domain / CC0. Използвайте свободно.
