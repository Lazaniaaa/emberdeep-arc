# Промпти для героїв, мобів і предметів (ChatGPT / Nano Banana)

Промпти англійською, бо так моделі розуміють точніше. Порядок роботи:

1. **Спершу еталон.** Згенеруй одного персонажа промптом 1 і прикріпи `reference-cat.png` (наш кіт 48×48) як зразок стилю.
   Коли вийде добре, саме цей результат прикріплюй до всіх наступних запитів: «Same style as the attached image». Так усі вийдуть однаковими.
2. **Nano Banana** (Gemini) краще тримає одного й того самого персонажа між правками, тож добре підходить для «тепер цей самий кіт у латах» і для кадрів анімації.
   **ChatGPT** краще тримає сітку (sprite sheet) і вміє прозорий фон.
3. **Пікселі в AI «несправжні»:** квадратики різного розміру, з розмиттям. Після генерації:
   зменшити до 48×48 з **Nearest Neighbor** (Aseprite: Sprite → Sprite Size; або безкоштовний Pixelorama / онлайн «pixel art downscaler»), потім підчистити зайві пікселі.
   Простіше, коли просиш модель малювати «on an exact 48x48 grid, upscaled 10x», тоді зменшуєш рівно в 10 разів.
4. **Готові аркуші** (5 кадрів × 4 напрямки на рожевому фоні) клади в `art/heroes/raw/<тваринка>.webp` і запускай `node scripts/sprite-sheets.mjs heroes`:
   він сам прибере фон, зменшить до ігрового розміру й покладе `public/heroes/<тваринка>.png`. Нову тваринку ще треба дописати в `src/game/animals.ts`.
---

## Стиль (цей блок вставляй у кожен промпт)

```
Pixel art game sprite, exactly 48x48 pixels, shown upscaled 10x with perfectly square pixels.
Chibi proportions: very big round head (about 60% of the height), small body, short stubby legs, standing upright on two legs.
A clean 1-pixel dark outline around every separate part (ears, head, clothes, paws, weapon), 3-tone shading with light from the top-left.
Big shiny eyes with a dark lid, two-tone iris, pupil and two white highlights; small pink nose, tiny "ω" cat-like mouth, pink blush on the cheeks.
Small details: fur strands, buckles, rivets, seams, cuffs. Limited palette, no anti-aliasing, no gradients, no blur, hard pixel edges.
Holds a short sword in its right paw (left side of the picture) and a small iron lantern with a lit flame in its left paw.
Cute fantasy dungeon-crawler hero. Plain flat magenta background (#FF00FF) for easy removal.
```

## 1. Один герой (еталон)

```
[STYLE BLOCK]
Front view, facing the viewer.
Character: a tuxedo cat (black fur, white muzzle, white blaze between the eyes, white paws, white tail tip), cyan eyes,
wearing a short teal robe with gold trim down the front, a small gold star on the chest, a brown leather belt with a gold buckle and a pouch, dark boots.
```

## 1б. Кіт, який виглядає як кіт (після першої спроби)

Перша спроба з прикріпленим `reference-cat.png` майже скопіювала наш малюнок, а голова «смокінга» з білим трикутником читалась як гібрид кота й миші.
Тут **без** прикріпленого зразка, з явними котячими рисами й іншим забарвленням:

```
Pixel art game sprite of a cute chibi cat hero, exactly 48x48 pixels, shown upscaled 10x with perfectly square pixels, front view, standing on two legs.
Make it clearly a CAT, not a mouse or a bear:
- head wider than tall, slightly flat on top, with fluffy cheek tufts sticking out at the lower sides of the head (classic cat face silhouette)
- two big TRIANGULAR pointed ears at the top corners of the head, set wide apart, pink inside with small tufts of fur
- big almond-shaped eyes with vertical slit pupils and white highlights
- a small pink triangle nose, a tiny "w" mouth, whisker pads with 2-3 thin whiskers on each side
- tabby markings: an "M" on the forehead and stripes on the cheeks
Fur: orange ginger tabby with a cream muzzle and chest.
Proportions: head about 55% of the height, small body, short legs, little paws.
Outfit: short teal adventurer's tunic with gold trim, brown leather belt with a buckle and a pouch, small dark boots.
Holds a short sword in its right paw (left side of the picture) and a small iron lantern with a lit flame in its left paw. A striped tail curls up behind it.
Style: 1-pixel dark outline around every part, 3-tone shading with light from the top-left, limited palette, no anti-aliasing, no gradients, no blur, hard pixel edges.
Plain flat magenta background (#FF00FF).
```

