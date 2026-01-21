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

/******** DOM ********/
const productsEl = document.getElementById("products");
const overviewEl = document.getElementById("overview");
const shoppingListEl = document.getElementById("shoppingList");
const nameInput = document.getElementById("family");
const remarkInput = document.getElementById("remark");
const pickupInline = document.getElementById("pickupInline");
const pickupInput = document.getElementById("pickupInput");
const saveBtn = document.getElementById("saveBtn");

/******** LOGIN / GRUPPEN ********/
createGroupBtn.onclick = () => {
  const groupName = groupNameInput.value.trim();
  const userNameVal = userName.value.trim();
  if (!groupName || !userNameVal) return alert("Gruppenname & Name eingeben");

  const ref = db.ref("groups").push();
  currentGroup = ref.key.substring(0, 8).toUpperCase();

  db.ref("groups/" + currentGroup).set({
    name: groupName,
    created: Date.now()
  });

  saveSession(groupName, userNameVal);
  enterGroup(groupName, userNameVal);
};

joinGroupBtn.onclick = () => {
  const code = joinCode.value.trim().toUpperCase();
  const userNameVal = joinName.value.trim();
  if (!code || !userNameVal) return alert("Code & Name eingeben");

  db.ref("groups/" + code).once("value", snap => {
    if (!snap.exists()) return alert("Gruppe nicht gefunden");
    currentGroup = code;
    saveSession(snap.val().name, userNameVal);
    enterGroup(snap.val().name, userNameVal);
  });
};

/******** SESSION (MERKEN, NICHT BINDEN) ********/
function saveSession(groupName, userName) {
  localStorage.setItem("brotifyGroup", currentGroup);
  localStorage.setItem("brotifyGroupName", groupName);
  localStorage.setItem("brotifyUserName", userName);
}

function loadSession() {
  const g = localStorage.getItem("brotifyGroup");
  const gn = localStorage.getItem("brotifyGroupName");
  const u = localStorage.getItem("brotifyUserName");

  if (g && gn && u) {
    currentGroup = g;
    enterGroup(gn, u);
  }
}

/******** GRUPPE VERLASSEN ********/
leaveGroupBtn.onclick = () => {
  if (!confirm("Gruppe wirklich verlassen?")) return;
  localStorage.clear();
  location.reload();
};

/******** ENTER GROUP ********/
function enterGroup(groupName, userNameVal) {
  document.getElementById("groupTitle").textContent = groupName;
  document.getElementById("groupCode").textContent =
    "🔑 Einladungscode: " + currentGroup;

  nameInput.value = userNameVal;

  loginScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");

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

  const ref = db.ref(`groups/${currentGroup}/orders`);

  editOrderId
    ? ref.child(editOrderId).set(data)
    : ref.push(data);

  editOrderId = null;
  saveBtn.textContent = "🛒 Bestellung speichern";
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
      editBtn.style.float = "right";
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

/******** AUTO-REJOIN ********/
window.addEventListener("load", () => {
  loadSession();
});
