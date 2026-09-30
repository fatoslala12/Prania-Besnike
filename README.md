# Prania Besnike · MSHMS

Sistemi digjital i Ministrisë së Shëndetësisë dhe Mirëqenies Sociale për kërkesat e qytetarëve: faqe publike + panel detyrash me 3 role, raporte dhe njoftime.

## Stack

- Next.js 16 (App Router)
- PostgreSQL + Prisma (ose JSON lokal për test)
- NextAuth (Credentials)
- Docker / Dokploy (Hetzner)

## Rolet dhe aksesi

| Roli | Të drejtat |
|------|------------|
| **Përfaqësues Drejtorie** | Sheh dhe trajton detyrat e deleguara te drejtoria/agjencia e tij; ndryshon statusin, shton komente dhe dokumente; **ri-delegon** detyrën te një drejtori tjetër me koment opsional (pas ri-delegimit detyra del nga lista e tij) |
| **Recepsion** | Krijon detyra, delegon / ri-delegon te drejtoritë, sheh të gjitha, **raporte** |
| **Administrator** | Gjithçka + menaxhim përdoruesish + fshirje + **raporte** |

- Çdo detyrë merr ID unike `PB-VITI-NNNN`.
- Formulari publik krijon detyrë për drejtorinë e zgjedhur nga qytetari.
- Çdo ndryshim (status, delegim, koment, dokument) ruhet në historik me emrin dhe rolin e personit.

## Raportet (`/panel/raporte`)

Vetëm Administrator dhe Recepsion. Filtra: periudha (me zgjedhje të shpejta Sot / 7 ditë / 30 ditë / Ky muaj / Ky vit), statusi, drejtoria, burimi (qytetar / i brendshëm), kush e gjeneroi.

- Tregues: gjithsej, të hapura, përfunduar (% zgjidhjes), bllokuar, koha mesatare/mediane e zgjidhjes, të vonuara (>7 ditë).
- Shpërndarja sipas statusit dhe trendi ditor/mujor (krijuar vs përfunduar).
- Tabela: sipas drejtorisë, sa ka gjeneruar secili person, aktiviteti i përdoruesve, lista e kërkesave.
- Eksport CSV (hapet direkt në Excel) për çdo tabelë dhe printim / PDF.

## Njoftimet

Butoni i njoftimeve (zilja) në panel tregon njoftimet sipas aksesit të secilit:

| Ngjarja | Kush njoftohet |
|---------|----------------|
| Kërkesë / detyrë e re | Drejtoria përkatëse + Admin + Recepsion |
| Ri-delegim (me komentin) | Drejtoria e re + Admin + Recepsion + krijuesi |
| Ndryshim statusi | Drejtoria + Admin + Recepsion + krijuesi |
| Koment / dokument i ri | Drejtoria + krijuesi |

Personi që kryen veprimin nuk njoftohet. Kur `SMTP_HOST` dhe `SMTP_PASS` janë vendosur, çdo njoftim dërgohet edhe me **email** te përdoruesit që kanë email të regjistruar (dërgimi bëhet pas përgjigjes, nuk e ngadalëson panelin).

Email-et dërgohen nga **pranibesnike@gmail.com**. Gmail kërkon një *App Password* (jo fjalëkalimin normal):

1. Hyni në llogarinë Gmail → https://myaccount.google.com/security → aktivizoni **2-Step Verification**.
2. Hapni https://myaccount.google.com/apppasswords → emri `Prania Besnike` → **Create**.
3. Kopjoni kodin 16-shkronjësh (pa hapësira) te `SMTP_PASS`.

Gmail falas lejon rreth 500 email në ditë.

## Modet e të dhënave

| `DATA_MODE` | Ku ruhen të dhënat |
|-------------|--------------------|
| `local` (default) | `.data/store.json` + `.data/uploads` — vetëm për test në kompjuter |
| `postgres` | PostgreSQL + `UPLOAD_DIR` — **për prodhim** |

## Nisja lokale (pa databazë)

```bash
npm install
npm run dev
```

Hapni http://localhost:3000/hyr — përdoruesit demo (`admin`, `recepsion`, `perfaqesues`, fjalëkalimi `Prania2026!`) shfaqen vetëm në modin lokal.

## Docker Compose (lokal me Postgres)

Krijoni `.env` pranë `docker-compose.yml`:

```env
POSTGRES_PASSWORD=nje-fjalekalim-i-forte
AUTH_SECRET=...        # openssl rand -base64 32
AUTH_URL=http://localhost:3000
ADMIN_PASSWORD=...     # min. 10 karaktere
```

```bash
docker compose up --build
```

## 1. Kodi në GitHub

1. Instaloni Git: https://git-scm.com/download/win (opsionet default).
2. Krijoni një repo **private** në https://github.com/new, p.sh. `prania-besnike` (pa README, pa .gitignore).
3. Në PowerShell, brenda dosjes së projektit:

```powershell
git config --global user.name "Emri Mbiemri"
git config --global user.email "email@juaj.al"
git init
git add .
git commit -m "Prania Besnike MSHMS"
git branch -M main
git remote add origin https://github.com/PERDORUESI/prania-besnike.git
git push -u origin main
```