Щоб вибрати забарвлення, додай у кінець:

```
Make 4 versions side by side, same pose and outfit, different coats:
1 orange ginger tabby, 2 grey tabby, 3 calico (white with orange and black patches), 4 siamese (cream body, dark brown face, ears, paws and tail, blue eyes).
```

**Затверджено власником (2026-10-06):** рудий таббі — `approved-cat.webp`. Це тепер еталон стилю: прикріплюй його до всіх наступних запитів.

## 1в. Пес (на вибір замість кота)

Прикріпи `approved-cat.webp`:

```
Same style, size, pose, outfit and pixel density as the attached cat, but make it a DOG instead of a cat.
Make it clearly a DOG:
- a short rounded snout that sticks out a little from the face, a big black nose with a white highlight, a happy open mouth with a small pink tongue
- triangular ears with rounded tips set on top of the head
- round friendly eyes with white highlights, small cream "eyebrow" dots above the eyes
- cream cheeks, muzzle and chest
- a fluffy tail curled over its back
Fur: shiba inu, red-orange with cream markings.
Keep the teal tunic with gold trim, the belt with buckle and pouch, the boots, the sword in its right paw and the lantern in its left paw exactly the same.
Plain flat magenta background (#FF00FF).
```

Варіанти породи — допиши в кінець:

```
Make 4 versions side by side, same pose and outfit:
1 shiba inu (red-orange and cream), 2 corgi (orange and white, big upright ears), 3 husky (grey and white, blue eyes), 4 beagle (brown, black and white, long floppy ears).
```

**Затверджено власником (2026-10-06):** усі 4 пси — `approved-dogs.webp` (шиба, коргі, хаскі, бігль).

## 1г. Чотири коти (як пси)

Прикріпи `approved-cat.webp` і `approved-dogs.webp`:

```
Same style, size, pose, outfit, layout and pixel density as the attached images (one cat, four dogs).
Make 4 CATS side by side, arranged exactly like the four dogs, all wearing the same teal tunic with gold trim, the belt with buckle and pouch and the boots, with the sword in the right paw and the lantern in the left paw.
Each must clearly read as a cat: head wider than tall with fluffy cheek tufts, big triangular pointed ears, almond-shaped eyes with vertical slit pupils and white highlights, a small pink triangle nose, a tiny "w" smile, whiskers, a long tail curling up behind.
1 orange ginger tabby with an "M" on the forehead and green eyes (exactly like the attached cat),
2 grey silver tabby with dark stripes and yellow eyes,
3 calico: white with orange and black patches, amber eyes,
4 siamese: cream body with a dark brown face mask, ears, paws and tail, blue eyes.
Plain flat magenta background (#FF00FF).
```

## 1д. Коти різних порід (силуети різні, не лише колір)

Пси вийшли трохи однаковими: та сама голова, лише інший колір. Тому тут кожна порода має свою форму голови, вух і хутра.
Прикріпи `approved-cat.webp` і `approved-dogs.webp`:

```
Same style, size, pose, outfit, layout and pixel density as the attached images.
Make 4 CATS of very different breeds side by side, each with its OWN head shape, ears, fur length and silhouette (not just a recolor of one cat).
All wear the same teal tunic with gold trim, the belt with buckle and pouch and the boots, with the sword in the right paw and the lantern in the left paw.
1 Maine Coon: big and fluffy, brown tabby, long lynx tufts on the tips of its ears, a thick fur ruff around the neck, a huge bushy tail, green eyes.
2 Scottish Fold: very round chubby face, small ears folded down flat against the head, huge round copper eyes, short blue-grey plush fur.
3 Sphynx: hairless, pink-beige skin with a few wrinkles on the forehead, giant wide bat-like ears, big lemon-green eyes, a thin whip-like tail.
4 Siamese: slim, wedge-shaped face, large pointed ears, cream body with a dark brown face mask, ears, paws and tail, bright blue eyes.
Plain flat magenta background (#FF00FF).
```

