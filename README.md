# PlantPal

PlantPal is a plant care tracker website built as a class project. The goal is a simple place to
keep track of houseplants and their watering schedule. It has a Node.js (Express) back end, a
MySQL database, user registration and login, and sessions that keep a user logged in across pages.
Logged-in users can create, read, update and delete their own plants, and can ask the Claude API to diagnose a sick plant from a photo, the plant's details and a description of the symptoms.

## Pages

| Page      | URL                  | Status                                    |
| --------- | -------------------- | ----------------------------------------- |
| Home      | `/` or `/index.html` | Done                                      |
| Login     | `/login.html`        | Done (real login against the database)    |
| Sign Up   | `/register.html`     | Done                                      |
| Dashboard | `/dashboard`         | Done (real counts and watering table)     |
| My Plants | `/plants`            | Done (list / delete, link to edit)        |
| Add Plant | `/add-plant`         | Done (create / edit form)                 |
| Diagnose  | /diagnose            | Done (AI plant diagnosis)                 |
| Profile   | `/profile`           | Done (shows the logged-in user's details) |

## Features

- **Registration and login.** `POST /register` validates the fields (on the server and in the
  browser) and stores the user, hashing the password with PBKDF2-SHA512 and a per-user random
  salt. `POST /login` verifies the password with a timing-safe comparison. Validation and error
  messages are handled in `js/register.js` and `js/login.js`.
- **Sessions.** On a successful login the server stores the user in `req.session.user`
  (`express-session`). The browser only holds a signed, `httpOnly` session-id cookie, so the login
  survives moving between pages. The cookie has no expiry, so the login lasts until the browser is closed or the user logs out.
- **Profile page.** `GET /profile` is only available to logged-in users; anyone else is redirected
  to the login page. The server reads `profile.html`, fills in the user's initials, name, username,
  email, zip code and join date from the database, and HTML-escapes each value.
- **Logout.** `GET /logout` destroys the session and clears the cookie, then redirects to the login
  page. It is reached from the header link and the button on the profile page.
- **Session-aware header.** `js/user.js` calls `GET /me` on every page; when someone is logged in
  it shows "Hi, <first name>" and a Log out link and hides the Login and Sign Up links.
- **Light and dark theme.** All colors are CSS variables in `css/style.css`. The dark values apply
  when the `<html>` tag has the class `dark_mode`. `js/theme.js` toggles that class from the button
  in the header and saves the choice in `localStorage`, so it stays after a refresh and on every
  page. Based on the dev.to article
  [How to create a dark theme system in 5 minutes or less with vanilla JS](https://dev.to/codedgar/how-to-create-a-dark-theme-system-in-5-minutes-or-less-with-vanilla-js-2922).
- **Layouts.** CSS Grid with named areas (Home) and Flexbox (Dashboard).
- **Plant CRUD** (the content of the site), all scoped to the logged-in user by `user_id`:
  - **Create** — the Add Plant form → `POST /api/plants`
  - **Read** — My Plants (`GET /api/plants`) and the Dashboard; the edit form reads `GET /api/plants/:id`
  - **Update** — editing a plant → `PUT /api/plants/:id`
  - **Delete** — the Delete button on My Plants → `DELETE /api/plants/:id`
  - A user can only read, change or delete their own plants (every query filters by `user_id`).
- **AI plant diagnosis.** `POST /api/diagnose` sends the plant's details, its past diagnoses, the
  typed symptoms and an optional photo to the **Claude API**, and returns a concise diagnosis with
  steps. Each diagnosis is saved in the `diagnoses` table and used as context next time.

## Project structure

plantpal/
index.html
login.html
register.html
dashboard.html
plants.html
add-plant.html
diagnose.html
profile.html
css/style.css
images/houseplants.jpeg
js/
server.js Express server: pages, auth, sessions, plant CRUD (/api/plants), AI diagnosis (/api/diagnose)
theme.js light/dark toggle
login.js login form: validation and messages
register.js sign-up form: validation and messages
user.js asks /me and updates the header
plants.js My Plants: list + delete
add-plant.js Add/Edit plant form
diagnose.js Diagnose page: AI plant diagnosis
dashboard.js Dashboard counts and watering table
package.json dependencies

## Requirements

- [Node.js](https://nodejs.org/en/download/)
- [MySQL](https://dev.mysql.com/downloads/mysql/) with a database named `plant_pal` and a `users` table
- An **Anthropic API key** for the AI diagnosis (from https://console.anthropic.com)

## How to run

1. Create the `plant_pal` database and its `users` table in MySQL.
2. In a terminal, go to the `js` folder and run `npm install`.
3. Set environment variables in the same terminal you run the server in:
   - Windows (PowerShell): `$env:ROOTPASS="your_mysql_password"`
   - macOS/Linux: `export ROOTPASS="your_mysql_password"`
   - `ANTHROPIC_API_KEY` — your Anthropic key (needed only for AI diagnosis)
   - Optional: `AI_MODEL` (default `claude-haiku-5-5`; set to `claude-opus-5-5` for better diagnoses)
   - Optional: set `SESSION_SECRET` to a random value to keep sessions across server restarts.
4. Run `node server.js` from the `js` folder, then open `http://localhost:3000/`.
