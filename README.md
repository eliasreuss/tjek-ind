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

- **Live status** — forsiden svarer med det samme: enten `Centret er frit` eller det klokkeslæt,
  hvor det bliver ledigt igen, med et kort per person der træner.
- **Ingen brugerkonti** — man vælger sit navn fra listen. Valget huskes lokalt på telefonen, så
  næste gang går man direkte til hjulet.
- **Drejehjulet** — én omgang dækker hele intervallet (15–180 min i spring på 5). Man kan også
  bruge genvejene 30/45/60/90 min eller piletasterne.
- **Under træning** — hjulet tæller ned. Man kan dreje for at ændre sluttidspunktet eller trykke
  `+15 min`. Stop kræver to tryk, så man ikke afslutter ved et uheld.
- **Automatisk oprydning** — en træning udløber af sig selv, når tiden er gået, også hvis nogen
  glemmer at tjekke ud. Administratoren kan derudover afslutte alt manuelt.

## Teknik

Ren frontend, ingen server at passe på:

- **React + TypeScript + Vite**
- **Cloud Firestore** til real-time synkronisering på tværs af telefoner. Firestore holder en lokal
  cache, så appen også virker på dårligt wifi og synkroniserer, når forbindelsen er tilbage.
- **Framer Motion** til overgange
- **GitHub Pages** til hosting

### Datamodel

To collections:

| Collection | Felter |
| --- | --- |
| `members` | `name`, `createdAt` — dokument-ID er et slug af navnet, så den samme person aldrig kan oprettes to gange |
| `sessions` | `memberId`, `memberName`, `startAt`, `endAt`, `active` |

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
- **Træningshistorik** — tryk på dit eget navn og se statistik over tidligere træninger
