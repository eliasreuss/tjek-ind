# Tjek ind

En lille web-app til et privat fitnesscenter. Den svarer på ét
spørgsmål med det samme: **er centret ledigt lige nu, og hvornår bliver det frit?**

Ingen login. Man vælger sit navn, drejer et hjul til det tidspunkt man er færdig, og trykker start.
Alle andre telefoner opdaterer sig selv i samme sekund.

## Skærmbilleder

| Ledigt | Vælg navn | Sæt tid | I gang |
| --- | --- | --- | --- |
| Live status og hvornår centret bliver frit | Hele holdet som ét tryk | EasyPark-agtigt drejehjul | Nedtælling med stop-knap |

## Sådan virker det

- **Live status** — forsiden svarer med det samme: enten `Centret er frit`, hvem der træner og
  hvor længe, eller det klokkeslæt hvor centret bliver ledigt igen.
- **Kalenderen** — forsiden viser en uge frem, to dage ad gangen, med en rød streg hvor klokken
  står lige nu. Man booker ved at holde fingeren på starttiden og trække ned til sluttiden, og
  man kan altid se hvem der har lagt beslag på hvilke timer.
- **Flere kan have den samme time** — man må gerne booke oven i en anden; centret har plads til
  mere end én. Kalenderen deler bare kolonnen mellem dem, og bookingen nævner hvem man kommer
  til at træne sammen med.
- **Booket er ikke det samme som tjekket ind** — en booking er en aftale, en indtjekning er
  beviset. Derfor siger hvert felt i kalenderen hvad der faktisk skete: `Booket` (endnu ikke
  begyndt), `Ikke tjekket ind` (tiden er nu, men ingen er mødt op), `Tjekket ind` eller
  `Kom ikke`. Er en tid booket uden at nogen har tjekket ind, siger forsiden det lige ud —
  så man ved, at centret måske står tomt alligevel.
- **Ingen brugerkonti** — man vælger sit navn fra listen. Valget huskes lokalt på telefonen, så
  næste gang går man direkte til hjulet.
- **Drejehjulet** — én omgang dækker hele intervallet (15–180 min i spring på 5). Man kan også
  bruge genvejene 30m/45m/1t/1t 30m eller piletasterne.
- **Gæster** — har man nogen med, skruer man antallet op (0–5) uden at oprette profiler. Gæsterne
  vises på ens eget kort og tælles med i "N træner lige nu". De følger ens egen tid, så de
  forsvinder automatisk, når man tjekker ud.
- **Under træning** — hjulet tæller ned. Man kan dreje for at ændre sluttidspunktet, trykke
  `+15m`, eller rette antallet af gæster. Stop kræver to tryk, så man ikke afslutter ved et uheld.
- **Automatisk oprydning** — en træning udløber af sig selv, når tiden er gået, også hvis nogen
  glemmer at tjekke ud. Administratoren kan derudover afslutte alt manuelt.
- **Streaks** — hvert navn på "Hvem er du?"-siden viser sin streak, og tandhjulet på kortet åbner
  målet. En uge tæller, når man har trænet lige så mange dage, som målet siger, og streaken er
  antallet af uger i træk. At tjekke ind *er* logbogen — der er ikke noget at registrere bagefter.
  Målet kan skrues op og ned (1–7 dage), og da der ikke er brugerkonti, kan alle rette alles mål.
  En træning der blev startet ved en fejl kan fortrydes — så tæller den ikke med i streaken.

## Teknik

Ren frontend, ingen server at passe på:

- **React + TypeScript + Vite**
- **Cloud Firestore** til real-time synkronisering på tværs af telefoner. Firestore holder en lokal
  cache, så appen også virker på dårligt wifi og synkroniserer, når forbindelsen er tilbage.
- **Framer Motion** til overgange
- **GitHub Pages** til hosting

### Datamodel

Tre collections:

| Collection | Felter |
| --- | --- |
| `members` | `name`, `createdAt`, `weeklyGoal` — dokument-ID er et slug af navnet, så den samme person aldrig kan oprettes to gange |
| `sessions` | `memberId`, `memberName`, `startAt`, `endAt`, `active`, `guests` |
| `bookings` | `memberId`, `memberName`, `startAt`, `endAt`, `createdAt` |

`bookings` og `sessions` holdes bevidst adskilt: en booking er en hensigt, en session er en
indtjekning. Kalenderen parrer dem — en booking, der har en session i samme tidsrum for samme
person, er honoreret; en der ikke har, er enten `Ikke tjekket ind` eller `Kom ikke`. Kun
sessioner tæller i streaks, så en booking man ikke mødte op til giver ingen point.

Gæster er kun et tal på sessionen, ikke egne dokumenter — derfor kræver de ingen oprydning. De
står på selve træningen i kalenderen (`Jonathan +4`) og i detaljerne, så man kan se hvor mange
kroppe der faktisk var i centret.

Afsluttede sessioner slettes ikke, de får blot `active: false`. Det er dem streaks regnes ud fra:
appen lytter på det seneste års sessioner og tæller trænings*dage* per uge, så to indtjekninger
samme aften kun tæller én gang.

## Kom i gang lokalt

```bash
npm install
npm run dev
```

Firebase-projektet (`tjek-ind-maagen`) er allerede sat op, og konfigurationen ligger i
`src/firebase.ts`. Web-API-nøgler er offentlige identifikatorer, ikke hemmeligheder — adgangen
styres af reglerne i `firestore.rules`.

## Tilpasning

| Hvad | Hvor |
| --- | --- |
| Admin-koden | `src/config.ts` |
| Startlisten af personer (kun ved allerførste kørsel) | `STARTER_ROSTER` i `src/data/gym.ts` |
| Farver, skrifttyper, runding, skygger | `src/styles/tokens.css` |
| Længde-interval og genveje | `MIN` / `MAX` / `STEP` / `PRESETS` i `src/screens/DialScreen.tsx` |
| Maks antal gæster | `MAX_GUESTS` i `src/components/GuestStepper.tsx` |
| Standardmål, grænser og historikkens længde | `src/lib/streak.ts` |
| App-ikon og forsidens illustration | `public/new_icon.png` og `public/illustration.png` |

Personer tilføjes og fjernes løbende i appen: tryk på tandhjulet, indtast koden (standard `1234`).

## Deploy

Push til `main`. Så bygger GitHub Actions appen og udgiver den på GitHub Pages.

Første gang skal du sætte **Settings → Pages → Source** til **GitHub Actions**. Workflowet sætter
selv Vites `base` til `/<repo-navn>/`, så der er ikke noget at rette i koden.

Firestore-regler udgives separat:

```bash
firebase deploy --only firestore --project tjek-ind-maagen
```

## Om sikkerhed

Reglerne i `firestore.rules` tillader læsning og skrivning i `members` og `sessions` uden login —
det er prisen for "vælg dit navn og gå i gang" uden brugerkonti. Alt andet i databasen er lukket,
og der ligger ingen personfølsomme data ud over fornavne og træningstidspunkter. Admin-koden holder
nysgerrige fingre væk fra listen, men den står i kildekoden og er ikke rigtig sikkerhed.

Skal det strammes op senere, er den naturlige vej anonym Firebase-authentication og regler, der
kræver `auth != null`.

## Næste version

- **Kø-system** — stil dig i kø med ét tryk, så den nuværende bruger kan se, hvem der venter
- **Træningshistorik** — se ugerne enkeltvis bag streaken, ikke bare tællingen
