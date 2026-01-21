/******** FIREBASE ********/
firebase.initializeApp({
  apiKey: "AIzaSyBXFdU_DmIUl0Oc2wGF2ODAqh7NRWeVBMc",
  authDomain: "brotify-network.firebaseapp.com",
  projectId: "brotify-network",
  storageBucket: "brotify-network.firebasestorage.app",
  messagingSenderId: "916259400168",
  appId: "1:916259400168:web:221877f89220e7c6225c5d"
});
const db = firebase.database();

/******** STATE ********/
let currentUser = null;
let currentGroup = null;
let cart = {};
let selectedIcon = "🦊";

/******** DOM ********/
const loginScreen = document.getElementById("loginScreen");
const groupScreen = document.getElementById("groupScreen");
const appScreen = document.getElementById("appScreen");

/******** UTIL ********/
function show(screen) {
  [loginScreen, groupScreen, appScreen].forEach(s => s.classList.add("hidden"));
  screen.classList.remove("hidden");
}

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/******** LOGIN ********/
document.getElementById("createGroupBtn").onclick = () => {
  const name = userName.value.trim();
  if (!name) return alert("Name eingeben");

  currentUser = genCode();
  const groupId = genCode();

  db.ref(`groups/${groupId}`).set({
    owner: currentUser,
    members: { [currentUser]: name }
  });

  db.ref(`users/${currentUser}`).set({
    name,
    groups: { [groupId]: true }
  });

  loadGroups();
};

document.getElementById("joinGroupBtn").onclick = () => {
  const code = joinCode.value.trim().toUpperCase();
  const name = userName.value.trim();
  if (!code || !name) return alert("Name & Code nötig");

  currentUser = genCode();
  db.ref(`groups/${code}`).once("value", snap => {
    if (!snap.exists()) return alert("Gruppe nicht gefunden");

    db.ref(`groups/${code}/members/${currentUser}`).set(name);
    db.ref(`users/${currentUser}`).set({
      name,
      groups: { [code]: true }
    });

    loadGroups();
  });
};

/******** GRUPPEN ********/
function loadGroups() {
  show(groupScreen);
  const list = document.getElementById("groupList");
  list.innerHTML = "";

  db.ref(`users/${currentUser}/groups`).once("value", snap => {
    snap.forEach(g => {
      const btn = document.createElement("button");
      btn.textContent = "➡ Gruppe " + g.key;
      btn.onclick = () => enterGroup(g.key);
      list.appendChild(btn);
    });
  });
}

function enterGroup(id) {
  currentGroup = id;
  document.getElementById("groupCode").textContent = "🔑 Einladungscode: " + id;
  show(appScreen);
  listenOrders();
}

/******** BESTELLUNGEN ********/
function listenOrders() {
  db.ref(`groups/${currentGroup}/orders`).on("value", snap => {
    overview.innerHTML = "";
    shoppingList.innerHTML = "";
    const totals = {};

    snap.forEach(c => {
      const d = c.val();
      const box = document.createElement("div");
      box.textContent = d.name;
      overview.appendChild(box);

      for (let i in d.items) {
        totals[i] = (totals[i] || 0) + d.items[i];
      }
    });

    for (let i in totals) {
      shoppingList.innerHTML += `<div>${totals[i]}× ${i}</div>`;
    }
  });
}

saveBtn.onclick = () => {
  const name = family.value.trim();
  if (!name) return alert("Name fehlt");

  db.ref(`groups/${currentGroup}/orders`).push({
    name,
    icon: selectedIcon,
    items: cart,
    remark: remark.value,
    time: Date.now()
  });
};

/******** DELETE GROUP ********/
deleteGroupBtn.onclick = () => {
  if (confirm("Gruppe wirklich löschen?")) {
    db.ref(`groups/${currentGroup}`).remove();
    show(groupScreen);
    loadGroups();
  }
};
