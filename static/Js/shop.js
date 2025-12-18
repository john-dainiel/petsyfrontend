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

let cart = JSON.parse(localStorage.getItem("cart")) || [];
let userCoins = 0;
let filteredItems = [...items];

const usernameDisplay = document.getElementById("username-display");
const userCoinsEl = document.getElementById("user-coins");
const itemsContainer = document.getElementById("items-container");
const cartContainer = document.getElementById("cart-container");
const totalPriceEl = document.getElementById("total-price");
const remainingCoinsEl = document.getElementById("remaining-coins");
const checkoutBtn = document.getElementById("checkout-btn");
const backBtn = document.getElementById("back-btn");
const filterSelect = document.getElementById("filter-select");
const sortSelect = document.getElementById("sort-select");

// -------------------------------
// Back button
// -------------------------------
backBtn.addEventListener("click", () => {
  window.location.href = "main.html";
});

// -------------------------------
// Load User Info
// -------------------------------
function loadUserInfo() {
  const token = localStorage.getItem('userToken');
  if (!token) {
    usernameDisplay.innerText = "Guest";
    userCoinsEl.innerText = 0;
    userCoins = 0;
    updateCartAndUI();
    return;
  }

  fetch(`${backendUrl}/get_user_info`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      localStorage.setItem('username', data.username);
      localStorage.setItem('petId', data.pet_id);
      localStorage.setItem('totalCoins', data.coins || 0);

      userCoins = data.coins || 0;
      usernameDisplay.innerText = data.username;
      userCoinsEl.innerText = userCoins;
      updateCartAndUI();
    } else {
      usernameDisplay.innerText = "Guest";
      userCoinsEl.innerText = 0;
      userCoins = 0;
      updateCartAndUI();
    }
  })
  .catch(err => {
    console.error('Failed to load player info:', err);
    usernameDisplay.innerText = "Guest";
    userCoinsEl.innerText = 0;
    userCoins = 0;
    updateCartAndUI();
  });
}

// -------------------------------
// Filter & Sort
// -------------------------------
filterSelect.addEventListener("change", () => {
  const size = filterSelect.value;
  filteredItems = size === "all" ? [...items] : items.filter(i => i.size === size);
  applySort();
  renderItems();
});

sortSelect.addEventListener("change", () => {
  applySort();
  renderItems();
});

function applySort() {
  const sort = sortSelect.value;
  if (sort === "price-asc") {
    filteredItems.sort((a, b) => a.price - b.price);
  } else if (sort === "price-desc") {
    filteredItems.sort((a, b) => b.price - a.price);
  }
}

// -------------------------------
// Render Items
// -------------------------------
function renderItems() {
  itemsContainer.innerHTML = "";
  filteredItems.forEach((item, idx) => {
    const div = document.createElement("div");
    div.classList.add("item");
    div.innerHTML = `
      <span>${item.emoji} ${item.name} (${item.size}) - ${item.price} coins</span>
      <input type="number" min="0" value="0" id="qty-${idx}">
      <span class="subtotal" id="subtotal-${idx}">Subtotal: 0</span>
      <button id="add-btn-${idx}">Add</button>
    `;
    itemsContainer.appendChild(div);

    const qtyInput = div.querySelector("input");
    const subtotalSpan = div.querySelector(".subtotal");
    const addBtn = div.querySelector("button");

    qtyInput.addEventListener("input", () => {
      let qty = parseInt(qtyInput.value || 0);
      const subtotal = qty * item.price;
      subtotalSpan.innerText = `Subtotal: ${subtotal} coins`;

      const maxAffordable = Math.floor((userCoins - getCartTotal() + subtotal) / item.price);
      if (qty > maxAffordable) qty = maxAffordable;

      addBtn.disabled = (qty <= 0 || subtotal > userCoins - getCartTotal());
      updateCartItem(idx, qty);
      updateCartAndUI();
    });

    addBtn.addEventListener("click", () => {
      const qty = parseInt(qtyInput.value || 0);
      if (qty <= 0) return;
      addToCart(idx, qty);
      showFloatingEmoji(item, qty);
      qtyInput.value = 0;
      subtotalSpan.innerText = `Subtotal: 0`;
      addBtn.disabled = true;
    });
  });
}

