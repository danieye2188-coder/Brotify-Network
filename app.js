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

/******** DOM ********/
const productsEl = document.getElementById("products");
const overviewEl = document.getElementById("overview");
const shoppingListEl = document.getElementById("shoppingList");
const nameInput = document.getElementById("family");
const remarkInput = document.getElementById("remark");
const pickupInline = document.getElementById("pickupInline");
const pickupInput = document.getElementById("pickupInput");
const saveBtn = document.getElementById("saveBtn");

/******** LOGIN – HASH ********/
async function hash(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
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

function startUserSession(u) {
  currentUser = u;
  nameInput.value = u;
  loginScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
}

/******** AUTO LOGIN ********/
window.addEventListener("load", () => {
  const u = localStorage.getItem("brotifyUser");
  const g = localStorage.getItem("brotifyGroup");
  const gn = localStorage.getItem("brotifyGroupName");

  if (u) {
    startUserSession(u);
    if (g && gn) {
      currentGroup = g;
      enterGroup(gn);
    }
  }
});

/******** GRUPPEN ********/
createGroupBtn.onclick = () => {
  const groupName = groupNameInput.value.trim();
  if (!groupName) return alert("Gruppenname eingeben");

  const ref = db.ref("groups").push();
  currentGroup = ref.key.substring(0, 8).toUpperCase();

  db.ref("groups/" + currentGroup).set({
    name: groupName,
    created: Date.now()
  });

  localStorage.setItem("brotifyGroup", currentGroup);
  localStorage.setItem("brotifyGroupName", groupName);

  enterGroup(groupName);
};

joinGroupBtn.onclick = () => {
  const code = joinCode.value.trim().toUpperCase();
  if (!code) return alert("Code eingeben");

  db.ref("groups/" + code).once("value", snap => {
    if (!snap.exists()) return alert("Gruppe nicht gefunden");

    currentGroup = code;
    localStorage.setItem("brotifyGroup", code);
    localStorage.setItem("brotifyGroupName", snap.val().name);

    enterGroup(snap.val().name);
  });
};

leaveGroupBtn.onclick = () => {
  if (!confirm("Gruppe wirklich verlassen?")) return;
  localStorage.removeItem("brotifyGroup");
  localStorage.removeItem("brotifyGroupName");
  location.reload();
};

/******** ENTER GROUP ********/
function enterGroup(groupName) {
  document.getElementById("groupTitle").textContent = groupName;
  document.getElementById("groupCode").textContent =
    "🔑 Einladungscode: " + currentGroup;

  initApp();
}

/******** ICON PICKER ********/
function renderIcons(active = selectedIcon) {
  const picker = document.getElementById("iconPicker");
  picker.innerHTML = "";
  ICONS.forEach(icon => {
    const span = document.createElement("span");
    span.textContent = icon;
    span.className = "icon" + (icon === active ? " selected" : "");
    span.onclick = () => {
      selectedIcon = icon;
      renderIcons(icon);
    };
    picker.appendChild(span);
  });
}

/******** PRODUKTE (ORIGINAL) ********/
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

/******** SPEICHERN ********/
saveBtn.onclick = () => {
  if (!currentGroup) return alert("Keine Gruppe aktiv");

  const data = {
    name: currentUser,
    icon: selectedIcon,
    remark: remarkInput.value.trim(),
    items: cart,
    time: Date.now()
  };

  const ref = db.ref(`groups/${currentGroup}/orders`);
  editOrderId ? ref.child(editOrderId).set(data) : ref.push(data);

  editOrderId = null;
  remarkInput.value = "";
  selectedIcon = ICONS[0];
  renderIcons();
  renderProducts();
};

/******** LIVE ********/
function initApp() {
  renderIcons();
  renderProducts();

  db.ref(`groups/${currentGroup}/orders`).on("value", snap => {
    overviewEl.innerHTML = "";
    shoppingListEl.innerHTML = "";

    const totals = {};
    const remarks = [];

    snap.forEach(c => {
      const d = c.val();

      const box = document.createElement("div");
      box.className = "overview-box";
      box.innerHTML = `${d.icon} <b>${d.name}</b>`;

      if (d.remark) {
        box.innerHTML += `<div class="remark">📝 ${d.remark}</div>`;
        remarks.push(`📝 ${d.name}: ${d.remark}`);
      }

      for (let i in d.items) {
        if (d.items[i] > 0) {
          totals[i] = (totals[i] || 0) + d.items[i];
          box.innerHTML += `<br>${i}: ${d.items[i]}×`;
        }
      }

      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️ Bearbeiten";
      editBtn.onclick = () => {
        editOrderId = c.key;
        selectedIcon = d.icon;
        remarkInput.value = d.remark || "";
        renderIcons(d.icon);
        renderProducts(d.items);
      };

      const delBtn = document.createElement("button");
      delBtn.textContent = "❌ Bestellung löschen";
      delBtn.className = "delete-btn";
      delBtn.onclick = () => {
        if (confirm("Bestellung wirklich löschen?")) {
          db.ref(`groups/${currentGroup}/orders/${c.key}`).remove();
        }
      };

      box.append(editBtn, delBtn);
      overviewEl.appendChild(box);
    });

    Object.keys(totals).forEach(item => {
      shoppingListEl.innerHTML += `
        <label class="shopping-row">
          <span class="text">${totals[item]}× ${item}</span>
          <input type="checkbox">
        </label>`;
    });

    remarks.forEach(r => {
      shoppingListEl.innerHTML += `
        <label class="shopping-row">
          <span class="text">${r}</span>
          <input type="checkbox">
        </label>`;
    });
  });

  db.ref(`groups/${currentGroup}/meta/abholer`).on("value", snap => {
    pickupInline.textContent = snap.val()
      ? `🚗💨 Abholer: ${snap.val()}`
      : "🚗💨 kein Abholer";
  });
}

/******** ABHOLER ********/
document.getElementById("savePickup").onclick = () => {
  const v = pickupInput.value.trim();
  if (v) db.ref(`groups/${currentGroup}/meta/abholer`).set(v);
  pickupInput.value = "";
};

document.getElementById("clearPickup").onclick = () => {
  db.ref(`groups/${currentGroup}/meta/abholer`).remove();
};
