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

/******** DOM – URSPRUNG ********/
const productsEl = document.getElementById("products");
const overviewEl = document.getElementById("overview");
const shoppingListEl = document.getElementById("shoppingList");
const nameInput = document.getElementById("family");
const remarkInput = document.getElementById("remark");
const pickupInline = document.getElementById("pickupInline");
const pickupInput = document.getElementById("pickupInput");
const saveBtn = document.getElementById("saveBtn");

/******** ICON PICKER – URSPRUNG ********/
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

/******** PRODUKTE – URSPRUNG ********/
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

/******** SPEICHERN – URSPRUNG + GRUPPE ********/
saveBtn.onclick = () => {
  if (!currentGroup) return alert("Keine Gruppe aktiv");

  const name = currentUser;
  if (!name) return alert("Nicht eingeloggt");

  const data = {
    name,
    icon: selectedIcon,
    remark: remarkInput.value.trim(),
    items: cart,
    time: Date.now()
  };

  const ref = db.ref(`groups/${currentGroup}/orders`);

  editOrderId
    ? ref.child(editOrderId).set(data)
    : ref.push(data);

  editOrderId = null;
  remarkInput.value = "";
  selectedIcon = ICONS[0];
  renderIcons();
  renderProducts();
};

/******** LIVE – URSPRUNG + GRUPPE ********/
function initGroupLive() {
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
}

/******** ENTER GROUP ********/
function enterGroup(groupName) {
  document.getElementById("groupTitle").textContent = groupName;
  document.getElementById("groupCode").textContent =
    "🔑 Einladungscode: " + currentGroup;

  renderIcons();
  renderProducts();
  initGroupLive();
}
