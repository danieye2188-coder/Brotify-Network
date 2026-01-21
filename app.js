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
  if (!u || !p) return alert("Alles ausfüllen");

  const h = await hash(p);
  db.ref("users/" + u).once("value", snap => {
    if (!snap.exists()) return alert("Benutzer existiert nicht");
    if (snap.val().password !== h) return alert("Falsches Passwort");

    localStorage.setItem("brotifyUser", u);
    startUserSession(u);
  });
};

registerBtn.onclick = async () => {
  const u = loginUser.value.trim();
  const p = loginPass.value;
  if (!u || !p) return alert("Alles ausfüllen");

  const h = await hash(p);
  db.ref("users/" + u).once("value", snap => {
    if (snap.exists()) return alert("Benutzer existiert bereits");

    db.ref("users/" + u).set({
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

/******** START USER ********/
function startUserSession(u) {
  currentUser = u;
  family.value = u;

  loginScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");

  renderIcons();
  renderProducts();

  // 🔑 WICHTIG: Gruppe automatisch wieder betreten
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
    const s = await db.ref("groups/" + code).once("value");
    exists = s.exists();
  } while (exists);

  currentGroup = code;
  db.ref("groups/" + code).set({ name, created: Date.now() });

  localStorage.setItem("brotifyGroup", code);
  localStorage.setItem("brotifyGroupName", name);

  enterGroup(name);
};

joinGroupBtn.onclick = () => {
  const code = prompt("Gruppencode:");
  if (!code) return;

  db.ref("groups/" + code.toUpperCase()).once("value", snap => {
    if (!snap.exists()) return alert("Gruppe nicht gefunden");

    currentGroup = code.toUpperCase();
    localStorage.setItem("brotifyGroup", currentGroup);
    localStorage.setItem("brotifyGroupName", snap.val().name);

    enterGroup(snap.val().name);
  });
};

/******** ENTER GROUP ********/
function enterGroup(name) {
  groupTitle.textContent = name;
  groupCode.textContent = "🔑 Einladungscode: " + currentGroup;
  initGroupLive();
}

/******** ICONS ********/
function renderIcons(active = selectedIcon) {
  iconPicker.innerHTML = "";
  ICONS.forEach(i => {
    const s = document.createElement("span");
    s.textContent = i;
    s.className = "icon" + (i === active ? " selected" : "");
    s.onclick = () => {
      selectedIcon = i;
      renderIcons(i);
    };
    iconPicker.appendChild(s);
  });
}

/******** PRODUKTE ********/
function renderProducts(items = {}) {
  products.innerHTML = "";
  cart = {};

  for (let c in PRODUCTS) {
    const h = document.createElement("h3");
    h.textContent = c;
    products.appendChild(h);

    PRODUCTS[c].forEach(p => {
      cart[p] = items[p] || 0;

      const r = document.createElement("div");
      r.className = "product";
      r.innerHTML = `
        <div>${p}</div>
        <button class="pm">−</button>
        <div class="amount">${cart[p]}</div>
        <button class="pm">+</button>
      `;

      const [_, m, a, pl] = r.children;
      m.onclick = () => { if (cart[p] > 0) { cart[p]--; a.textContent = cart[p]; }};
      pl.onclick = () => { cart[p]++; a.textContent = cart[p]; };

      products.appendChild(r);
    });
  }
}

/******** LIVE ********/
function initGroupLive() {
  renderIcons();
  renderProducts();

  db.ref(`groups/${currentGroup}/orders`).on("value", snap => {
    overview.innerHTML = "";
    shoppingList.innerHTML = "";

    const totals = {};
    snap.forEach(c => {
      const d = c.val();
      const b = document.createElement("div");
      b.className = "overview-box";
      b.innerHTML = `${d.icon} <b>${d.name}</b>`;

      if (d.remark) b.innerHTML += `<div class="remark">📝 ${d.remark}</div>`;

      for (let i in d.items) {
        if (d.items[i] > 0) {
          totals[i] = (totals[i] || 0) + d.items[i];
          b.innerHTML += `<br>${i}: ${d.items[i]}×`;
        }
      }
      overview.appendChild(b);
    });

    for (let i in totals) {
      shoppingList.innerHTML += `
        <label class="shopping-row">
          <span class="text">${totals[i]}× ${i}</span>
          <input type="checkbox">
        </label>`;
    }
  });
}

/******** ABHOLER ********/
savePickup.onclick = () => {
  if (pickupInput.value)
    db.ref(`groups/${currentGroup}/meta/abholer`).set(pickupInput.value);
  pickupInput.value = "";
};

clearPickup.onclick = () => {
  db.ref(`groups/${currentGroup}/meta/abholer`).remove();
};
