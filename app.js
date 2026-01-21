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
async function hash(t) {
  const e = new TextEncoder().encode(t);
  const b = await crypto.subtle.digest("SHA-256", e);
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,"0")).join("");
}

/******** LOGIN ********/
loginBtn.onclick = async () => {
  const u = loginUser.value.trim();
  const p = loginPass.value;
  if (!u || !p) return alert("Alles ausfüllen");

  const h = await hash(p);
  db.ref("users/"+u).once("value", snap => {
    if (!snap.exists()) return alert("Benutzer existiert nicht");
    if (snap.val().password !== h) return alert("Falsches Passwort");

    localStorage.setItem("brotifyUser", u);
    startUser(u);
  });
};

registerBtn.onclick = async () => {
  const u = loginUser.value.trim();
  const p = loginPass.value;
  if (!u || !p) return alert("Alles ausfüllen");

  const h = await hash(p);
  db.ref("users/"+u).once("value", snap => {
    if (snap.exists()) return alert("Benutzer existiert bereits");

    db.ref("users/"+u).set({ password: h, created: Date.now() });
    localStorage.setItem("brotifyUser", u);
    startUser(u);
  });
};

function startUser(u) {
  currentUser = u;
  family.value = u;
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

function enterGroup(name) {
  groupTitle.textContent = name;
  groupCode.textContent = "🔑 Einladungscode: " + currentGroup;
  initGroupLive();
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

      const name = document.createElement("div");
      name.textContent = p;

      const minus = document.createElement("button");
      minus.className = "pm";
      minus.textContent = "−";

      const amt = document.createElement("div");
      amt.className = "amount";
      amt.textContent = cart[p];

      const plus = document.createElement("button");
      plus.className = "pm";
      plus.textContent = "+";

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

      r.append(name, minus, amt, plus);
      products.appendChild(r);
    });
  }
}

/******** SPEICHERN – FIX ********/
saveBtn.onclick = () => {
  if (!currentGroup) return alert("Keine Gruppe aktiv");

  const data = {
    name: currentUser,
    icon: selectedIcon,
    remark: remark.value.trim(),
    items: cart,
    time: Date.now()
  };

  const ref = db.ref(`groups/${currentGroup}/orders`);
  editOrderId ? ref.child(editOrderId).set(data) : ref.push(data);

  editOrderId = null;
  remark.value = "";
  selectedIcon = ICONS[0];
  renderIcons();
  renderProducts();
};

/******** LIVE ********/
function initGroupLive() {
  db.ref(`groups/${currentGroup}/orders`).on("value", snap => {
    overview.innerHTML = "";
    shoppingList.innerHTML = "";

    const totals = {};
    snap.forEach(c => {
      const d = c.val();
      const box = document.createElement("div");
      box.className = "overview-box";
      box.innerHTML = `${d.icon} <b>${d.name}</b>`;

      if (d.remark) box.innerHTML += `<div class="remark">📝 ${d.remark}</div>`;

      for (let i in d.items) {
        if (d.items[i] > 0) {
          totals[i] = (totals[i] || 0) + d.items[i];
          box.innerHTML += `<br>${i}: ${d.items[i]}×`;
        }
      }
      overview.appendChild(box);
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
