/******** FIREBASE ********/
const firebaseConfig = {
  apiKey: "AIzaSyBXFdU_DmIUl0Oc2wGF2ODAqh7NRWeVBMc",
  authDomain: "brotify-network.firebaseapp.com",
  projectId: "brotify-network",
  storageBucket: "brotify-network.firebasestorage.app",
  messagingSenderId: "916259400168",
  appId: "1:916259400168:web:221877f89220e7c6225c5d"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/******** STATE ********/
let currentUser = null;
let currentGroup = null;
let cart = {};
let selectedIcon = "🦊";
let editOrderId = null;

/******** CONSTANTS ********/
const ICONS = ["🦊","🐻","🦄","🍄","👻","🐸","🐼","🐱","🐶","🦉","🐯","🐷","🐮","🐰","🐵"];

const PRODUCTS = {
  "Weckle & Brötchen": [
    "Laugenweckle","Körnerweckle","Doppelweckle","Seelen",
    "Sonnenblumeweckle","Kürbisweckle","Dinkelweckle",
    "Vollkornweckle","Mehrkornweckle","Roggenweckle"
  ],
  "Laugengebäck & Laugenecken": [
    "Laugenstange","Laugenhörnchen",
    "Laugenecke klassisch","Laugenecke mit Körnern","Brezel"
  ],
  "Croissants & süßes Gebäck": [
    "Buttercroissant","Schokocroissant"
  ],
  "Brote & Zopf": [
    "Zopf","Kleines Landbrot"
  ]
};

/******** DOM – ALLES EXPLIZIT ********/
const loginScreen   = document.getElementById("loginScreen");
const appScreen     = document.getElementById("appScreen");

const loginUser     = document.getElementById("loginUser");
const loginPass     = document.getElementById("loginPass");
const loginBtn      = document.getElementById("loginBtn");
const registerBtn   = document.getElementById("registerBtn");
const logoutBtn     = document.getElementById("logoutBtn");

const createGroupBtn = document.getElementById("createGroupBtn");
const joinGroupBtn   = document.getElementById("joinGroupBtn");

const productsEl    = document.getElementById("products");
const overviewEl    = document.getElementById("overview");
const shoppingListEl= document.getElementById("shoppingList");

const nameInput     = document.getElementById("family");
const remarkInput   = document.getElementById("remark");

const pickupInline  = document.getElementById("pickupInline");
const pickupInput   = document.getElementById("pickupInput");
const savePickupBtn = document.getElementById("savePickup");
const clearPickupBtn= document.getElementById("clearPickup");

const saveBtn       = document.getElementById("saveBtn");

/******** HASH ********/
async function hash(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2,"0"))
    .join("");
}

/******** LOGIN ********/
loginBtn.onclick = async () => {
  const u = loginUser.value.trim();
  const p = loginPass.value;
  if (!u || !p) return alert("Bitte Benutzername & Passwort eingeben");

  const h = await hash(p);
  db.ref("users/"+u).once("value", snap => {
    if (!snap.exists()) return alert("Benutzer existiert nicht");
    if (snap.val().password !== h) return alert("Falsches Passwort");

    localStorage.setItem("brotifyUser", u);
    startUserSession(u);
  });
};

registerBtn.onclick = async () => {
  const u = loginUser.value.trim();
  const p = loginPass.value;
  if (!u || !p) return alert("Bitte Benutzername & Passwort eingeben");

  const h = await hash(p);
  db.ref("users/"+u).once("value", snap => {
    if (snap.exists()) return alert("Benutzer existiert bereits");

    db.ref("users/"+u).set({
      password: h,
      created: Date.now()
    });

    localStorage.setItem("brotifyUser", u);
    startUserSession(u);
  });
};

logoutBtn.onclick = () => {
  localStorage.clear();
  location.reload();
};

/******** SESSION ********/
function startUserSession(u) {
  currentUser = u;
  nameInput.value = u;

  loginScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");

  renderIcons();
  renderProducts();

  const g = localStorage.getItem("brotifyGroup");
  const gn = localStorage.getItem("brotifyGroupName");
  if (g && gn) {
    currentGroup = g;
    enterGroup(gn);
  }
}

