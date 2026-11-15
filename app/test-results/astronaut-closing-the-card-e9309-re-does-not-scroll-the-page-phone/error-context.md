# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: astronaut.spec.js >> closing the card opened from the 3D figure does not scroll the page
- Location: tests\astronaut.spec.js:43:1

# Error details

```
Error: expect(received).not.toBeNull()

Received: null
```

# Page snapshot

```yaml
- generic [active] [ref=f3e1]:
  - link "Skip to content" [ref=f3e4] [cursor=pointer]:
    - /url: "#main"
  - banner [ref=f3e5]:
    - generic [ref=f3e6]:
      - img "NASA Space Apps Challenge 2026" [ref=f3e7]
      - generic [ref=f3e8]:
        - generic "Mission and connection status" [ref=f3e9]:
          - generic [ref=f3e10]:
            - term [ref=f3e11]: Phase
            - definition [ref=f3e12]: In flight · day 286
          - generic [ref=f3e13]:
            - term [ref=f3e14]: Last sync
            - definition [ref=f3e15]:
              - time [ref=f3e16]: 14:49 UTC
          - generic [ref=f3e17]:
            - term [ref=f3e18]: Signal delay
            - definition [ref=f3e19]: < 1 s
          - generic [ref=f3e20]:
            - term [ref=f3e21]: Medical lead
            - definition [ref=f3e22]: Flight surgeon (ground)
        - generic [ref=f3e23]:
          - button "Switch to dark theme" [ref=f3e24] [cursor=pointer]:
            - generic [ref=f3e27]: Dark
          - button "Ask the assistant" [ref=f3e28] [cursor=pointer]:
            - generic [ref=f3e32]: Ask
          - 'button "SOS: get help now" [ref=f3e33] [cursor=pointer]':
            - generic [ref=f3e36]: SOS
      - paragraph [ref=f3e37]
  - main [ref=f3e38]:
    - generic [ref=f3e41]:
      - img "Mission mascot, an astronaut waving hello" [ref=f3e42]
      - generic [ref=f3e43]:
        - paragraph [ref=f3e44]: Mission day 286 of 365 · One-Year Mission
        - heading "Good afternoon, Helena Silva" [level=1] [ref=f3e45]
        - paragraph [ref=f3e46]: "One reading needs attention today: your body temperature. Here is what to do."
    - region "Your body now" [ref=f3e47]:
      - generic [ref=f3e48]:
        - generic [ref=f3e49]:
          - generic [ref=f3e50]:
            - heading "Your body now" [level=2] [ref=f3e51]
            - paragraph [ref=f3e52]:
              - generic [ref=f3e54]: Live from your shirt, water dispenser and exercise devices · 14:49 UTC
          - button "Log nausea or vomiting" [ref=f3e55] [cursor=pointer]
        - generic [ref=f3e59]:
          - paragraph [ref=f3e60]: Readiness dropped 3 points since yesterday. Your body temperature needs attention.
          - button "See what to do" [ref=f3e61] [cursor=pointer]
        - generic [ref=f3e63]:
          - generic [ref=f3e64]:
            - paragraph [ref=f3e65]:
              - generic [ref=f3e66]: "86"
              - generic [ref=f3e67]: /100 readiness
            - generic [ref=f3e68]: Ready for EVA
          - generic [ref=f3e72]:
            - list "Log a symptom on a body region":
              - listitem:
                - 'button "Log a symptom: Head" [ref=f3e75]'
              - listitem:
                - 'button "Log a symptom: Chest" [ref=f3e76]'
              - listitem:
                - 'button "Log a symptom: Abdomen & metabolism" [ref=f3e77]'
              - listitem:
                - 'button "Log a symptom: Back" [ref=f3e78]'
              - listitem:
                - 'button "Log a symptom: Arms & hands" [ref=f3e79]'
              - listitem:
                - 'button "Log a symptom: Legs & feet" [ref=f3e80]'
            - generic [ref=f3e81]:
              - button "Turn the astronaut left" [ref=f3e82] [cursor=pointer]
              - paragraph [ref=f3e86]: Drag to turn · tap a dot or the body
              - button "Turn the astronaut right" [ref=f3e87] [cursor=pointer]
          - list "Vital signs" [ref=f3e91]:
            - listitem [ref=f3e92]:
              - button "Heart rate 63 bpm OK" [ref=f3e93] [cursor=pointer]:
                - generic [ref=f3e96]:
                  - generic [ref=f3e97]: Heart rate
                  - generic [ref=f3e98]: 63 bpm
                - generic [ref=f3e99]: OK
            - listitem [ref=f3e103]:
              - button "Blood pressure 117/77 mmHg OK" [ref=f3e104] [cursor=pointer]:
                - generic [ref=f3e107]:
                  - generic [ref=f3e108]: Blood pressure
                  - generic [ref=f3e109]: 117/77 mmHg
                - generic [ref=f3e110]: OK
            - listitem [ref=f3e114]:
              - button "Oxygen saturation 98 % SpO₂ OK" [ref=f3e115] [cursor=pointer]:
                - generic [ref=f3e118]:
                  - generic [ref=f3e119]: Oxygen saturation
                  - generic [ref=f3e120]: 98 % SpO₂
                - generic [ref=f3e121]: OK
            - listitem [ref=f3e125]:
              - button "Respiration 15 breaths/min OK" [ref=f3e126] [cursor=pointer]:
                - generic [ref=f3e129]:
                  - generic [ref=f3e130]: Respiration
                  - generic [ref=f3e131]: 15 breaths/min
                - generic [ref=f3e132]: OK
          - list "Temperature, sleep, water and exercise" [ref=f3e136]:
            - listitem [ref=f3e137]:
              - button "Body temperature 37.6 °C Watch" [ref=f3e138] [cursor=pointer]:
                - generic [ref=f3e141]:
                  - generic [ref=f3e142]: Body temperature
                  - generic [ref=f3e143]: 37.6 °C
                - generic [ref=f3e144]: Watch
            - listitem [ref=f3e148]:
              - button "Sleep 7 h 10 min OK" [ref=f3e149] [cursor=pointer]:
                - generic [ref=f3e152]:
                  - generic [ref=f3e153]: Sleep
                  - generic [ref=f3e154]: 7 h 10 min
                - generic [ref=f3e155]: OK
            - listitem [ref=f3e159]:
              - button "Hydration 1.9 of 2.5 L OK" [ref=f3e160] [cursor=pointer]:
                - generic [ref=f3e163]:
                  - generic [ref=f3e164]: Hydration
                  - generic [ref=f3e165]: 1.9 of 2.5 L
                - generic [ref=f3e166]: OK
            - listitem [ref=f3e170]:
              - button "Exercise 45 of 120 min OK" [ref=f3e171] [cursor=pointer]:
                - generic [ref=f3e174]:
                  - generic [ref=f3e175]: Exercise
                  - generic [ref=f3e176]: 45 of 120 min
                - generic [ref=f3e177]: OK
        - paragraph [ref=f3e181]
        - group [ref=f3e182]:
          - generic "What does readiness mean?" [ref=f3e183] [cursor=pointer]
        - paragraph [ref=f3e185]:
          - text: "3D astronaut model:"
          - link "NASA 3D Resources" [ref=f3e186] [cursor=pointer]:
            - /url: https://science.nasa.gov/3d-resources/
        - paragraph [ref=f3e187]
    - region "Body mass, blood glucose and radiation" [ref=f3e188]:
      - generic [ref=f3e189]:
        - article [ref=f3e190]:
          - generic [ref=f3e191]:
            - heading "Body mass" [level=2] [ref=f3e192]
            - generic [ref=f3e193]: Expected
          - paragraph [ref=f3e198]:
            - strong [ref=f3e199]: "70.2"
            - generic [ref=f3e200]: kg
          - paragraph [ref=f3e203]: "2.4 kg less than at launch · Trend: slowly falling · Measured on day 286 (SLAMMD)"
          - link "See body trends" [ref=f3e204] [cursor=pointer]:
            - /url: pages/body/index.html
        - article [ref=f3e206]:
          - generic [ref=f3e207]:
            - heading "Blood glucose" [level=2] [ref=f3e208]
            - generic [ref=f3e209]: In range
          - paragraph [ref=f3e214]:
            - strong [ref=f3e215]: "96"
            - generic [ref=f3e216]: mg/dL
          - paragraph [ref=f3e219]: Measured at 07:10 UTC · glucometer · normal 70–140 mg/dL
          - generic [ref=f3e220]:
            - paragraph [ref=f3e221]: "What to do: In range. Measure again tomorrow before breakfast."
            - group [ref=f3e222]:
              - generic "How it is measured and why it matters" [ref=f3e223] [cursor=pointer]
            - generic [ref=f3e225]:
              - 'button "Explain out loud: blood glucose" [ref=f3e226] [cursor=pointer]':
                - generic [ref=f3e227]: Explain out loud
              - 'link "Learn about this risk: blood glucose" [ref=f3e228] [cursor=pointer]':
                - /url: http://localhost:8090/pages/learn/index.html#risk-nutrition
                - generic [ref=f3e229]: Learn about this risk
          - generic [ref=f3e230]:
            - button "Measure now" [ref=f3e231] [cursor=pointer]
            - link "See all readings" [ref=f3e233] [cursor=pointer]:
              - /url: pages/vitals/index.html#glucose
        - article [ref=f3e235]:
          - generic [ref=f3e236]:
            - heading "Radiation dose" [level=2] [ref=f3e237]
            - generic [ref=f3e238]: Within limit
          - generic [ref=f3e242]:
            - paragraph [ref=f3e243]:
              - strong [ref=f3e244]: "232"
              - generic [ref=f3e245]: of 600 mSv career limit
            - list [aria-hidden] [ref=f3e250]:
              - listitem [ref=f3e251]: Received
              - listitem [ref=f3e253]: Projected by mission end
            - generic [ref=f3e255]:
              - generic [ref=f3e256]:
                - term [ref=f3e257]: Today
                - definition [ref=f3e258]: 0.60 mSv
              - generic [ref=f3e259]:
                - term [ref=f3e260]: Projected at mission end
                - definition [ref=f3e261]: 279 mSv
            - paragraph [ref=f3e262]: You are well within your career limit.
            - generic [ref=f3e263]:
              - generic [ref=f3e264]:
                - heading "Space weather" [level=3] [ref=f3e265]
                - generic [ref=f3e266]: Quiet
              - paragraph [ref=f3e270]: No radiation storms this week. 14 solar eruptions, all slow (fastest 974 km/s). No action needed.
              - paragraph [ref=f3e271]: "Source: NASA DONKI, last 7 days · updated 14:49 UTC"
          - generic [ref=f3e272]:
            - group [ref=f3e273]:
              - generic "What is mSv?" [ref=f3e274] [cursor=pointer]
            - group [ref=f3e276]:
              - generic "What does this mean for fertility?" [ref=f3e277] [cursor=pointer]
    - region "Health tasks today" [ref=f3e279]:
      - generic [ref=f3e280]:
        - generic [ref=f3e281]:
          - generic [ref=f3e282]:
            - heading "Health tasks today" [level=2] [ref=f3e283]
            - paragraph [ref=f3e284]: Tap a task to mark it as done. You can undo it anytime.
          - paragraph [ref=f3e285]: 2 of 6 done
        - paragraph [ref=f3e286]:
          - generic [ref=f3e290]: "Next: Private medical conference at 14:00 UTC · then Exercise session at 14:00 UTC · then Mood check-in at 20:00 UTC"
        - list [ref=f3e291]:
          - listitem [ref=f3e292]:
            - generic [ref=f3e293] [cursor=pointer]:
              - checkbox "Morning saliva collection Immune system check · done at 07:15" [checked] [ref=f3e294]
              - generic [ref=f3e295]:
                - generic [ref=f3e296]: Morning saliva collection
                - generic [ref=f3e297]: Immune system check · done at 07:15
          - listitem [ref=f3e298]:
            - generic [ref=f3e299] [cursor=pointer]:
              - checkbox "Blood glucose check Done at 07:10 UTC · 96 mg/dL" [checked] [ref=f3e300]
              - generic [ref=f3e301]:
                - generic [ref=f3e302]: Blood glucose check
                - generic [ref=f3e303]: Done at 07:10 UTC · 96 mg/dL
          - listitem [ref=f3e304]:
            - generic [ref=f3e305] [cursor=pointer]:
              - checkbox "Exercise session 45 of 120 min · logged by the exercise devices" [ref=f3e306]
              - generic [ref=f3e307]:
                - generic [ref=f3e308]: Exercise session
                - generic [ref=f3e309]: 45 of 120 min · logged by the exercise devices
          - listitem [ref=f3e313]:
            - generic [ref=f3e314] [cursor=pointer]:
              - checkbox "Retina scan (OCT) Vision trend check · at 10:30" [ref=f3e315]
              - generic [ref=f3e316]:
                - generic [ref=f3e317]: Retina scan (OCT)
                - generic [ref=f3e318]: Vision trend check · at 10:30
          - listitem [ref=f3e319]:
            - generic [ref=f3e320] [cursor=pointer]:
              - checkbox "Private medical conference With your flight surgeon · at 14:00 · only you two can see the notes" [ref=f3e321]
              - generic [ref=f3e322]:
                - generic [ref=f3e323]: Private medical conference
                - generic [ref=f3e324]: With your flight surgeon · at 14:00 · only you two can see the notes
          - listitem [ref=f3e325]:
            - generic [ref=f3e326] [cursor=pointer]:
              - checkbox "Mood check-in One tap · sleep and vital signs come from your shirt" [ref=f3e327]
              - generic [ref=f3e328]:
                - generic [ref=f3e329]: Mood check-in
                - generic [ref=f3e330]: One tap · sleep and vital signs come from your shirt
    - region "Daily goals" [ref=f3e331]:
      - generic [ref=f3e332]:
        - generic [ref=f3e334]:
          - heading "Daily goals" [level=2] [ref=f3e335]
          - paragraph [ref=f3e336]: "Four small goals that protect your body on the mission. Only you see them: no ranking, no comparison."
        - generic [ref=f3e337]:
          - article [ref=f3e338]:
            - heading "Today" [level=3] [ref=f3e339]
            - generic [ref=f3e340]:
              - paragraph [ref=f3e350]:
                - strong [ref=f3e351]: "1"
                - generic [ref=f3e352]: of 4
              - list [ref=f3e353]:
                - listitem [ref=f3e354]:
                  - generic [ref=f3e357]:
                    - generic [ref=f3e358]: Water
                    - generic [ref=f3e359]: 1.9 of 2.5 L · met at 2.2 L
                  - generic [ref=f3e360]: To do
                - listitem [ref=f3e364]:
                  - generic [ref=f3e367]:
                    - generic [ref=f3e368]: Exercise
                    - generic [ref=f3e369]: 45 of 120 min · met at 96 min
                  - generic [ref=f3e370]: To do
                - listitem [ref=f3e374]:
                  - generic [ref=f3e377]:
                    - generic [ref=f3e378]: Sleep
                    - generic [ref=f3e379]: 7 h 10 min last night · met at 6 h 30 min
                  - generic [ref=f3e380]: Met
                - listitem [ref=f3e384]:
                  - generic [ref=f3e389]:
                    - generic [ref=f3e390]: Check-in
                    - generic [ref=f3e391]: Not yet · one tap, private
                  - generic [ref=f3e392]: To do
            - button "Check in now" [ref=f3e396] [cursor=pointer]
          - article [ref=f3e398]:
            - heading "10 days in a row" [level=3] [ref=f3e403]
            - paragraph [ref=f3e404]: A day counts when all four goals are met.
            - list "Last 7 days" [ref=f3e405]:
              - listitem [ref=f3e406]:
                - generic [ref=f3e407]: Mon
                - generic [ref=f3e410]: ": all four goals"
              - listitem [ref=f3e411]:
                - generic [ref=f3e412]: Tue
                - generic [ref=f3e415]: ": all four goals"
              - listitem [ref=f3e416]:
                - generic [ref=f3e417]: Wed
                - generic [ref=f3e420]: ": all four goals"
              - listitem [ref=f3e421]:
                - generic [ref=f3e422]: Thu
                - generic [ref=f3e425]: ": all four goals"
              - listitem [ref=f3e426]:
                - generic [ref=f3e427]: Fri
                - generic [ref=f3e430]: ": all four goals"
              - listitem [ref=f3e431]:
                - generic [ref=f3e432]: Sat
                - generic [ref=f3e435]: ": all four goals"
              - listitem [ref=f3e436]:
                - generic [ref=f3e437]: Today
                - generic [aria-hidden] [ref=f3e438]: 1/4
                - generic [ref=f3e439]: ": 1 of 4 goals"
          - article [ref=f3e440]:
            - heading "Achievements" [level=3] [ref=f3e441]
            - list [ref=f3e442]:
              - listitem [ref=f3e443]:
                - generic [ref=f3e447]:
                  - generic [ref=f3e448]: First full day
                  - generic [ref=f3e449]: All four goals in one day.
                  - generic [ref=f3e452]: Unlocked
              - listitem [ref=f3e453]:
                - generic [ref=f3e457]:
                  - generic [ref=f3e458]: Three in a row
                  - generic [ref=f3e459]: All four goals three days in a row.
                  - generic [ref=f3e462]: Unlocked
              - listitem [ref=f3e463]:
                - generic [ref=f3e467]:
                  - generic [ref=f3e468]: Full week
                  - generic [ref=f3e469]: All four goals seven days in a row.
                  - generic [ref=f3e472]: Unlocked
              - listitem [ref=f3e473]:
                - generic [ref=f3e478]:
                  - generic [ref=f3e479]: Mission month
                  - generic [ref=f3e480]: All four goals thirty days in a row.
                  - generic [ref=f3e483]: 10 of 30 days
              - listitem [ref=f3e484]:
                - generic [ref=f3e488]:
                  - generic [ref=f3e489]: Steady water
                  - generic [ref=f3e490]: Water goal seven days in a row.
                  - generic [ref=f3e493]: Unlocked
              - listitem [ref=f3e494]:
                - generic [ref=f3e498]:
                  - generic [ref=f3e499]: Strong bones
                  - generic [ref=f3e500]: Exercise goal on ten days.
                  - generic [ref=f3e503]: Unlocked
              - listitem [ref=f3e504]:
                - generic [ref=f3e508]:
                  - generic [ref=f3e509]: Rested crew
                  - generic [ref=f3e510]: Sleep goal seven nights in a row.
                  - generic [ref=f3e513]: Unlocked
              - listitem [ref=f3e514]:
                - generic [ref=f3e518]:
                  - generic [ref=f3e519]: Open line
                  - generic [ref=f3e520]: Fourteen daily check-ins.
                  - generic [ref=f3e523]: Unlocked
        - paragraph [ref=f3e524]
    - region "Your health, your rules" [ref=f3e525]:
      - generic [ref=f3e526]:
        - generic [ref=f3e528]:
          - heading "Your health, your rules" [level=2] [ref=f3e529]
          - paragraph [ref=f3e530]: Every module is optional. You decide who sees each piece of data.
        - list [ref=f3e531]:
          - listitem [ref=f3e532]:
            - heading [level=3] [ref=f3e534]:
              - link "Women's health" [ref=f3e535] [cursor=pointer]:
                - /url: pages/womens-health/index.html
            - paragraph [ref=f3e538]: Cycle, contraception, supplies and urinary symptoms. Turned on only by you. Help research on women's health, with your consent.
          - listitem [ref=f3e539]:
            - heading [level=3] [ref=f3e541]:
              - link "Privacy" [ref=f3e542] [cursor=pointer]:
                - /url: pages/privacy/index.html
            - paragraph [ref=f3e545]: Choose what your flight surgeon, the crew medical officer and researchers can see.
          - listitem [ref=f3e546]:
            - heading [level=3] [ref=f3e548]:
              - link "Body" [ref=f3e549] [cursor=pointer]:
                - /url: pages/body/index.html
            - paragraph [ref=f3e552]: Mass, bone, muscle and vision across the whole mission.
          - listitem [ref=f3e553]:
            - generic [ref=f3e554]:
              - heading "Connection" [level=3] [ref=f3e555]
              - generic [ref=f3e556]: Coming soon
            - paragraph [ref=f3e560]: What was sent to Earth, what is stored on board and the current delay.
  - contentinfo [ref=f3e561]:
    - generic [ref=f3e562]:
      - paragraph [ref=f3e563]: Prototype with simulated health data for the NASA Space Apps Challenge 2026. Radiation limit from the NASA Office of the Chief Health and Medical Officer. Space weather from NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information).
      - paragraph [ref=f3e564]: "Fonts: Fira Sans and Overpass, SIL Open Font License."
      - button "Presentation mode (demo)" [ref=f3e565] [cursor=pointer]
  - navigation "Main navigation" [ref=f3e571]:
    - list [ref=f3e573]:
      - listitem [ref=f3e574]:
        - link "Home" [ref=f3e575] [cursor=pointer]:
          - /url: "#main"
      - listitem [ref=f3e579]:
        - link "Vitals" [ref=f3e580] [cursor=pointer]:
          - /url: pages/vitals/index.html
      - listitem [ref=f3e584]:
        - link "Tasks" [ref=f3e585] [cursor=pointer]:
          - /url: "#tasks"
      - listitem [ref=f3e590]:
        - link "Privacy" [ref=f3e591] [cursor=pointer]:
          - /url: pages/privacy/index.html
      - listitem [ref=f3e596]:
        - link "Profile" [ref=f3e597] [cursor=pointer]:
          - /url: pages/profile/index.html
  - generic:
    - region "Health messages" [ref=f3e602]:
      - generic [ref=f3e603]:
        - generic [ref=f3e604]:
          - heading "Health messages" [level=2] [ref=f3e605]
          - paragraph [ref=f3e606]: Reminders and updates for today, in UTC
        - button "Minimize health messages" [ref=f3e607] [cursor=pointer]
      - list [ref=f3e609]:
        - listitem [ref=f3e610]:
          - generic [ref=f3e615]:
            - paragraph [ref=f3e616]: Reminder · 14:00 UTC
            - paragraph [ref=f3e617]: Private medical conference
            - paragraph [ref=f3e618]: With your flight surgeon.
            - paragraph [ref=f3e619]: Moved to 15:04 UTC.
            - 'link "Open: Private medical conference" [ref=f3e621] [cursor=pointer]':
              - /url: http://localhost:8090/index.html#tasks
              - text: Open
        - listitem [ref=f3e622]:
          - generic [ref=f3e627]:
            - paragraph [ref=f3e628]: Reminder · 14:00 UTC
            - paragraph [ref=f3e629]: Exercise session
            - paragraph [ref=f3e630]: Keeps bones and muscles strong.
            - generic [ref=f3e631]:
              - 'button "Done: Exercise session" [ref=f3e632] [cursor=pointer]':
                - generic [ref=f3e633]: Done
              - 'button "In 15 min: Exercise session" [ref=f3e634] [cursor=pointer]':
                - generic [ref=f3e635]: In 15 min
              - 'link "Open: Exercise session" [ref=f3e636] [cursor=pointer]':
                - /url: http://localhost:8090/index.html#tasks
                - text: Open
    - button "Health messages, 1 new" [expanded] [ref=f3e637] [cursor=pointer]:
      - generic [aria-hidden] [ref=f3e641]: "1"
    - paragraph: "New message. Reminder: Exercise session. Keeps bones and muscles strong."
```