// -------------------------------
// Cart Functions
// -------------------------------
function addToCart(idx, qty) {
  const item = filteredItems[idx];
  const existing = cart.find(c => c.name === item.name && c.size === item.size);
  if (existing) existing.quantity += qty;
  else cart.push({ ...item, quantity: qty });

  saveCart();
  showAddMessage({ ...item, quantity: qty });
  updateCartAndUI();
}

function updateCartItem(idx, qty) {
  const item = filteredItems[idx];
  const existing = cart.find(c => c.name === item.name && c.size === item.size);
  if (existing) {
    existing.quantity = qty;
    if (qty <= 0) cart = cart.filter(c => c.quantity > 0);
  } else if (qty > 0) {
    cart.push({ ...item, quantity: qty });
  }
  saveCart();
}

function renderCart() {
  cartContainer.innerHTML = "";
  const remainingCoins = userCoins - getCartTotal();
  cart.forEach((item, idx) => {
    const div = document.createElement("div");
    div.classList.add("cart-item");
    div.title = `Coins left if you buy this item: ${remainingCoins - item.price * item.quantity}`;
    div.innerHTML = `
      <span>${item.emoji} ${item.name} - Price: ${item.price} coins</span>
      <input type="number" min="0" value="${item.quantity}" class="cart-qty">
      <span class="cart-subtotal">Subtotal: ${item.price * item.quantity} coins</span>
      <button class="remove-btn">Remove</button>
    `;

    if (item.price * item.quantity > remainingCoins) {
      div.style.backgroundColor = "#ffe6e6";
    } else {
      div.style.backgroundColor = "#e6ffe6";
    }

    const qtyInput = div.querySelector(".cart-qty");
    const subtotalSpan = div.querySelector(".cart-subtotal");
    const removeBtn = div.querySelector(".remove-btn");

    qtyInput.addEventListener("input", () => {
      let newQty = parseInt(qtyInput.value || 0);
      if (newQty < 0) newQty = 0;
      item.quantity = newQty;
      if (item.quantity === 0) cart.splice(idx, 1);
      subtotalSpan.innerText = `Subtotal: ${item.price * item.quantity} coins`;
      div.title = `Coins left if you buy this item: ${remainingCoins - item.price * item.quantity}`;
      saveCart();
      updateCartAndUI();
    });

    removeBtn.addEventListener("click", () => {
      if (confirm(`Remove ${item.name} from cart?`)) {
        cart.splice(idx, 1);
        saveCart();
        updateCartAndUI();
      }
    });

    // Mobile swipe-to-remove
    let touchStartX = 0;
    div.addEventListener("touchstart", e => touchStartX = e.touches[0].clientX);
    div.addEventListener("touchend", e => {
      const touchEndX = e.changedTouches[0].clientX;
      if (touchStartX - touchEndX > 50) {
        cart.splice(idx, 1);
        saveCart();
        updateCartAndUI();
      }
    });

    cartContainer.appendChild(div);
  });
}

// -------------------------------
// Mini Cart Preview on Hover
// -------------------------------
cartContainer.addEventListener("mouseenter", showMiniCart);
cartContainer.addEventListener("mouseleave", hideMiniCart);

let miniCartDiv;
function showMiniCart() {
  miniCartDiv = document.createElement("div");
  miniCartDiv.className = "mini-cart";
  if (cart.length === 0) miniCartDiv.innerText = "Cart is empty";
  else {
    miniCartDiv.innerHTML = cart.map(item => 
      `${item.emoji} ${item.name} x${item.quantity} = ${item.price * item.quantity} coins`
    ).join("<br>");
  }
  document.body.appendChild(miniCartDiv);
  const rect = cartContainer.getBoundingClientRect();
  miniCartDiv.style.top = `${rect.bottom + 5}px`;
  miniCartDiv.style.left = `${rect.left}px`;
}

function hideMiniCart() {
  if (miniCartDiv) miniCartDiv.remove();
}

// -------------------------------
// Floating Emoji Animation
// -------------------------------
function showFloatingEmoji(item, qty) {
  const emojiDiv = document.createElement("div");
  emojiDiv.className = "floating-emoji";
  emojiDiv.innerText = item.emoji.repeat(qty);
  document.body.appendChild(emojiDiv);

  const rect = document.getElementById(`qty-${filteredItems.indexOf(item)}`).getBoundingClientRect();
  emojiDiv.style.left = `${rect.left}px`;
  emojiDiv.style.top = `${rect.top}px`;

  const cartRect = cartContainer.getBoundingClientRect();
  emojiDiv.animate([
    { transform: `translate(0, 0)`, opacity: 1 },
    { transform: `translate(${cartRect.left - rect.left}px, ${cartRect.top - rect.top}px)`, opacity: 0 }
  ], {
    duration: 1000,
    easing: "ease-in-out"
  });

  setTimeout(() => emojiDiv.remove(), 1000);
}