Якщо захочеш перегенерувати псів так само, заміни список порід на: pug (flat wrinkled face, curly tail), poodle (curly fluffy fur, pom-pom ears), dachshund (long body, long floppy ears), french bulldog (bat ears, squished face).

## 2. Усі сім класів (аркуш)

```
[STYLE BLOCK]
Character sheet: 7 different heroes in one row, same style, same size and same pose (front view), each in its own 48x48 cell, evenly spaced.
1. Wanderer: small grey mouse with big round pink-lined ears, simple brown jacket, no hat.
2. Prospector: brown bear cub with round ears, yellow miner's helmet with a headlamp, blue overalls.
3. Seer: tuxedo cat (black, white muzzle and paws), glowing cyan eyes, teal robe with gold trim, pointed teal wizard hat with a gold star.
4. Lamplighter: orange fox with white cheeks and a big fluffy white-tipped tail, black top hat with a red band, dark purple coat with brass buttons.
5. Pathfinder: white rabbit with long upright ears poking through a green ranger cap with a white feather, green tunic, leather belt.
6. Duelist: black-and-tan shiba inu dog with a curled tail, steel helmet with small horns and holes for its ears, blue tunic.
7. Scavenger: grey raccoon with a dark eye mask and a striped tail, brass goggles on its forehead, olive jacket with pouches.
```

## 3. Обладунки (на одному персонажі, щоб вибрати)

```
[STYLE BLOCK]
Same tuxedo cat as the attached image, front view, in 12 different armour sets, arranged in a 4x3 grid, each in its own 48x48 cell, same pose:
1 leather (leather cap, jerkin with shoulder pads, belt pouch),
2 chain mail (mail coif around the face, ears poking out),
3 knight plate (open-face steel helmet with cheek guards, rivets and a red feather plume, ears through holes in the helmet, round pauldrons, blue tabard),
4 ember plate (black obsidian plate with glowing orange cracks, flame-shaped horns on the helmet),
5 samurai (black kabuto helmet with a gold crescent, red lacquered plates),
6 viking (iron cap, fur mantle on the shoulders),
7 paladin (white winged helmet, gold pauldrons, gold cross on the chest),
8 assassin (dark hood with cat ears, scarf mask over the lower face),
9 crystal (cyan crystal plates and a crystal tiara),
10 dark knight (black spiked plate, closed helmet with a glowing red eye slit),
11 royal (gold crown with gems, ermine collar, red cape),
12 mage (long starry robe and a tall pointed hat).
Keep the face visible except for the dark knight.
```

Готові ідеї обладунків, які ми вже малювали, є в `armor-ideas.png`.

## 4. Аркуш анімації (для гри)

Робиться **окремо для кожного героя**, з прикріпленим еталоном цього героя.

```
[STYLE BLOCK]
Sprite sheet of the attached character, a grid of 5 columns x 4 rows, each cell exactly 48x48 pixels, no gaps, no labels, the feet on the same baseline in every cell.
Rows: 1 facing down (toward the viewer), 2 facing left, 3 facing right, 4 facing up (back view).
Columns: 1 idle, 2 walk step (left foot forward), 3 walk step (right foot forward), 4 sword wind-up (sword raised behind the head), 5 sword strike (sword swung forward, body leaning into the blow).
The sword is ALWAYS in the right paw and the lantern in the left paw: do not mirror left and right.
Seen from the left the sword is behind the body; seen from the right it is in front.
```

## 5. Обладунок на конкретного героя (правка в Nano Banana)

```
Same character as the attached image, same pose, same style and palette, but now wearing [NAME OF THE ARMOUR SET from prompt 3].
Keep the face, ears and tail exactly the same.
```

---

Порада: якщо модель «з'їжджає» зі стилю, повтор фразу `no anti-aliasing, hard pixel edges, perfectly square pixels` і зменш кількість персонажів в одному запиті.

---

# Моби (2026-10-06)