`.env`, `.data/`, `uploads/` dhe `node_modules/` nuk ngarkohen (janë te `.gitignore`). Për ndryshime të mëvonshme: `git add .`, `git commit -m "..."`, `git push`.

## 2. Serveri në Hetzner

1. https://console.hetzner.cloud → *New Project* → *Add Server*.
2. Imazhi **Ubuntu 24.04**, tipi të paktën **CX32 (4 GB RAM)** — build-i i Next.js ka nevojë për memorie. Shtoni çelësin SSH.
3. *Firewalls* → lejoni hyrje TCP **22, 80, 443** dhe **3000** (paneli Dokploy).
4. Te DNS-i i domainit krijoni rekord **A**: `domaini-juaj.al` → IP e serverit.
5. Instaloni Dokploy:

```bash
ssh root@IP_E_SERVERIT
curl -sSL https://dokploy.com/install.sh | sh
```

6. Hapni `http://IP_E_SERVERIT:3000` dhe krijoni llogarinë e administratorit të Dokploy.

## 3. Deploy në Dokploy

0. **GitHub** — *Settings → Git → GitHub → Create GitHub App*, jepini akses repos `prania-besnike`.
1. **Projekti** — *Projects → Create Project* `prania-besnike`.
2. **Databaza** — *Create Service → Database → PostgreSQL* (v16), emri `prania-db`, vendosni fjalëkalim → *Deploy*. Kopjoni *Internal Connection URL*.
3. **Aplikacioni** — *Create Service → Application* → *Provider: GitHub*, repo `prania-besnike`, branch `main`, *Build Type: Dockerfile*.
4. **Environment** (skeda *Environment* e aplikacionit):

   | Variabli | Vlera |
   |----------|-------|
   | `DATA_MODE` | `postgres` |
   | `DATABASE_URL` | URL e brendshme e Postgres + `?schema=public` |
   | `AUTH_SECRET` | `openssl rand -base64 32` |
   | `AUTH_URL` | `https://domaini-juaj.al` |
   | `AUTH_TRUST_HOST` | `true` |
   | `ADMIN_PASSWORD` | fjalëkalimi i adminit të parë (min. 10) |
   | `ADMIN_EMAIL` / `ADMIN_USERNAME` | opsionale (default `admin@praniabesnike.com` / `admin`) |
   | `UPLOAD_DIR` | `/app/uploads` |
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_PORT` | `587` |
   | `SMTP_USER` | `pranibesnike@gmail.com` |
   | `SMTP_PASS` | App Password i Gmail (16 shkronja) |
   | `MAIL_FROM` | `Prania Besnike MSHMS <pranibesnike@gmail.com>` |

5. **Volume** — *Advanced → Mounts → Volume*, mount path `/app/uploads` (dokumentet nuk humbasin në redeploy).
6. **Domain** — *Domains → Add*, host `domaini-juaj.al`, port `3000`, HTTPS me Let's Encrypt.
7. **Deploy**. Në nisje kontejneri ekzekuton `prisma migrate deploy` dhe krijon adminin **vetëm nëse nuk ka asnjë admin**. Fjalëkalimet ekzistuese nuk ndryshohen në rinisje.
8. Hyni si admin → *Përdoruesit* → krijoni stafin me drejtorinë/agjencinë përkatëse dhe email-in e secilit (që të marrin njoftimet). Pas hyrjes së parë mund ta hiqni `ADMIN_PASSWORD` nga environment.
9. Me *Autodeploy* të aktivizuar (default), çdo `git push` në `main` bën deploy automatik.

> Databaza duhet të jetë me encoding **UTF-8** (default në imazhin zyrtar `postgres`). Kontejneri punon me `TZ=Europe/Tirane`, që datat e raporteve të jenë sipas orës së Shqipërisë.

## Siguria

- Cookie sesioni `__Secure-` në HTTPS, sesion 12 orë.
- Kufizim provash hyrjeje (8 prova / 15 min për përdorues, 20 për IP).
- Formulari publik: kufizim 5 kërkesa / 10 min për IP, fushë-kurth (honeypot) dhe kohë minimale plotësimi.
- Ngarkimet: max 15MB, vetëm PDF/JPG/PNG/WEBP/DOC/DOCX/XLSX, emër skedari i rastësishëm.
- Header sigurie (HSTS, X-Frame-Options, nosniff, Referrer-Policy).
- Kufizimi i provave mbahet në memorie — i mjaftueshëm për **një** instancë. Me disa replika duhet Redis.

## Faqet

- `/` — faqja publike + formulari i qytetarit
- `/hyr` — login
- `/mbrojtja-e-te-dhenave` — Ligji 124/2024
- `/panel` — detyrat (filtra: kërkim, status, drejtori)
- `/panel/dashboard` — statistika
- `/panel/detyra/e-re` — detyrë e re
- `/panel/detyra/[id]` — detaji, workflow, ri-delegim
- `/panel/raporte` — raporte (admin, recepsion)
- `/panel/perdoruesit` — admin
