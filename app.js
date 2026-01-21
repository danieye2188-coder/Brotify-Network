alert("APP STARTET");
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

/******** AUTH ********/
let currentUser = null;
let activeGroupId = localStorage.getItem("activeGroup");
let groupRef = null;

firebase.auth().signInAnonymously();

firebase.auth().onAuthStateChanged(user => {
  if (!user) return;
  currentUser = user;

  // Warten, bis User sicher da ist
  if (activeGroupId && !groupRef) {
    initGroup(activeGroupId);
  }
});

/******** GROUP INIT ********/
function initGroup(groupId) {
  activeGroupId = groupId;
  localStorage.setItem("activeGroup", groupId);
  groupRef = db.ref("groups/" + groupId);
  document.body.classList.add("logged-in");
  startApp();
}

/******** STATE ********/
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

/******** START APP ********/
function startApp() {
  renderIcons();
  renderProducts();
  listenOrders();
  listenPickup();
}

/******** SPEICHERN ********/
saveBtn.onclick = () => {
  const name = nameInput.value.trim();
  if (!name) return alert("Bitte deinen Namen eingeben");

  const data = {
    name,
    icon: selectedIcon,
    remark: remarkInput.value.trim(),
    items: cart,
    time: Date.now()
  };

  editOrderId
    ? groupRef.child("orders/" + editOrderId).set(data)
    : groupRef.child("orders").push(data);

  editOrderId = null;
  saveBtn.textContent = "🛒 Bestellung speichern";
  nameInput.value = "";
  remarkInput.value = "";
  selectedIcon = ICONS[0];
  renderIcons();
  renderProducts();
};

/******** LIVE ORDERS ********/
function listenOrders() {
  groupRef.child("orders").on("value", snap => {
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
        nameInput.value = d.name;
        remarkInput.value = d.remark || "";
        selectedIcon = d.icon;
        renderIcons(d.icon);
        renderProducts(d.items);
        saveBtn.textContent = "✏️ Bestellung aktualisieren";
        window.scrollTo({ top: 0, behavior: "smooth" });
      };

      const delBtn = document.createElement("button");
      delBtn.textContent = "❌ Bestellung löschen";
      delBtn.className = "delete-btn";
      delBtn.onclick = () => {
        if (confirm("Bestellung wirklich löschen?")) {
          groupRef.child("orders/" + c.key).remove();
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
        </label>
      `;
    });

    remarks.forEach(r => {
      shoppingListEl.innerHTML += `
        <label class="shopping-row">
          <span class="text">${r}</span>
          <input type="checkbox">
        </label>
      `;
    });
  });
}

/******** ABHOLER ********/
function listenPickup() {
  groupRef.child("meta/abholer").on("value", snap => {
    pickupInline.textContent = snap.val()
      ? `🚗💨 Abholer: ${snap.val()}`
      : "🚗💨 kein Abholer";
  });
}

document.getElementById("savePickup").onclick = () => {
  const v = pickupInput.value.trim();
  if (v) groupRef.child("meta/abholer").set(v);
  pickupInput.value = "";
};

document.getElementById("clearPickup").onclick = () => {
  groupRef.child("meta/abholer").remove();
};

/******** GROUP ACTIONS ********/
document.getElementById("createGroupBtn").onclick = () => {
  const name = userNameInput.value.trim();
  if (!name) return alert("Name fehlt");

  const groupId = Math.random().toString(36).substr(2, 6).toUpperCase();

document.getElementById("createGroupBtn").onclick = () => {
  const name = userNameInput.value.trim();
  if (!name) return alert("Name fehlt");

  const groupId = Math.random().toString(36).substr(2, 6).toUpperCase();

  // Gruppe anlegen
  db.ref("groups/" + groupId).set({
    createdAt: Date.now()
  });

  // Code anzeigen
  document.getElementById("groupCodeValue").textContent = groupId;
  document.getElementById("groupCodeBox").style.display = "block";

  // NUR merken – NICHT starten
  activeGroupId = groupId;
  localStorage.setItem("activeGroup", groupId);
};

  // Gruppe aktivieren
 activeGroupId = code;
localStorage.setItem("activeGroup", code);

if (currentUser) {
  initGroup(code);
}

document.getElementById("joinGroupBtn").onclick = () => {
  const code = joinCodeInput.value.trim().toUpperCase();
  if (!code) return;

  db.ref("groups/" + code).once("value", snap => {
    if (!snap.exists()) return alert("Gruppe nicht gefunden");
    initGroup(code);
  });
};