// -------------------------------
// Utilities
// -------------------------------
function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function updateCartAndUI() {
  renderCart();
  updateRemainingCoins();
  highlightExpensiveItems();
}

function updateRemainingCoins() {
  const total = getCartTotal();
  totalPriceEl.innerText = `Total: ${total} coins`;
  const remaining = userCoins - total;
  remainingCoinsEl.innerText = `Coins after purchase: ${remaining}`;
  remainingCoinsEl.title = `Coins left if you buy the entire cart: ${remaining}`;
  checkoutBtn.disabled = remaining < 0 || cart.length === 0;
}

function highlightExpensiveItems() {
  const totalInCart = getCartTotal();
  itemsContainer.querySelectorAll(".item").forEach((div, idx) => {
    const qtyInput = div.querySelector("input");
    const addBtn = div.querySelector("button");
    const inputQty = parseInt(qtyInput.value || 0);

    const cost = filteredItems[idx].price * inputQty;
    const remaining = userCoins - totalInCart;

    if (cost > remaining || inputQty <= 0) {
      div.style.backgroundColor = "#ffe6e6";
      addBtn.disabled = true;
    } else {
      div.style.backgroundColor = "";
      addBtn.disabled = false;
    }
  });
}

function showAddMessage(item) {
  const msg = document.createElement("div");
  msg.className = "add-msg";
  msg.innerText = `Added ${item.quantity} x ${item.name} to cart!`;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 1500);
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// -------------------------------
// Checkout
// -------------------------------
checkoutBtn.addEventListener("click", async () => {
  const token = localStorage.getItem("userToken");
  const petId = localStorage.getItem("petId");

  for (const item of cart) {
    const res = await fetch(`${backendUrl}/shop/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        pet_id: petId,
        item_name: item.name,
        item_size: item.size,
        quantity: item.quantity
      })
    });

    const data = await res.json();
    if (!data.success) {
      return alert(`Purchase failed: ${data.error}`);
    } else {
      userCoins = data.coins;
    }
  }

  cartContainer.style.transition = "background-color 0.3s";
  cartContainer.style.backgroundColor = "#d4edda";
  setTimeout(() => cartContainer.style.backgroundColor = "", 500);

  alert("Purchase successful!");
  cart = [];
  saveCart();
  updateCartAndUI();
  itemsContainer.querySelectorAll("input").forEach(input => input.value = 0);
  itemsContainer.querySelectorAll(".subtotal").forEach(sub => sub.innerText = "Subtotal: 0");
});

// -------------------------------
// CSS
// -------------------------------
const style = document.createElement("style");
style.innerHTML = `
.add-msg {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #d4edda;
  color: #155724;
  padding: 8px 12px;
  border-radius: 5px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  font-weight: bold;
  z-index: 9999;
}
.item input, .cart-qty {
  width: 50px;
  margin-left: 5px;
}
.item button {
  margin-left: 5px;
}
.item .subtotal, .cart-subtotal {
  margin-left: 10px;
  font-size: 0.85em;
  color: #333;
}
.cart-item {
  margin-bottom: 8px;
  padding: 4px;
  border-radius: 4px;
}
.mini-cart {
  position: fixed;
  background: #fff;
  border: 1px solid #ccc;
  padding: 8px 12px;
  border-radius: 5px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  font-size: 0.9em;
  z-index: 9999;
}
.floating-emoji {
  position: fixed;
  font-size: 24px;
  pointer-events: none;
  z-index: 9999;
}
@media (max-width: 768px) {
  .item, .cart-item {
    display: flex;
    flex-direction: column;
    margin-bottom: 10px;
  }
  .item input, .cart-qty, .item button {
    width: 100%;
    margin: 5px 0;
  }
}
`;
document.head.appendChild(style);

// -------------------------------
// Initialize
// -------------------------------
document.addEventListener('DOMContentLoaded', () => {
  renderItems();
  loadUserInfo();
});
