# Clockly

מעקב שעות עבודה וחישוב שכר ברוטו/נטו לישראל, לפי חוקי המס ודיני העבודה 2026.
אפליקציית PWA שמרגישה כמו אפליקציה נייטיבית (bottom tabs, safe-area insets, מעברי מסך, offline shell) — חינמית לחלוטין וללא נעילת פיצ'רים.

## סטאק

- **Vite + React 19 + TypeScript** — SPA, לא SSR, כדי לשלוט במלואה בחוויית ה-app shell.
- **Tailwind CSS v4** — RTL מלא, מצב כהה (`.dark` class), עיצוב טוקנים ב-`src/index.css`.
- **React Router v7** — bottom-tab navigation, code-splitting לפי מסך.
- **Framer Motion** — מעברי מסך/spring animations.
- **TanStack Query + Zustand** — state לשרת (Supabase) ול-UI (auth session, theme).
- **Supabase** — Postgres + Auth + Row Level Security לבידוד מלא בין משתמשים.
- **vite-plugin-pwa (Workbox)** — manifest, service worker, offline caching.
- **Vitest** — יחידות בדיקה למנוע החישוב.

## מנוע החישוב

כל הפרמטרים החוקיים (מדרגות מס, ביטוח לאומי, פנסיה, שכר מינימום וכו') חיים ב-
`src/lib/calc/rates_2026.json` — לא מקודדים בלוגיקה. עדכון שנתי = קובץ JSON חדש +
מיפוי שנה ב-`src/lib/calc/rates.ts`.

- `grossEngine.ts` — שעות רגילות / נוספות (125%/150%) / שבת־חג (150%/175%/200%),
  משמרות לילה (יום מקוצר ל-7 שעות), משמרות חוצות חצות, צבירה חודשית.
- `netEngine.ts` — מס הכנסה מדורג, נקודות זיכוי, ביטוח לאומי + בריאות דו-מדרגתי,
  פנסיה, קרן השתלמות.
- `rightsEngine.ts` — חופשה, מחלה, הבראה (נוסחאות עזר, לא מוצג עדיין ב-UI).
- 29 יחידות בדיקה ב-`src/lib/calc/__tests__` מכסות edge cases (חציית חצות, לילה,
  שבת, ריבוי מדרגות מס/ביטוח לאומי).

**הנחות ומגבלות ידועות** (ראו גם קבצי המחקר/פרומפט המקוריים):
- מס הכנסה מחושב לפי מדרגות **חודשיות** (כפי שמפורסמות בפועל), לא בהתחשבנות
  מצטברת-שנתית מלאה מול היסטוריית שכר — כך פועל נכון גם רוב תוכנות השכר.
- עובד עם כמה מעסיקים: הברוטו מוצג בנפרד לכל מקום עבודה, אך הנטו מחושב על סך
  ההכנסה החייבת של כל המקומות יחד (קירוב טוב יותר להתחשבנות השנתית האמיתית,
  לא סימולציה של ניכוי-מס-במקור פר-מעסיק בפועל).
- דמי הבראה/חופשה/מחלה: נוסחאות חישוב קיימות (`rightsEngine.ts`) אך טרם מוצגות
  במסך ייעודי ב-UI.

## Supabase

טבלאות: `profiles`, `tax_profiles`, `workplaces`, `shifts`, `breaks` — כולן עם
RLS מבוסס `auth.uid()`, כולל trigger שמוודא ש-`shifts.workplace_id` שייך לאותו
`user_id` (הגנת עומק נגד גישה חוצת-משתמשים). ראו `get_advisors` (security/performance)
ב-Supabase MCP — כל האזהרות הפתוחות הן false positives (trigger functions).

## פיתוח מקומי

```bash
npm install
cp .env.example .env   # מלאו VITE_SUPABASE_URL ו-VITE_SUPABASE_ANON_KEY
npm run dev
npm test                # vitest
npm run build            # typecheck + build + PWA precache
```

## פריסה (Netlify)

`netlify.toml` כבר מוגדר: `npm run build`, `dist/`, SPA redirect ל-`index.html`,
כותרות אבטחה בסיסיות. יש להגדיר ב-Netlify את משתני הסביבה:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## איכות קוד / Skills לפני PR

`.claude/skills/` מכיל 5 סקילים כפי שהוגדר בפרומפט המקורי — clockly-code-review,
ui-ux-review, clockly-security-review, performance-review, dependency-health
(שני הראשונים ממותגים עם קידומת `clockly-` כדי לא להסתתר מאחורי הסקילים
המובנים `code-review`/`security-review` של Claude Code, שחולקים את אותו השם).
כל אחד מגדיר קלט/פלט, checklist קונקרטי ל-Clockly (לא גנרי), וקריטריון עובר/נכשל.
`.github/workflows/pr-checks.yml` אוכף את החלקים המכניים (typecheck, lint,
vitest, build, `npm audit`) על כל PR; החלקים השיפוטיים (RTL/dark-mode על
מסך אמיתי, בידוד RLS בסכמה חדשה, כיסוי טסטים למקרי קצה חדשים במנוע החישוב)
דורשים הרצת הסקיל המתאים ידנית או דרך Claude Code — אין להם עדיין gate
מכני ב-CI, וזה מתועד בכל SKILL.md בסעיף "How it runs".

## מה עוד חסר (לא במסגרת הסבב הנוכחי)

- דוחות/ייצוא PDF/Excel, השוואה מול תלוש אמיתי.
- מסך זכויות עובד (חופשה/מחלה/הבראה) — הלוגיקה קיימת, ה-UI לא.
- Web Push notifications לתזכורות כניסה/יציאה.
- Geolocation-based reminders.
- תצוגת לוח שנה (יש רק תצוגת רשימה), תבניות/משמרות קבועות, תקופת חישוב
  מותאמת (למשל 15 לחודש), ולידציה על שכר מינימום בקלט.
- בדיקת Core Web Vitals/Lighthouse אמיתית — נבדק רק רינדור בדפדפן, לא נמדד.
