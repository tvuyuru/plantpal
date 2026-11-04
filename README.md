# PlantPal

PlantPal is a plant care tracker website built as a class project. The goal is a simple place to
keep track of houseplants and their watering schedule. It has a Node.js (Express) back end, a
MySQL database, user registration and login, and sessions that keep a user logged in across pages.

## Pages

| Page | URL | Status |
|---|---|---|
| Home | `/` or `/index.html` | Done |
| Login | `/login.html` | Done (real login against the database) |
| Sign Up | `/register.html` | Done |
| Dashboard | `/dashboard.html` | Done, with sample data |
| My Plants | `/plants.html` | Under development |
| Add Plant / AI | `/add-plant.html` | Under development |
| Profile | `/profile` | Done (shows the logged-in user's details) |

## Features

- **Registration and login.** `POST /register` validates the fields (on the server and in the
  browser) and stores the user, hashing the password with PBKDF2-SHA512 and a per-user random
  salt. `POST /login` verifies the password with a timing-safe comparison. Validation and error
  messages are handled in `js/register.js` and `js/login.js`.
- **Sessions.** On a successful login the server stores the user in `req.session.user`
  (`express-session`). The browser only holds a signed, `httpOnly` session-id cookie, so the login
  survives moving between pages. The session lasts one hour or until the user logs out.
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

## Project structure
plantpal/
index.html
login.html
register.html
dashboard.html
plants.html
add-plant.html
profile.html
css/style.css
images/houseplants.jpeg
js/
server.js Express server: pages, /register, /login, /me, /profile, /logout
theme.js light/dark toggle
login.js login form: validation and messages
register.js sign-up form: validation and messages
user.js asks /me and updates the header
package.json dependencies


## Requirements

- [Node.js](https://nodejs.org/en/download/)
- [MySQL](https://dev.mysql.com/downloads/mysql/) with a database named `plant_pal` and a `users` table

## How to run

1. Create the `plant_pal` database and its `users` table in MySQL.
2. In a terminal, go to the `js` folder and run `npm install`.
3. Set the MySQL root password in an environment variable:
   - Windows (PowerShell): `$env:ROOTPASS="your_mysql_password"`
   - macOS/Linux: `export ROOTPASS="your_mysql_password"`
   - Optional: set `SESSION_SECRET` to a random value to keep sessions across server restarts.
4. Run `node server.js` from the `js` folder, then open `http://localhost:3000/`.

## Next steps

- Restrict the Dashboard, My Plants and Add Plant pages to logged-in users
- Save plants in the database and show them on My Plants and the Dashboard (full CRUD)
- AI plant diagnosis on the Add Plant page