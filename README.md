# Asset Manager — Backend (NestJS)

Samodzielny backend REST API dla systemu zarzadzania wypozyczeniami sprzetu, przelozony z logiki Next.js API routes na moduly/kontrolery/serwisy NestJS. Korzysta z **tej samej bazy PostgreSQL i tego samego schematu Prisma** co aplikacja Next.js.

## Stack

- **NestJS** (TypeScript)
- **Prisma** (v6) — ten sam schemat co w projekcie Next.js
- **Passport + JWT** — wlasny mechanizm logowania (niezalezny od NextAuth)
- **class-validator / class-transformer** — walidacja DTO

## Uruchomienie

```bash
npm install
cp .env.example .env
```

Uzupelnij `.env`:
- `DATABASE_URL` — **ten sam** connection string co w projekcie Next.js (ta sama baza danych)
- `JWT_SECRET` — dowolny losowy sekret, np. `openssl rand -base64 32`
- `PORT` — domyslnie `3001` (Next.js zwykle stoi na `3000`)
- `FRONTEND_URL` — adres Next.js, potrzebny do CORS

```bash
npx prisma generate
npm run start:dev
```

Backend wystartuje pod `http://localhost:3001`.

## ⚠️ Wazne: migracje bazy danych

**Migracje Prisma powinien wykonywac TYLKO projekt Next.js**, nie ten backend. Oba projekty dziela ta sama baze i ten sam schemat, ale historia migracji (tabela `_prisma_migrations`) powinna miec jedno zrodlo prawdy. Ten projekt celowo **nie zawiera** folderu `prisma/migrations` — uzywaj `npx prisma generate` (tylko generuje klienta), nigdy `npx prisma migrate dev` w tym repo. Jesli schemat sie zmieni, zmien go najpierw w projekcie Next.js, zastosuj migracje tam, a potem skopiuj zaktualizowany `schema.prisma` tutaj i ponownie zrob `npx prisma generate`.

## Uwierzytelnianie

Backend **nie uzywa NextAuth** — to osobny mechanizm oparty o JWT, niezalezny od sesji w Next.js:

1. `POST /auth/register` lub `POST /auth/login` zwraca `{ accessToken, user }`.
2. Kazdy chroniony endpoint wymaga naglowka `Authorization: Bearer <accessToken>`.
3. Rola (`USER`/`ADMIN`) jest zawsze `USER` przy rejestracji — tak jak w calym projekcie, nadanie `ADMIN` jest reczne, bezposrednio w bazie danych (`npx prisma studio` w projekcie Next.js, ktory ma juz skonfigurowane migracje).

## Mapa endpointow (odpowiedniki Next.js API routes)

| Next.js (route handler) | NestJS (controller) | Opis |
|---|---|---|
| `NextAuth` (login/session) | `POST /auth/login` | Logowanie, zwraca JWT |
| `NextAuth` (rejestracja) | `POST /auth/register` | Rejestracja, zawsze rola USER |
| `session.user` | `GET /users/me` | Profil zalogowanego uzytkownika |
| — (Server Component `prisma.equipment.findMany`) | `GET /equipment` | Katalog sprzetu z dostepnoscia (publiczny) |
| — (Server Component `prisma.equipment.findUnique`) | `GET /equipment/:id` | Szczegoly sprzetu ze specyfikacja |
| — (panel admina, do zaimplementowania) | `POST /equipment` | Tworzenie sprzetu (ADMIN) |
| — | `PATCH /equipment/:id` | Edycja sprzetu (ADMIN) |
| — | `DELETE /equipment/:id` | Usuniecie sprzetu — kaskadowo kasuje rezerwacje (ADMIN) |
| Strona `Home` (historia usera) | `GET /reservations/me` | Wlasne rezerwacje |
| Strona `/admin/reservations` | `GET /reservations` | Wszystkie rezerwacje (ADMIN) |
| `POST /api/reservations` | `POST /reservations` | Tworzenie rezerwacji z walidacja kolizji |
| `PATCH /api/reservations/[id]` `{action:"cancel"}` | `PATCH /reservations/:id/cancel` | Anulowanie (tylko przed startem) |
| `PATCH /api/reservations/[id]` `{action:"return"}` | `PATCH /reservations/:id/return` | Oznaczenie zwrotu |
| `PATCH /api/reservations/[id]` `{action:"edit"}` | `PATCH /reservations/:id` | Edycja zakresu (pelna przed startem, tylko przedluzenie w trakcie) |
| `DELETE /api/reservations/[id]` | `DELETE /reservations/:id` | Calkowite usuniecie (ADMIN) |

## Logika biznesowa zachowana 1:1 z Next.js

- Walidacja kolizji terminow z buforem dnia przygotowania (`bufferDays`) dla trybu dziennego, bez bufora dla trybu godzinowego (`bufferDays === 0`).
- Fazy rezerwacji (`FUTURE` / `IN_PROGRESS` / `CLOSED`) i uprawnienia zalezne od fazy — dokladnie te same reguly, co ustalilismy przy projektowaniu `PATCH /api/reservations/[id]` w Next.js.
- Walidacja godzin roboczych (8:00–18:00), pelnych godzin, minimum 1 godziny dla trybu godzinowego.

## Czego brakuje / do dopisania

- Endpointy do zarzadzania specyfikacjami sprzetu po utworzeniu (`PATCH /equipment/:id/spec`) — na razie spec ustawia sie tylko przy tworzeniu.
- Upload zdjecia sprzetu (obecnie tylko `imageUrl` jako string, tak jak w Next.js).
- Testy (e2e/unit) — projekt NestJS domyslnie ma pod to gotowa strukture (`@nestjs/testing`), ale nie zostaly tu napisane.
