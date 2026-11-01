# Portal v2: 3D illustrations

21 soft "toy" 3D illustrations (12 subjects, the knowledge planet, experiments, physics chapters), rendered with Three.js into transparent PNGs. They are used in the Figma mockups: https://www.figma.com/design/pTcnXp8kdlMcX1c0GNeQfa

Rerender:

```
npm i three@0.160.0
node render.js '[["math"],["hero",{"elev":12}]]' 1000   # writes out/<name>.png
```

`scene.html` holds one builder per illustration (`B.math`, `B.physics`, ...), with a shared clay material, RoomEnvironment lighting and a soft contact shadow.

## Lesson, account and levels (added)

19 more renders for the lesson, sign-up, personal account and gamification screens (Figma page «Урок, кабинет, уровни»):

- `lessonScene`, `compass`: the magnet-and-compass lesson scene and its "lesson complete" hero
- `mStage1`–`mStage3`, `trophy`: bronze / silver / gold stage medals and the subject trophy
- `av1`–`av6`: kid avatars (bear, cat, antenna, bunny, sprout, horns)
- `bFlask`, `bFlame`, `bBubble`, `bMagnet`, `bBulb`, `bBook`, `bCheck`: achievement badges
