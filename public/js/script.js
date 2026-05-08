// public/js/script.js

// ==============================
// CART MANAGEMENT
// ==============================

let cart = JSON.parse(localStorage.getItem('cart')) || [];

// ==============================
// FORMAT CURRENCY
// ==============================

function formatCurrency(amount) {
    return 'M' + Number(amount).toFixed(2);
}

// ==============================
// SAVE CART
// ==============================

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

// ==============================
// UPDATE CART COUNT
// ==============================

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);

    const el = document.getElementById('cart-count');

    if (el) {
        el.innerText = count;
    }
}

function updateCartCountDisplay() {
    updateCartCount();
}

function attachCartButtons() {
    updateCartCount();
}

// ==============================
// ADD TO CART
// ==============================

function addToCart(id, name, price, stock) {

    if (stock <= 0) {
        alert('Product out of stock');
        return;
    }

    let existingItem = cart.find(item => item.productId === id);

    if (existingItem) {

        if (existingItem.quantity >= stock) {
            alert('Maximum stock reached');
            return;
        }

        existingItem.quantity += 1;

    } else {

        cart.push({
            productId: id,
            name,
            price,
            quantity: 1
        });

    }

    saveCart();

    alert(name + ' added to cart');
}

// ==============================
// CHANGE QUANTITY
// ==============================

function changeQty(index, amount) {

    cart[index].quantity += amount;

    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }

    saveCart();

    renderCart();
}

// ==============================
// REMOVE ITEM
// ==============================

function removeItem(index) {

    if (!confirm(`Remove ${cart[index].name} from your cart?`)) {
        return;
    }

    cart.splice(index, 1);

    saveCart();

    renderCart();
}

// ==============================
// CLEAR CART
// ==============================

function clearCart() {

    if (cart.length === 0) {
        alert('Your cart is already empty.');
        return;
    }

    if (!confirm('Clear all items from your cart?')) {
        return;
    }

    cart = [];

    saveCart();

    renderCart();
}

// ==============================
// RENDER PRODUCT GRID
// ==============================

function renderProductGrid(products) {

    if (!products || products.length === 0) {
        return '<p>No products available.</p>';
    }

    return products.map(product => `

        <div class="card">

            <img 
                src="${product.imageUrl || '/images/default-product.jpg'}" 
                alt="${product.name}"
                class="product-image"
            >

            <h3>${product.name}</h3>

            <p class="price">
                ${formatCurrency(product.price)}
            </p>

            <p>
                Stock: ${product.stock}
            </p>

            <button 
                onclick="addToCart(
                    '${product._id}',
                    '${product.name}',
                    ${product.price},
                    ${product.stock}
                )"
            >
                Add to Cart
            </button>

        </div>

    `).join('');
}

// ==============================
// LOAD PRODUCTS
// ==============================

async function loadProducts() {

    try {

        const response = await fetch('https://milco-backend.onrender.com/api/products');

        const products = await response.json();

        const container = document.getElementById('all-products');

        if (container) {

            container.innerHTML = renderProductGrid(products);

        }

    } catch (err) {

        console.error(err);

    }
}

// ==============================
// RENDER CART
// ==============================

function renderCart() {

    const container = document.getElementById('cart-items');

    if (!container) return;

    let total = 0;

    container.innerHTML = '';

    if (cart.length === 0) {

        container.innerHTML = '<p>Your cart is empty.</p>';

        const totalEl = document.getElementById('total');

        if (totalEl) {
            totalEl.innerText = formatCurrency(0);
        }

        const checkoutLink = document.getElementById('checkout-link');

        if (checkoutLink) {
            checkoutLink.classList.add('disabled-link');
            checkoutLink.setAttribute('aria-disabled', 'true');
            checkoutLink.addEventListener('click', stopEmptyCheckout);
        }

        return;
    }

    const checkoutLink = document.getElementById('checkout-link');

    if (checkoutLink) {
        checkoutLink.classList.remove('disabled-link');
        checkoutLink.removeAttribute('aria-disabled');
        checkoutLink.removeEventListener('click', stopEmptyCheckout);
    }

    cart.forEach((item, index) => {

        const itemTotal = item.price * item.quantity;

        total += itemTotal;

        container.innerHTML += `

            <div class="cart-item">

                <h3>${item.name}</h3>

                <p>
                    Price: ${formatCurrency(item.price)}
                </p>

                <div class="qty-controls">

                    <button onclick="changeQty(${index}, -1)">
                        -
                    </button>

                    <span>${item.quantity}</span>

                    <button onclick="changeQty(${index}, 1)">
                        +
                    </button>

                </div>

                <p>
                    Total: ${formatCurrency(itemTotal)}
                </p>

                <button onclick="removeItem(${index})">
                    Remove
                </button>

            </div>

        `;
    });

    const totalEl = document.getElementById('total');

    if (totalEl) {

        totalEl.innerText = formatCurrency(total);

    }
}

