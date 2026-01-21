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

/******** LOGIN ********/
createGroupBtn.onclick = () => {
  const groupName = groupNameInput.value.trim();
  const userNameVal = userName.value.trim();
  if (!groupName || !userNameVal) return alert("Alles ausfüllen");

  const ref = db.ref("groups").push();
  currentGroup = ref.key.substring(0, 8).toUpperCase();

  db.ref("groups/" + currentGroup).set({
    name: groupName,
    created: Date.now()
  });

  enterGroup(groupName, userNameVal);
};

joinGroupBtn.onclick = () => {
  const code = joinCode.value.trim().toUpperCase();
  const name = joinName.value.trim();
  if (!code || !name) return alert("Code & Name eingeben");

  db.ref("groups/" + code).once("value", snap => {
    if (!snap.exists()) return alert("Gruppe nicht gefunden");
    currentGroup = code;
    enterGroup(snap.val().name, name);
  });
};

function enterGroup(groupName, userNameVal) {
  groupTitle.textContent = groupName;
  groupCode.textContent = "🔑 Einladungscode: " + currentGroup;
  family.value = userNameVal;

  loginScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");

  initApp();
}

/******** DOM ********/
const productsEl = document.getElementById("products");
const overviewEl = document.getElementById("overview");
const shoppingListEl = document.getElementById("shoppingList");
const remarkInput = document.getElementById("remark");
const pickupInline = document.getElementById("pickupInline");
const pickupInput = document.getElementById("pickupInput");

/******** ICON PICKER ********/
function renderIcons(active = selectedIcon) {
  iconPicker.innerHTML = "";
  ICONS.forEach(icon => {
    const s = document.createElement("span");
    s.textContent = icon;
    s.className = "icon" + (icon === active ? " selected" : "");
    s.onclick = () => { selectedIcon = icon; renderIcons(icon); };
    iconPicker.appendChild(s);
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

      minus.onclick = () => { if (cart[p] > 0) amt.textContent = --cart[p]; };
      plus.onclick = () => { amt.textContent = ++cart[p]; };

      row.append(name, minus, amt, plus);
      productsEl.appendChild(row);
    });
  }
}

/******** SPEICHERN ********/
saveBtn.onclick = () => {
  const name = family.value.trim();
  if (!name) return alert("Name fehlt");

  const data = {
    name,
    icon: selectedIcon,
    remark: remarkInput.value.trim(),
    items: cart,
    time: Date.now()
  };

  const ref = db.ref(`groups/${currentGroup}/orders`);
  editOrderId ? ref.child(editOrderId).set(data) : ref.push(data);

  editOrderId = null;
  remarkInput.value = "";
  saveBtn.textContent = "🛒 Bestellung speichern";
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

      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️";
      editBtn.style.float = "right";
      editBtn.onclick = () => {
        editOrderId = c.key;
        family.value = d.name;
        remarkInput.value = d.remark || "";
        selectedIcon = d.icon;
        renderIcons(d.icon);
        renderProducts(d.items);
        saveBtn.textContent = "✏️ Bestellung aktualisieren";
        window.scrollTo({ top: 0, behavior: "smooth" });
      };

      const delBtn = document.createElement("button");
      delBtn.textContent = "❌";
      delBtn.className = "delete-btn";
      delBtn.onclick = () => {
        if (confirm("Bestellung wirklich löschen?")) {
          db.ref(`groups/${currentGroup}/orders/${c.key}`).remove();
        }
      };

      box.append(editBtn, delBtn);
      overviewEl.appendChild(box);
    });

    Object.keys(totals).forEach(i => {
      shoppingListEl.innerHTML += `
        <label class="shopping-row">
          <span class="text">${totals[i]}× ${i}</span>
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

savePickup.onclick = () => {
  const v = pickupInput.value.trim();
  if (v) db.ref(`groups/${currentGroup}/meta/abholer`).set(v);
  pickupInput.value = "";
};

clearPickup.onclick = () => {
  db.ref(`groups/${currentGroup}/meta/abholer`).remove();
};