# Test source

```ts
  1   | // Astronaut home: readiness on top of the space band, centered over the figure, and the compact cards
  2   | const { test, expect } = require("@playwright/test");
  3   | const { freshStart, signIn } = require("./helpers");
  4   | 
  5   | test("readiness is centered above the 3D astronaut", async function ({ page }) {
  6   |     await freshStart(page);
  7   |     await signIn(page, "hsilva", "in");
  8   |     const readiness = await page.locator(".astronaut-view__readiness").boundingBox();
  9   |     const stage = await page.locator(".astronaut-view__stage").boundingBox();
  10  |     expect(readiness.y + readiness.height).toBeLessThanOrEqual(stage.y + 1);
  11  |     expect(Math.abs((readiness.x + readiness.width / 2) - (stage.x + stage.width / 2))).toBeLessThan(2);
  12  |     await expect(page.locator("[data-readiness-badge]")).not.toBeEmpty();
  13  |     await expect(page.locator("[data-body-cards] li")).toHaveCount(8);
  14  |     const scrollWidth = await page.evaluate(function () {
  15  |         return document.documentElement.scrollWidth;
  16  |     });
  17  |     expect(scrollWidth).toBeLessThanOrEqual(page.viewportSize().width);
  18  | });
  19  | 
  20  | test("the floating card lines up its actions with the text", async function ({ page }) {
  21  |     await freshStart(page);
  22  |     await signIn(page, "hsilva", "in");
  23  |     await page.locator("[data-body-card]").first().click();
  24  |     const pop = page.locator(".body-pop");
  25  |     await expect(pop).toBeVisible();
  26  |     await expect(pop.locator(".health-info__learn")).toBeVisible();
  27  |     // Measured in one pass: the live readings redraw the card every few seconds
  28  |     const offsets = await pop.evaluate(function (card) {
  29  |         var todo = card.querySelector(".health-info__todo").getBoundingClientRect().left;
  30  |         return Array.prototype.filter.call(card.querySelectorAll(".health-info__actions .button__text, .body-pop__actions .button__text"), function (label) {
  31  |             return label.offsetParent !== null;
  32  |         }).map(function (label) {
  33  |             return Math.abs(label.getBoundingClientRect().left - todo);
  34  |         });
  35  |     });
  36  |     expect(offsets.length).toBeGreaterThanOrEqual(2);
  37  |     offsets.forEach(function (offset) {
  38  |         expect(offset).toBeLessThanOrEqual(1);
  39  |     });
  40  | });
  41  | 
  42  | // A tap on a sensor dot opens the card; closing it keeps the figure where it was (on phones the cards sit below)
  43  | test("closing the card opened from the 3D figure does not scroll the page", async function ({ page }) {
  44  |     await freshStart(page);
  45  |     await signIn(page, "hsilva", "in");
  46  |     await expect(page.locator(".astronaut-view__canvas--ready")).toHaveCount(1, { timeout: 90000 });
  47  |     await page.locator(".astronaut-view__stage").scrollIntoViewIfNeeded();
  48  |     const pop = page.locator(".body-pop");
  49  |     const keys = await page.locator("[data-body-card]").evaluateAll(function (cards) {
  50  |         return cards.map(function (card) {
  51  |             return card.getAttribute("data-body-card");
  52  |         });
  53  |     });
  54  |     let opened = null;
  55  |     for (const key of keys) {
  56  |         const point = await page.evaluate(function (name) {
  57  |             var host = document.querySelector("[data-astronaut-canvas]").getBoundingClientRect();
  58  |             var spot = window.App.astronautView().screenOf(name);
  59  |             return { x: host.left + spot.x, y: host.top + spot.y };
  60  |         }, key);
  61  |         await page.mouse.click(point.x, point.y);
  62  |         if (await pop.isVisible()) {
  63  |             opened = key;
  64  |             break;
  65  |         }
  66  |     }
> 67  |     expect(opened).not.toBeNull();
      |                        ^ Error: expect(received).not.toBeNull()
  68  |     for (const close of ["button", "Escape"]) {
  69  |         if (!(await pop.isVisible())) {
  70  |             const point = await page.evaluate(function (name) {
  71  |                 var host = document.querySelector("[data-astronaut-canvas]").getBoundingClientRect();
  72  |                 var spot = window.App.astronautView().screenOf(name);
  73  |                 return { x: host.left + spot.x, y: host.top + spot.y };
  74  |             }, opened);
  75  |             await page.mouse.click(point.x, point.y);
  76  |             await expect(pop).toBeVisible();
  77  |         }
  78  |         const before = await page.evaluate(function () {
  79  |             return window.scrollY;
  80  |         });
  81  |         if (close === "button") {
  82  |             await page.locator("[data-pop-close]").click();
  83  |         } else {
  84  |             await page.keyboard.press("Escape");
  85  |         }
  86  |         await expect(pop).toBeHidden();
  87  |         const after = await page.evaluate(function () {
  88  |             return window.scrollY;
  89  |         });
  90  |         expect(Math.abs(after - before)).toBeLessThanOrEqual(1);
  91  |         await expect(page.locator("[data-body-card='" + opened + "']")).toBeFocused();
  92  |     }
  93  | });
  94  | 
  95  | // The service worker would answer from its cache, out of reach of page.route: blocked here
  96  | test.describe("3D load error", function () {
  97  |     test.use({ serviceWorkers: "block" });
  98  | 
  99  |     test("a 3D load error says so and Try again loads it without reloading", async function ({ page }) {
  100 |         await page.route(/emu\.glb$/, function (route) {
  101 |             return route.abort();
  102 |         });
  103 |         await freshStart(page);
  104 |         await signIn(page, "hsilva", "in");
  105 |         const fallback = page.locator("[data-astronaut-fallback]");
  106 |         await expect(fallback).toContainText("Could not load the 3D view", { timeout: 60000 });
  107 |         const retry = page.locator("[data-astronaut-retry]");
  108 |         await expect(retry).toBeVisible();
  109 |         await page.unroute(/emu\.glb$/);
  110 |         await retry.click();
  111 |         await expect(page.locator(".astronaut-view__canvas--ready")).toHaveCount(1, { timeout: 90000 });
  112 |         await expect(fallback).toBeHidden();
  113 |         await expect(retry).toBeHidden();
  114 |     });
  115 | });
  116 | 
```