function stopEmptyCheckout(event) {
    event.preventDefault();
    alert('Your cart is empty. Add products before checking out.');
}

function confirmCheckoutNavigation() {
    if (cart.length === 0) {
        alert('Your cart is empty. Add products before checking out.');
        return false;
    }

    return confirm('Proceed to checkout with the items in your cart?');
}

// ==============================
// CHECKOUT
// ==============================

async function checkout(customerName, customerEmail, customerPhone, customerLocation, paymentMethod) {

    if (cart.length === 0) {

        alert('Cart is empty');

        return false;
    }

    if (!confirm(`Place this order using ${paymentMethod}?`)) {
        return false;
    }

    try {

        const checkoutItems = cart.map(item => ({
            productId: item.productId || item.id || item._id,
            name: item.name,
            price: Number(item.price),
            quantity: Number(item.quantity)
        }));

        if (checkoutItems.some(item => !item.productId || item.quantity <= 0)) {
            alert('One or more cart items are invalid. Please remove them and add them again.');
            return false;
        }

        const response = await fetch('https://milco-backend.onrender.com/api/checkout', {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({

                customer: {
                    name: customerName,
                    email: customerEmail,
                    phone: customerPhone,
                    location: customerLocation
                },

                paymentMethod,

                items: checkoutItems

            })

        });

        const data = await response.json().catch(() => ({
            success: false,
            message: 'Checkout server returned an invalid response'
        }));

        if (data.success) {

            alert('Order placed successfully!');

            cart = [];

            saveCart();

            renderCart();

            return true;

        } else {

            alert(data.message || 'Checkout failed');

            return false;
        }

    } catch (err) {

        console.error(err);

        alert('Checkout failed');

        return false;
    }
}

// ==============================
// LOAD RECOMMENDATIONS
// ==============================

async function loadRecommendations(email) {

    try {

        const response = await fetch('https://milco-backend.onrender.com/api/recommendations', {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({ email })

        });

        const products = await response.json();

        const container = document.getElementById('recommendations');

        if (!container) return;

        container.innerHTML = `
            <h3>You may also like</h3>
            <div class="products"></div>
        `;

        const productsDiv = container.querySelector('.products');

        products.forEach(product => {

            productsDiv.innerHTML += `

                <div class="card">

                    <img 
                        src="${product.imageUrl || '/images/default-product.jpg'}"
                        alt="${product.name}"
                    >

                    <h4>${product.name}</h4>

                    <p>
                        ${formatCurrency(product.price)}
                    </p>

                    <button
                        onclick="addToCart(
                            '${product._id}',
                            '${product.name}',
                            ${product.price},
                            ${product.stock}
                        )"
                    >
                        Add to Cart
                    </button>

                </div>

            `;
        });

    } catch (err) {

        console.error(err);

    }
}

// ==============================
// SUBSCRIBE FORM
// ==============================

document.addEventListener('DOMContentLoaded', () => {

    updateCartCount();

    // ==========================
    // LOAD PRODUCTS PAGE
    // ==========================

    if (window.location.pathname.includes('/products')) {

        loadProducts();

    }

    // ==========================
    // LOAD NEW PRODUCTS PAGE
    // ==========================

    if (window.location.pathname.includes('/newproducts')) {

        fetch('https://milco-backend.onrender.com/api/new-products')

            .then(res => res.json())

            .then(products => {

                const container = document.getElementById('new-products');

                if (!container) return;

                container.innerHTML = renderProductGrid(products);

            })

            .catch(err => console.error(err));
    }

    // ==========================
    // RENDER CART
    // ==========================

    if (document.getElementById('cart-items')) {

        renderCart();

    }

    // ==========================
    // RECOMMENDATIONS
    // ==========================

    const emailInput = document.getElementById('customerEmail');

    if (emailInput) {

        emailInput.addEventListener('blur', () => {

            if (emailInput.value.trim() !== '') {

                loadRecommendations(emailInput.value);

            }

        });
    }

    // ==========================
    // SUBSCRIBE FORM
    // ==========================

    const subForm = document.getElementById('subscribeForm');

    if (subForm) {

        subForm.addEventListener('submit', async (e) => {

            e.preventDefault();

            const name = document.getElementById('subName').value;

            const email = document.getElementById('subEmail').value;

            try {

                const response = await fetch('https://milco-backend.onrender.com/api/subscribe', {

                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify({
                        name,
                        email
                    })

                });

                const data = await response.json();

                alert(data.message);

                subForm.reset();

            } catch (err) {

                console.error(err);

                alert('Subscription failed');

            }

        });
    }
});
