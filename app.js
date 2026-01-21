/******** FIREBASE ********/
firebase.initializeApp({
  apiKey: "AIzaSyBXFdU_DmIUl0Oc2wGF2ODAqh7NRWeVBMc",
  authDomain: "brotify-network.firebaseapp.com",
  databaseURL: "https://brotify-network-default-rtdb.firebaseio.com"
});
const db = firebase.database();

/******** DOM ********/
const loginScreen = document.getElementById("loginScreen");
const appScreen   = document.getElementById("appScreen");

const loginUser   = document.getElementById("loginUser");
const loginPass   = document.getElementById("loginPass");
const loginBtn    = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");

const groupTitle  = document.getElementById("groupTitle");
const groupCodeInput = document.getElementById("groupCodeInput");
const joinGroupBtn   = document.getElementById("joinGroupBtn");

const productsEl = document.getElementById("products");
const saveBtn    = document.getElementById("saveBtn");
const overviewEl = document.getElementById("overview");

/******** STATE ********/
let currentUser  = null;
let currentGroup = null;
let cart = {};

/******** HASH ********/
async function hash(text) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
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
  const snap = await db.ref("users/" + u).get();
  if (!snap.exists()) return alert("User existiert nicht");
  if (snap.val().password !== h) return alert("Falsches Passwort");

  localStorage.setItem("user", u);
  startSession(u);
};

registerBtn.onclick = async () => {
  const u = loginUser.value.trim();
  const p = loginPass.value;
  if (!u || !p) return alert("Alles ausfüllen");

  const h = await hash(p);
  const ref = db.ref("users/" + u);
  if ((await ref.get()).exists()) return alert("User existiert schon");

  await ref.set({ password: h });
  localStorage.setItem("user", u);
  startSession(u);
};

/******** SESSION ********/
function startSession(u) {
  currentUser = u;
  loginScreen.style.display = "none";
  appScreen.style.display = "block";

  const g = localStorage.getItem("group");
  if (g) joinGroup(g);
}

/******** AUTOLOGIN ********/
const savedUser = localStorage.getItem("user");
if (savedUser) startSession(savedUser);

/******** GRUPPE ********/
joinGroupBtn.onclick = () => {
  joinGroup(groupCodeInput.value.trim());
};

function joinGroup(code) {
  if (!code) return alert("Code eingeben");
  currentGroup = code;
  localStorage.setItem("group", code);

  groupTitle.textContent = "Gruppe: " + code;
  renderProducts();
  listenOrders();
}

/******** PRODUKTE ********/
function renderProducts() {
  productsEl.innerHTML = "";
  cart = {};

  ["Brezel","Brötchen","Croissant"].forEach(p => {
    cart[p] = 0;

    const row = document.createElement("div");
    row.innerHTML = `
      ${p}
      <button>-</button>
      <span>0</span>
      <button>+</button>
    `;

    const [ , minus, amount, plus ] = row.children;

    minus.onclick = () => {
      if (cart[p] > 0) {
        cart[p]--;
        amount.textContent = cart[p];
      }
    };

    plus.onclick = () => {
      cart[p]++;
      amount.textContent = cart[p];
    };

    productsEl.appendChild(row);
  });
}

/******** SPEICHERN ********/
saveBtn.onclick = () => {
  if (!currentGroup) return alert("Keine Gruppe");
  db.ref(`groups/${currentGroup}/orders`).push({
    user: currentUser,
    items: cart,
    time: Date.now()
  });
};

/******** LIVE ********/
function listenOrders() {
  db.ref(`groups/${currentGroup}/orders`).on("value", snap => {
    overviewEl.innerHTML = "";
    snap.forEach(c => {
      const d = c.val();
      overviewEl.innerHTML +=
        `<div><b>${d.user}</b>: ${JSON.stringify(d.items)}</div>`;
    });
  });
}
