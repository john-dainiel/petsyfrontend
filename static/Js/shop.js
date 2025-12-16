
const backendUrl = "https://petsy-dow7.onrender.com";

const items = [
  { name: "Apple", emoji: "🍎", size: "small", price: 5 },
  { name: "Carrot", emoji: "🥕", size: "small", price: 4 },
  { name: "Cookie", emoji: "🍪", size: "small", price: 6 },
  { name: "Cheese", emoji: "🧀", size: "small", price: 5 },
  { name: "Banana", emoji: "🍌", size: "small", price: 5 },
  { name: "Burger", emoji: "🍔", size: "medium", price: 15 },
  { name: "Pizza", emoji: "🍕", size: "medium", price: 18 },
  { name: "Sushi", emoji: "🍣", size: "medium", price: 20 },
  { name: "Sandwich", emoji: "🥪", size: "medium", price: 16 },
  { name: "Pasta", emoji: "🍝", size: "medium", price: 17 },
  { name: "Cake", emoji: "🍰", size: "large", price: 30 },
  { name: "Steak", emoji: "🥩", size: "large", price: 35 },
  { name: "Pineapple", emoji: "🍍", size: "large", price: 25 },
  { name: "Watermelon", emoji: "🍉", size: "large", price: 28 },
  { name: "Turkey", emoji: "🦃", size: "large", price: 40 }
];

let cart = [];
let userCoins = 100;
let username = "Player";

const userCoinsEl = document.getElementById("user-coins");
const usernameEl = document.getElementById("username-display");
const itemsContainer = document.getElementById("items-container");
const cartContainer = document.getElementById("cart-container");
const totalPriceEl = document.getElementById("total-price");
const remainingCoinsEl = document.getElementById("remaining-coins");
const checkoutBtn = document.getElementById("checkout-btn");
const backBtn = document.getElementById("back-btn");

// Back button
backBtn.addEventListener("click", () => {
  window.location.href = "main.html"; // replace with your main menu
});

function loadUserInfo() {
  username = localStorage.getItem("username") || "Player";
  usernameEl.innerText = username;

  // Fetch coins from backend
  fetch("/get_user_info", {
    headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` }
  })
    .then(res => res.json())
    .then(data => {
      userCoins = data.coins || 0;
      userCoinsEl.innerText = userCoins;
      updateRemainingCoins();
    });
}

function renderItems() {
  itemsContainer.innerHTML = "";
  items.forEach((item, idx) => {
    const div = document.createElement("div");
    div.classList.add("item");
    div.innerHTML = `
      <span>${item.emoji} ${item.name} (${item.size}) - ${item.price} coins</span>
      <input type="number" min="0" value="0" id="qty-${idx}">
      <button onclick="addToCart(${idx})">Add</button>
    `;
    itemsContainer.appendChild(div);
  });
}

function addToCart(idx) {
  const qty = parseInt(document.getElementById(`qty-${idx}`).value);
  if (qty <= 0) return;

  const item = items[idx];
  const existing = cart.find(c => c.name === item.name && c.size === item.size);
  if (existing) existing.quantity += qty;
  else cart.push({ ...item, quantity: qty });

  renderCart();
}

function renderCart() {
  cartContainer.innerHTML = "";
  cart.forEach((item, idx) => {
    const div = document.createElement("div");
    div.classList.add("cart-item");
    div.innerHTML = `
      <span>${item.emoji} ${item.name} x ${item.quantity} = ${item.price * item.quantity}</span>
      <button onclick="removeFromCart(${idx})">Remove</button>
    `;
    cartContainer.appendChild(div);
  });
  updateRemainingCoins();
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  renderCart();
}

function updateRemainingCoins() {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  totalPriceEl.innerText = `Total: ${total} coins`;
  remainingCoinsEl.innerText = `Coins after purchase: ${userCoins - total}`;
}

checkoutBtn.addEventListener("click", () => {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (total > userCoins) return alert("Not enough coins!");

  const petId = localStorage.getItem("petId");
  fetch(`/buy_multiple_treats/${petId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("userToken")}`
    },
    body: JSON.stringify({ items: cart })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert(`Purchase successful! Coins left: ${userCoins - total}`);
        cart = [];
        loadUserInfo();
        renderCart();
      } else {
        alert("Purchase failed: " + data.message);
      }
    });
});

loadUserInfo();
renderItems();

