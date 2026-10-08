# PlantPal

PlantPal is a plant care tracker website built as a class project. The goal is a simple place to
keep track of houseplants and their watering schedule. This is the front end only. A back end,
a database and the AI plant diagnosis come in a later version.

## Pages

| Page | File | Status |
|---|---|---|
| Home | `index.html` | Done |
| Login | `login.html` | Demo only, see "Features" below |
| Dashboard | `dashboard.html` | Done, with sample data |
| My Plants | `plants.html` | Under development |
| Add Plant / AI | `add-plant.html` | Under development |
| Profile | `profile.html` | Under development |

## Features

- **Light and dark theme.** All colors are CSS variables in `css/style.css`. The dark values
  apply when the `<html>` tag has the class `dark_mode`. `js/theme.js` toggles that class from
  the button in the header and saves the choice in `localStorage`, so it stays after a refresh
  and on every page. Based on the dev.to article
  [How to create a dark theme system in 5 minutes or less with vanilla JS](https://dev.to/codedgar/how-to-create-a-dark-theme-system-in-5-minutes-or-less-with-vanilla-js-2922).
- **Demo login.** `js/login.js` saves the email in `sessionStorage` and opens the Dashboard.
  `js/user.js` shows "Hi, email" and a Log out link in the header. There is no server yet, so
  nothing is checked and any email and password work. This is temporary until the real login.
- **Layouts.** CSS Grid with named areas (Home) and Flexbox (Dashboard).

## Project structure

```
plantpal/
  index.html
  login.html
  dashboard.html
  plants.html
  add-plant.html
  profile.html
  css/style.css
  js/theme.js
  js/login.js
  js/user.js
  images/houseplants.jpeg
```

## How to run

There is nothing to install. Download or clone the repo and open `index.html` in a browser.

## Next steps

- Real login and sessions with a Node.js back end
- Save plants in a database and show them on My Plants and the Dashboard
- AI plant diagnosis on the Add Plant page