# Iron Lotus

A tactical martial-arts card duel built as a zero-build, static web game. Six fighting styles, fifty techniques, eight body zones, and a body that remembers every strike.

![Iron Lotus](screenshots/menu.jpg)

## Play

Serve the repository root with any static file server and open `index.html`.

```bash
npm start        # or: python3 -m http.server 3000
```

No package install or build step is required. The game is plain HTML, CSS and ES modules, and saves progress in `localStorage` under `iron-lotus-save-v1`.

## What is in the game

- **Campaign** — six gatekeepers, each with their own style, AI behaviour and unlockable techniques.
- **Tournament** — four rounds, damage and injuries carry between opponents.
- **Survival** — endless challengers, escalating damage, injuries carried forward.
- **Training** — a non-retaliating dummy for learning ranges, timing and body damage.
- **Six styles** — Shaolin Kung Fu, Wing Chun, Shotokan Karate, Taekwondo, Muay Thai and Brazilian Jiu-Jitsu, each with unique passives and starter cards.
- **Fifty techniques** — universal strikes plus style-specific cards with rarity, Chi/Stamina costs, effects, upgrades and procedural artwork.
- **Eight body zones** — Head, Neck, Chest, Heart, Abdomen, Arms, Legs and Joints. Damage to each zone changes combat maths (timing, guard, evasion, stamina, Chi flow) and can produce distinct knockouts.
- **Reaction combat** — directional arrows plus a timing band for attacks and defence. Perfect reads deal extra damage or negate incoming attacks; counter stances punish perfect defence.
- **Progression** — XP, levels, attributes, a nine-node perk tree, Essence, card upgrades, achievements, deck building and unlocks.

## Controls

| Input | Action |
| --- | --- |
| Click / tap a card | Play a technique |
| Arrow keys / swipe | Match the required reaction direction |
| `Space` / tap | Time the reaction inside the band |
| `Enter` | End turn |
| `Esc` | Close the current panel |
| Hover a card | Inspect full details |

## Structure

- `index.html` — screen skeleton and HUD markup
- `css/style.css` — responsive visual system
- `js/data.js` — styles, cards, opponents, perks, achievements
- `js/engine.js` — combat rules, AI, damage, body injury and knockouts
- `js/combat-ui.js` — turn orchestration, reactions, rewards and results
- `js/render.js` — procedural canvas fighters, arena and effects
- `js/art.js` — procedural card and portrait artwork
- `js/screens.js` — campaign, tournament, survival, training, deck and dojo screens

## Notes

- All art and audio are generated at runtime; the only optional network dependency is Google Fonts.
- The game is designed for desktop and mobile browsers (tested at 1280×800 and 390×844).
- Techniques, fighters and styles are fictional interpretations created for this game.

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Remixed using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/Tatsu-ha/Martial)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/Tatsu-ha/Martial)

- 🎮 [Open the project](https://go.ondev.store/Tatsu-ha/Martial).
- ✨ [Remix this project](https://go.ondev.store/Tatsu-ha/Martial?remix=1).
- 💻 [Explore the source](https://github.com/Tatsu-ha/Martial).
- 🛠️ [Check build runs](https://github.com/Tatsu-ha/Martial/actions).
- 🐛 [Report an issue](https://github.com/Tatsu-ha/Martial/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/Tatsu-ha).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
- 🧬 [Explore the remix source](https://github.com/Tatsu-ha/Martial).
<!-- omgithub:readme:end -->
