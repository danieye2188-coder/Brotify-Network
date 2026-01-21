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

const groupTitle     = document.getElementById("groupTitle");
const groupCodeInput = document.getElementById("groupCodeInput");
const joinGroupBtn   = document.getElementById("joinGroupBtn");

const productsEl = document.getElementById("products");
const saveBtn    = document.getElementById("saveBtn");
const overviewEl = document.getElementById("overview");

/******** STATE ********/
let currentUser  = null;
let currentGroup = null;
let cart = {};
let ordersRef = null;

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

  if ((await ref.get()).exists()) {
    return alert("User existiert schon");
  }

  await ref.set({ password: h, created: Date.now() });
  localStorage.setItem("user", u);
  startSession(u);
};

/******** SESSION ********/
function startSession(u) {
  currentUser = u;

  loginScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");

  const g = localStorage.getItem("group");
  if (g) joinGroup(g);
}

/******** AUTOLOGIN ********/
const savedUser = localStorage.getItem("user");
if (savedUser) {
  startSession(savedUser);
}

/******** GRUPPEN ********/
joinGroupBtn.onclick = () => {
  const code = groupCodeInput.value.trim();
  joinGroup(code);
};

function joinGroup(code) {
  if (!code) return alert("Code eingeben");

  currentGroup = code;
  localStorage.setItem("group", code);

  groupTitle.textContent = "Gruppe: " + code;

  renderProducts();
  startOrdersListener();
}

/******** PRODUKTE ********/
function renderProducts() {
  productsEl.innerHTML = "";
  cart = {};

  ["Brezel","Brötchen","Croissant"].forEach(p => {
    cart[p] = 0;

    const row = document.createElement("div");
    row.className = "product";

    const name = document.createElement("div");
    name.textContent = p;

    const minus = document.createElement("button");
    minus.textContent = "−";
    minus.className = "pm";

    const amt = document.createElement("div");
    amt.className = "amount";
    amt.textContent = "0";

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

/******** SPEICHERN ********/
saveBtn.onclick = () => {
  if (!currentGroup) return alert("Keine Gruppe");
  if (!currentUser) return alert("Nicht eingeloggt");

  db.ref(`groups/${currentGroup}/orders`).push({
    user: currentUser,
    items: cart,
    time: Date.now()
  });
};

/******** LIVE ********/
function startOrdersListener() {
  if (ordersRef) ordersRef.off();

  ordersRef = db.ref(`groups/${currentGroup}/orders`);
  ordersRef.on("value", snap => {
    overviewEl.innerHTML = "";

    snap.forEach(c => {
      const d = c.val();
      overviewEl.innerHTML += `
        <div class="overview-box">
          <b>${d.user}</b>: ${JSON.stringify(d.items)}
        </div>
      `;
    });
  });
}
