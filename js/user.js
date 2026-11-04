/* -- PlantPal: user.js --
   Runs on every page. Asks the server who is logged in (GET /me) and updates the header:
     - logged out: only Home and Login show; the gated tabs and the avatar stay hidden
     - logged in:  the gated tabs appear, Login is hidden, and an avatar button (the user's
                   initials) shows a dropdown with Profile and Log out
   It also marks the current page's nav tab as active, and opens/closes the dropdown.
*/

// Header elements (some are hidden until /me says the user is logged in)
const login_link    = document.querySelector("#login_link");
const user_menu     = document.querySelector("#user_menu");
const avatar_btn    = document.querySelector("#avatar_btn");
const user_dropdown = document.querySelector("#user_dropdown");
const dropdown_name = document.querySelector("#dropdown_name");
const gated_tabs    = document.querySelectorAll(".site-nav .gated");

// Mark the current page's tab as active (so we don't hard-code "active" on each page)
const here = location.pathname;
document.querySelectorAll(".site-nav a").forEach(function (a) {
    const linkPath = new URL(a.href, location.origin).pathname;
    if (linkPath === here || (here === "/" && linkPath.endsWith("/index.html"))) a.classList.add("active");
});

// Ask the server who is logged in, then update the header
fetch("/me")
    .then(function (r) { return r.json(); })
    .then(function (me) {
        if (!me.loggedIn) return; // logged out: leave the gated tabs and avatar hidden

        gated_tabs.forEach(function (t) { t.hidden = false; }); // reveal the gated tabs
        if (login_link) login_link.hidden = true;               // hide the Login link
        if (user_menu)  user_menu.hidden  = false;              // show the avatar menu

        // Build the avatar initials from the first and last name, e.g. "TV"
        const initials = (me.first_name ? me.first_name[0] : "") + (me.last_name ? me.last_name[0] : "");
        if (avatar_btn)    avatar_btn.textContent    = initials.toUpperCase();
        if (dropdown_name) dropdown_name.textContent = (me.first_name + " " + (me.last_name || "")).trim();
    })
    .catch(function () { /* server unreachable: leave the header as it is */ });

// Dropdown: open on avatar click, close on an outside click or the Escape key
if (avatar_btn && user_dropdown) {
    avatar_btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const willOpen = user_dropdown.hidden;
        user_dropdown.hidden = !willOpen;
        avatar_btn.setAttribute("aria-expanded", String(willOpen));
    });
    user_dropdown.addEventListener("click", function (e) { e.stopPropagation(); });
    document.addEventListener("click", function () {
        if (!user_dropdown.hidden) { user_dropdown.hidden = true; avatar_btn.setAttribute("aria-expanded", "false"); }
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !user_dropdown.hidden) { user_dropdown.hidden = true; avatar_btn.setAttribute("aria-expanded", "false"); }
    });
}