/******** AUTO LOGIN ********/
window.addEventListener("load", () => {
  const u = localStorage.getItem("brotifyUser");
  if (u) startUserSession(u);
});

/******** GRUPPEN ********/
createGroupBtn.onclick = async () => {
  const name = prompt("Gruppenname:");
  if (!name) return;

  let code, exists;
  do {
    code = Math.random().toString(36).substring(2,8).toUpperCase();
    const s = await db.ref("groups/"+code).once("value");
    exists = s.exists();
  } while (exists);

  currentGroup = code;
  db.ref("groups/"+code).set({ name, created: Date.now() });

  localStorage.setItem("brotifyGroup", code);
  localStorage.setItem("brotifyGroupName", name);

  enterGroup(name);
};

joinGroupBtn.onclick = () => {
  const code = prompt("Gruppencode:");
  if (!code) return;

  db.ref("groups/"+code.toUpperCase()).once("value", snap => {
    if (!snap.exists()) return alert("Gruppe nicht gefunden");

    currentGroup = code.toUpperCase();
    localStorage.setItem("brotifyGroup", currentGroup);
    localStorage.setItem("brotifyGroupName", snap.val().name);

    enterGroup(snap.val().name);
  });
};

/******** ICON PICKER ********/
function renderIcons(active = selectedIcon) {
  const picker = document.getElementById("iconPicker");
  picker.innerHTML = "";
  ICONS.forEach(icon => {
    const span = document.createElement("span");
    span.textContent = icon;
    span.className = "icon" + (icon===active?" selected":"");
    span.onclick = () => {
      selectedIcon = icon;
      renderIcons(icon);
    };
    picker.appendChild(span);
  });
}

/******** PRODUKTE ********/
function renderProducts(items = {}) {
  productsEl.innerHTML = "";
  cart = {};

  for (let cat in PRODUCTS) {
    const h = document.createElement("h3");
    h.textContent = cat;
    productsEl.appendChild(h);

    PRODUCTS[cat].forEach(p => {
      cart[p] = items[p] || 0;

      const row = document.createElement("div");
      row.className = "product";

      const name = document.createElement("div");
      name.textContent = p;

      const minus = document.createElement("button");
      minus.textContent = "−";
      minus.className = "pm";

      const amt = document.createElement("div");
      amt.className = "amount";
      amt.textContent = cart[p];

      const plus = document.createElement("button");
      plus.textContent = "+";
      plus.className = "pm";

      minus.onclick = () => {
        if (cart[p] > 0) {
          cart[p]--;
          amt.textContent = cart[p];
        }
      };

      plus.onclick = () => {
        cart[p]++;
        amt.textContent = cart[p];
      };

      row.append(name, minus, amt, plus);
      productsEl.appendChild(row);
    });
  }
}

/******** ENTER GROUP ********/
function enterGroup(name) {
  document.getElementById("groupTitle").textContent = name;
  document.getElementById("groupCode").textContent =
    "🔑 Einladungscode: " + currentGroup;
  initGroupLive();
}

/******** LIVE ********/
function initGroupLive() {
  db.ref(`groups/${currentGroup}/orders`).on("value", snap => {
    overviewEl.innerHTML = "";
    shoppingListEl.innerHTML = "";

    const totals = {};
    snap.forEach(c => {
      const d = c.val();
      const box = document.createElement("div");
      box.className = "overview-box";
      box.innerHTML = `${d.icon} <b>${d.name}</b>`;

      for (let i in d.items) {
        if (d.items[i] > 0) {
          totals[i] = (totals[i] || 0) + d.items[i];
          box.innerHTML += `<br>${i}: ${d.items[i]}×`;
        }
      }
      overviewEl.appendChild(box);
    });

    Object.keys(totals).forEach(item => {
      shoppingListEl.innerHTML += `
        <label class="shopping-row">
          <span class="text">${totals[item]}× ${item}</span>
          <input type="checkbox">
        </label>`;
    });
  });
}
