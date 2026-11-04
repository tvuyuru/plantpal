/* -- PlantPal: user.js -- 
 What it does: This script runs on every page. It checks if the user is logged in, and if so, it updates the header to show their name and a logout link. If not logged in, it leaves the login and signup links visible.
*/


// Ask the server who is logged in, then update the header on every page
const user_name = document.querySelector("#user_name");
const logout_link = document.querySelector("#logout_link");
const login_link = document.querySelector("#login_link");
const signup_link = document.querySelector("#signup_link");

// Ask the server who is logged in, then update the header on every page
fetch("/me")
    .then(r => r.json())
    .then(me => {
        if (!me.loggedIn) return;                    // leave Login / Sign Up showing
        user_name.textContent = "Hi, " + me.first_name;
        user_name.hidden = false;
        logout_link.hidden = false;
        login_link.hidden = true;
        signup_link.hidden = true;
    })
    .catch(() => { /* server unreachable: leave the header as it is */ });