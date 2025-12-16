// shop.js
const petId = localStorage.getItem("petId");
let coins = parseInt(localStorage.getItem("totalCoins")) || 0;
document.getElementById("coins").innerText = coins;

// Treat data
const treats = [
    {name: "Apple", emoji: "🍎", size: "small", price: 5},
    {name: "Carrot", emoji: "🥕", size: "small", price: 4},
    {name: "Cookie", emoji: "🍪", size: "small", price: 6},
    {name: "Cheese", emoji: "🧀", size: "small", price: 5},
    {name: "Banana", emoji: "🍌", size: "small", price: 5},
    {name: "Burger", emoji: "🍔", size: "medium", price: 15},
    {name: "Pizza", emoji: "🍕", size: "medium", price: 18},
    {name: "Sushi", emoji: "🍣", size: "medium", price: 20},
    {name: "Sandwich", emoji: "🥪", size: "medium", price: 16},
    {name: "Pasta", emoji: "🍝", size: "medium", price: 17},
    {name: "Cake", emoji: "🍰", size: "large", price: 30},
    {name: "Steak", emoji: "🥩", size: "large", price: 35},
    {name: "Pineapple", emoji: "🍍", size: "large", price: 25},
    {name: "Watermelon", emoji: "🍉", size: "large", price: 28},
    {name: "Turkey", emoji: "🦃", size: "large", price: 40},
];

const itemsContainer = document.getElementById("items-container");
const checkoutList = document.getElementById("checkout-list");
const checkoutTotal = document.getElementById("checkout-total");
const checkoutBtn = document.getElementById("checkout-btn");

let cart = {}; // { "Apple": quantity }

function renderItems() {
    itemsContainer.innerHTML = "";
    treats.forEach(treat => {
        const div = document.createElement("div");
        div.classList.add("item");
        div.innerHTML = `
            <div class="emoji">${treat.emoji}</div>
            <div class="name">${treat.name}</div>
            <div class="size">${treat.size}</div>
            <div class="price">${treat.price} 🪙</div>
            <input type="number" min="0" value="0" data-name="${treat.name}">
        `;
        itemsContainer.appendChild(div);
    });
}

function updateCheckout() {
    checkoutList.innerHTML = "";
    let total = 0;

    Object.keys(cart).forEach(name => {
        const quantity = cart[name];
        if(quantity <= 0) return;
        const treat = treats.find(t => t.name === name);
        const itemTotal = treat.price * quantity;
        total += itemTotal;

        const div = document.createElement("div");
        div.classList.add("checkout-item");
        div.innerText = `${treat.emoji} ${name} x${quantity} = ${itemTotal} 🪙`;
        checkoutList.appendChild(div);
    });

    checkoutTotal.innerText = `Total: ${total} 🪙`;
}

function attachInputEvents() {
    document.querySelectorAll("#items-container input[type=number]").forEach(input => {
        input.addEventListener("input", () => {
            const name = input.dataset.name;
            const qty = parseInt(input.value) || 0;
            cart[name] = qty;
            updateCheckout();
        });
    });
}

checkoutBtn.addEventListener("click", async () => {
    const itemsToBuy = Object.keys(cart).filter(k => cart[k] > 0).map(name => ({
        name,
        quantity: cart[name]
    }));
    if(itemsToBuy.length === 0) return alert("Select at least one item!");

    const res = await fetch(`/buy_multiple_treats/${petId}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({items: itemsToBuy})
    });
    const data = await res.json();

    if(data.success) {
        coins = data.data.coins;
        localStorage.setItem("totalCoins", coins);
        document.getElementById("coins").innerText = coins;
        alert("Purchase successful!");
        cart = {};
        renderItems();
        attachInputEvents();
        updateCheckout();
    } else {
        alert(data.error || "Purchase failed!");
    }
});

// Initial load
renderItems();
attachInputEvents();
updateCheckout();