Власник: «мінімалізм, і щоб підходили під тему підземелля», і можна **нових мобів**.
Поведінку в грі не міняємо (хто б'є хрестом навколо себе, хто лінією вперед, хто не рухається, хто швидкий): змінюються тільки вигляд і назва.
Внутрішні id у коді лишаються старими (`src/game/enemies.ts`), тож сейви й перевірка рекордів не ламаються.

| Новий моб | Замість (id) | Як б'є в грі |
| --- | --- | --- |
| Воскова свічечка (Waxling) | `wickgnaw` | слабкий, кусає все навколо себе (хрест, 1) |
| Печерний павук | `snaretoad` | повільний, стріляє павутиною на 3 клітинки лінією, замах 2 ходи |
| Печерний міль (Lantern Moth) | `cinder-hound` | швидкий, пікірує на 3 клітинки лінією |
| Скелет-лучник | `chaincoil` | не рухається, стріляє на 4 клітинки лінією |
| Блукаючий вогник (Wisp) | `needle-wraith` | крихкий і швидкий, кидає іскру на 3 клітинки |
| Кам'яний голем | `sootplate` | броньований, 2 ходи замаху, б'є навколо себе |
| Краб у черепі (Skull Crab) | `hollow-burrower` | вистрибує поруч і кусає навколо себе |
| Гриб-спороносець | `fourfold-bell` | випускає спори в 4 боки на 2 клітинки |
| Біс (Imp) | `rift-leaper` | дуже швидкий, стрибає на 3 клітинки лінією |
| Цербер (бос) | — | лишається |

У грі моби дивляться **вправо** (вліво гра віддзеркалює сама) і мають 4 кадри: стоїть, рух, замах, удар.

## М1. Усі моби одним рядком

Прикріпи одного з героїв, наприклад `characters/cat-ginger-tabby.png`, щоб збіглись стиль і розмір:

```
Pixel art game sprites for a dark dungeon crawler, the same pixel density, outline and shading as the attached hero (a cat in a teal tunic).
Minimalist classic dungeon monsters: a simple, instantly readable silhouette, 2-3 main colours plus a 1-pixel dark outline, one small glowing accent (eyes, embers or runes), no text.
Colours chosen to stand out on a dark stone floor. Cute-creepy, not gory.
Side view, every monster facing RIGHT, each noticeably smaller than the hero (about 50-75% of its height; the slime, wisp and bat are the smallest, the golem the biggest).
A lineup of 9 monsters in one row, evenly spaced, all on the same baseline:
1 Slime: a small translucent green slime blob with two dot eyes.
2 Cave Spider: a dark purple spider with a round body and a few glowing red eyes.
3 Bat: a small brown-black bat with spread wings and pointy ears, hovering.
4 Skeleton Archer: a short chibi skeleton holding a small bow, bone white with dark eye sockets.
5 Wisp: a floating ball of pale blue fire with a small face.
6 Stone Golem: a chunky grey stone golem with moss on its shoulders and glowing rune eyes.
7 Mimic: a wooden treasure chest with a toothy mouth and a tongue, on little legs.
8 Spore Shroom: a walking red-capped mushroom with white spots and tiny feet.
9 Imp: a small red imp with little horns, bat wings and a pointed tail.
Plain flat magenta background (#FF00FF).
```

**Затверджено (2026-10-06):** рядок `mobs-lineup-v1.webp` — павук, скелет-лучник, вогник, голем, гриб, біс.
Слиз, кажана й скриню-міміка власник прибрав: надто схожі на OCH. Поведінку лишаємо, вигляд новий (М1б).

## М1б. Три нові замість слизу, кажана й міміка

Прикріпи `mobs-lineup-v1.webp`:

```
Same style, pixel density, outline, palette and scale as the attached lineup of monsters.
Make 3 NEW monsters in one row, evenly spaced, same baseline, side view facing RIGHT. They must not look like slimes, bats or treasure-chest mimics.
1 Waxling (about the size of the green slime in the lineup): a small living stub of melted candle wax, a tiny flame burning on its head, two dot eyes, drips of wax for feet.
2 Lantern Moth (about the size of the bat): a dusty grey-brown cave moth hovering, big fuzzy wings with two glowing orange eye-spots, feathery antennae.
3 Skull Crab (about the size of the chest): a small hermit crab living in a cracked old skull as its shell, two claws out, eyes on stalks.
Plain flat magenta background (#FF00FF).
```

## М2. Анімація одного моба

Виріж моба з рядка М1 і прикріпи **тільки його**. У промпті заміни `[ЗАМАХ]` і `[УДАР]` рядком із таблиці нижче.

```
Sprite strip of the attached monster, same style, palette, size and pixel density.
4 frames in one row, no gaps, no labels, the same baseline in every frame, always facing RIGHT, everything inside its frame:
1 idle, 2 moving (a step, a hop or a flap), 3 wind-up: [ЗАМАХ], 4 attack: [УДАР].
Plain flat magenta background (#FF00FF).
```

| Моб | [ЗАМАХ] | [УДАР] |
| --- | --- | --- |
| Waxling | its flame flares up, body squashes down | springs forward, dripping wax |
| Cave Spider | rears up on its back legs | shoots a strand of web forward |
| Lantern Moth | pulls its wings up high | dives forward, wings swept back |
| Skeleton Archer | draws the bow | releases the arrow forward |
| Wisp | flickers brighter and shrinks | throws a small spark forward |
| Stone Golem | raises both fists overhead | slams the ground with a shockwave |
| Skull Crab | hides inside the skull, claws raised | pops out snapping both claws |
| Spore Shroom | the cap puffs up | bursts a cloud of spores around it |
| Imp | crouches, wings spread | leaps forward, claws out |

## М3. Бос — Цербер (за бажанням)

```
Same style and pixel density as the attached images. Boss monster: Cerberus, a three-headed hound of the deep, about twice the hero's height,
dark purple-grey fur, glowing red eyes, a mane of small flames along its back. Minimalist, readable silhouette, 1-pixel dark outline.
Side view facing RIGHT. 4 frames in one row, same baseline: 1 idle, 2 step, 3 wind-up (the heads rear back), 4 attack (all three heads lunge, the flames flare).
Plain flat magenta background (#FF00FF).
```

Готові смужки клади в `art/mobs/raw/<id>.webp` і запускай `node scripts/sprite-sheets.mjs mobs`, де id — старий id з таблиці вгорі (наприклад, слиз — `wickgnaw.webp`, Цербер — `cerberus.webp`).

---

## Виправлення очей на аркушах героїв (2026-10-06)

Прикріпи оригінальний аркуш героя (`art/heroes/raw/<герой>.webp`) і встав промпт, замінивши `[ОЧІ]` рядком з таблиці.

```
Edit the attached sprite sheet. Keep EVERYTHING exactly the same: the grid of 5 columns x 4 rows, every pose, the outfit, the sword, the lantern, the colours, the size and the magenta background. Change ONLY the eyes.
In every frame where the face shows, both eyes must be identical to each other and the same in every frame: [ОЧІ].
Each eye: a dark outline, a solid iris, a dark pupil and one small white shine in its top-left corner, the shine on the same side in both eyes. Both eyes the same size and shape, level with each other, open and round (not narrow, not flat).
In side-view frames the one visible eye is drawn the same way.
```

| Герой | [ОЧІ] |
| --- | --- |
| Рудий таббі | broad round green eyes with a round black pupil and a friendly expression |
| Мейн-кун | big round green eyes with a vertical black pupil |
| Шотландська висловуха | big round amber-orange eyes with a round black pupil |
| Коргі | round shiny dark brown, almost black eyes |
| Хаскі | round bright blue eyes with a round black pupil |

Оновлення 2026-10-07: очі більше не перемальовуються скриптом. `PLAIN`, `sameEyes` і `paintEyes` видалені; ігрові PNG мають щільність 2× (клітинка 128×112, аркуш 640×448) при незмінному логічному розмірі героя. Спершу перенось новий оригінал через `node scripts/sprite-sheets.mjs heroes <герой>` і дивись у грі. Задні кадри котів і корекція кінчика хвоста рудого ще прив'язані до старих картинок — після заміни оригіналу перевір їх окремо.

### Округлі очі рудого таббі та хаскі (2026-10-07)

Власник попросив прибрати тонкі очі й непривітний вираз у цих двох героїв. Застосовано вбудований `image_gen`:
ширші округлі зелені/блакитні райдужки, круглі темні зіниці, маленькі білі відблиски; усе інше збережено.
Точні промпти й результати: [art/heroes/eye-edits/2026-10-07](../../art/heroes/eye-edits/2026-10-07/README.md).
Із згенерованих аркушів перенесено лише 20 ділянок очей на кожного героя; пікселі джерела поза ними незмінні.
Оновлені джерела вже в `art/heroes/raw/`, ігрові PNG — у `public/heroes/`.
Старі джерела збережені в `art/heroes/eye-edits/2026-10-07/originals/`.
Для цих двох героїв більше не просити вертикальні зіниці: власник обрав округлий, дружній вираз.

---

# Предмети й лут (2026-10-10)

Власник: «глечики й інші предмети, з яких падає лут, мають бути як мінімум рівня мобів і героїв, а не 2D-фігня».
Зараз вони намальовані кодом (16×16). Гра вже вміє брати AI-арт: щойно з'являється файл, вона малює його, а поки файлу немає — старий спрайт.

| Що | Файл | Розмір у грі (висота) |
| --- | --- | --- |
| Глек (Clay Urn) | `art/props/raw/urn.webp` | 20 px |
| Ящик (Wooden Crate) | `art/props/raw/crate.webp` | 20 px |
| Бочка (Iron-bound Barrel) | `art/props/raw/barrel.webp` | 24 px |
| Старий мішок (Old Sack) | `art/props/raw/sack.webp` | 18 px |
| Лут і скрині одним рядком | `art/props/raw/loot.webp` | золото 12, кристал 16, олія 16, скриня 18, Sealed Vault 22, скриня Цербера 24 |

Для порівняння: герой 42 px, найменший моб 20, голем 36. Предмети стоять на клітинці підлоги 32×32, вигляд **спереду й трохи згори** (як герої), не збоку.

**Затверджено (2026-10-11):** глек, ящик і бочка з `docs/art/props-lineup-v2.webp`, мішок з `props-lineup-v1.webp` (замість купи кісток: власник — «кістки дивно виглядають, хай будуть просто інтер'єром»).
Вирізані з них кадри «ціле» вже в `art/props/raw/` і в грі (щільність 2×, як у героїв). Для П2 прикріплюй саме їх.

Порядок: **П1** (усі чотири разом, щоб вибрати вигляд) → **П2** для кожного затвердженого (3 кадри) → **П3** (лут і скрині).
Готові картинки клади у `art/props/raw/` під іменами з таблиці і запускай `node scripts/sprite-sheets.mjs props`:
скрипт прибере фон, зменшить і покладе `public/props/<ім'я>.png`. Після цього перезавантаж гру.

## П1. Чотири предмети одним рядком

Прикріпи `docs/art/mobs-lineup-v2.webp` і `docs/art/characters/cat-ginger-tabby.png`, щоб збіглись стиль, щільність пікселів і масштаб:

```
Pixel art game sprites for a dark dungeon crawler, the same pixel density, 1-pixel dark outline, 3-tone shading with light from the top-left and limited palette as the attached hero and monsters.
Breakable dungeon props, NOT characters: no faces, no eyes, no legs.
A lineup of 4 props in one row, evenly spaced, all on the same baseline, seen from the front and slightly from above (3/4 view), each with a small dark contact shadow:
1 Clay Urn: a round terracotta urn with a narrow neck and a rolled lip, two painted ochre bands, a small chip on the rim. About half the hero's height.
2 Wooden Crate: a square wooden crate, plank seams, darker diagonal cross-brace, iron corner brackets with nails. About half the hero's height, wider than the urn.
3 Iron-bound Barrel: a stout oak barrel, two dark iron hoops with rivets, a bung hole on the side. About 60% of the hero's height.
4 Bone Pile: a low heap of old bones with a cracked skull on top and a rusty coin peeking out between them. About a third of the hero's height.
Rich materials and small details (wood grain, glaze cracks, rivets, worn edges), colours that read clearly on a dark teal stone floor. No text, no glow.
Plain flat magenta background (#FF00FF).
```

## П2. Смужка одного предмета (3 кадри)

Виріж затверджений предмет із П1 і прикріпи **тільки його**. Заміни `[ПРЕДМЕТ]`, `[УШКОДЖЕННЯ]` і `[РОЗЛАМ]` рядком із таблиці:

```
Sprite strip of the attached [ПРЕДМЕТ], same style, palette, size and pixel density.
3 frames in one row, no gaps, no labels, the prop in the same place and on the same baseline in every frame:
1 whole, exactly as attached.
2 damaged: [УШКОДЖЕННЯ]. Same size and outline as frame 1.
3 breaking apart: [РОЗЛАМ], a few pieces flying outward a little and a puff of dust, everything staying inside its own frame.
Plain flat magenta background (#FF00FF).
```

| Предмет | [ПРЕДМЕТ] | [УШКОДЖЕННЯ] | [РОЗЛАМ] |
| --- | --- | --- | --- |
| Глек | clay urn | a big crack running down the body and a missing chip at the lip | the urn bursting into curved terracotta shards |
| Ящик | wooden crate | a split plank and a loose, bent corner bracket | the planks splitting apart, splinters and a nail flying |
| Бочка | iron-bound barrel | a dented hoop and a cracked stave | the staves falling outward, a hoop springing loose |
| Мішок | burlap sack | a rip in the side with a few coins peeking out | the sack tearing open, coins and scraps of cloth flying |

## П3. Лут і скрині одним рядком

Прикріпи затверджений рядок П1:

```
Same style, pixel density, outline and palette as the attached props.
Six loot items in one row, evenly spaced, same baseline, seen from the front and slightly from above, each with a small dark contact shadow, left to right:
1 a small pile of gold coins (the smallest, about a quarter of the urn's height), bright yellow with one white glint;
2 a cluster of three cyan crystals, faint inner glow;
3 a small glass oil flask with a cork, lime-green oil inside;
4 a small wooden treasure chest with brass trim and a keyhole (closed);
5 a Sealed Vault: a heavy grey stone coffer with a purple glowing rune lock, a bit bigger than the chest;
6 the Cerberus Hoard: a dark iron chest wrapped in chains, an orange-glowing seam under the lid and two small flames on top, the biggest of the six.
Plain flat magenta background (#FF00FF).
```

Скрипт сам розріже рядок на шість клітинок і зменшить кожну до її висоти з таблиці вгорі, тож однаковий розмір на картинці не потрібен.

## П2б. Довша анімація: 6 етапів (2026-10-11)

Власник: «ахірена анімація вийде, можна навіть розбити на 5-6 етапів». Гра й скрипт розуміють смужку з 1, 3 або 6 кадрів:
**6 = ціле, 2 стадії тріщин, 3 стадії розламу.** Тріщини гра показує за тим, скільки ударів лишилось (друга — коли взято половину або більше: ящик після першого з двох), розлам програється за ~0,56 с.

**Затверджено (2026-10-11):** глек і ящик (6 кадрів). Для предмета з одним кадром (`props-lineup-v2.webp`) — промпт нижче, але «the wooden crate from the attached image (the second prop from the left)» замість 3-кадрової смужки.
Прикріпи готову 3-кадрову смужку цього предмета (`art/props/raw/<предмет>.webp`):

```
Make a longer version of the attached 3-frame sprite strip of a [ПРЕДМЕТ]: 6 frames in one row, the same style, palette, size, pixel density and baseline; no gaps, no labels:
1 whole: the same as frame 1 of the attached strip.
2 a small crack: between frame 1 and frame 2 of the attached strip.
3 badly damaged: the same as frame 2 of the attached strip.
4 starting to break: the cracks open up, the first chips flying off, the [ПРЕДМЕТ] still mostly standing.
5 bursting apart: the same as frame 3 of the attached strip.
6 the pieces lying low on the floor, a fading puff of dust.
Everything stays inside its own frame. Plain flat magenta background (#FF00FF).
```
