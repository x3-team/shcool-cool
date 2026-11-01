# School Cool · content pilot

Two units in six languages, built as data plus a small engine:

- **Fractions**, grade 5: 12 lessons
- **Forces**, grade 7: 8 lessons
- **Languages:** ru, en, es, ar (right to left), hi, zh
- **Curriculum maps:** Russia (FGOS), USA (Common Core and NGSS), India (NCERT)

Open `dist/index.html` in a browser. It is one self-contained file and needs only Three.js and Google Fonts from a CDN.

## Commands

```bash
node pilot/tools/validate.mjs   # every automatic check; must end with "All checks passed."
node pilot/tools/build.mjs      # writes pilot/dist/index.html
```

## How a lesson is built

Each lesson has six steps:

1. **Page:** a book page with the idea.
2. **Predict:** a question with three choices and the reason behind the answer.
3. **Explore:** hands-on goals in the 3D scene, checked automatically.
4. **Explain:** the rule and a formula.
5. **Tasks:** six or more problems on three levels. Each has three progressive hints, a worked solution, explanations of typical mistakes, and "another problem" for a fresh variant.
6. **Sandbox:** free play in the same scene.

| Path | What it holds |
| --- | --- |
| `content/course.json` | Languages, curricula and units. Each unit has a grade in each curriculum. |
| `content/lessons/*.json` | One lesson per file. It holds the scene setup, the explore goals, the curriculum codes and the task list. It has no text: text lives in the i18n files. |
| `content/i18n/<lang>.json` | All text for one language: interface, curricula, task templates and lesson texts. |
| `engine/tasks.js` | 27 seeded task generators. Each one makes the numbers, the answer, the check, and the codes for typical mistakes. |
| `engine/instruments/` | 3D instruments: fraction pies, number line, chocolate bar, and a forces lab with gravity, spring, friction and tug of war. |
| `engine/app.js` | The catalog and the lesson player. |

### Template language in texts

| Template | Meaning |
| --- | --- |
| `{x}` | A number or string variable. Expressions such as `{b*2}` work. |
| `[[a/b]]` | A stacked fraction. |
| `[[w a/b]]` | A mixed number. |
| `**bold**` | Bold text. |

Every translation must keep exactly the same placeholders as Russian, and the validator checks this.

- **Numbers:** digits are Western in all languages. The decimal separator follows the language: a comma in ru and es, a point elsewhere.
- **Arabic:** formulas and calculations are kept left to right automatically through `SC.isolateMath`. Units in Arabic are Latin symbols (N, kg, cm).

### What the validator checks

- **Structure:** every lesson has levels 1–3 (missions only need 2–3), and every scene instrument is known.
- **Translations:** every language has every key, the same placeholders and the same list lengths, and no Russian text is left behind.
- **Rendering:** every text renders.
- **Tasks:** 300 seeds per task generate a problem, and the correct answer is accepted.
- **Typical mistakes:** every mistake code has an explanation in every language, and typical wrong answers are recognised as the right mistake.

## Before children see it: human review

Claude wrote, translated and checked everything automatically. People still need to do the following.

1. **Teacher review per subject.** Sample at least 20% of lessons in each unit, and all mission lessons. Check that the facts are correct, that the grade level fits, and that the wording is clear for the age.
2. **A native speaker per language.** Spot-check the interface and 3–4 full lessons. Points to look at:
   - **Arabic:** the forms are masculine-default. The physics uses Latin symbols. The math direction (left to right with Western digits) needs a regional decision, since some curricula use Eastern Arabic digits and right-to-left math.
   - **Hindi:** the NCERT terminology (अंश, हर, घर्षण बल, स्प्रिंग नियतांक).
   - **Chinese:** the PRC textbook terms (劲度系数, 动摩擦因数).
   - **Spanish:** it is neutral, using "tú", "resorte" and "rozamiento". Regional variants may want "fricción" or "muelle".
3. **Child-safety read** of all texts. The content is static: there is no AI at runtime and no user text.
4. **Curriculum codes** in `lessons/*.json` should be confirmed by a methodologist for each country.
