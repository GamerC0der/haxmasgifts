const form = document.getElementById("giftForm")
const giftsContainer = document.getElementById("gifts");

const socket = io();

async function loadGifts() {
    const response = await fetch('/gifts');
    const gifts = await response.json();

    giftsContainer.innerHTML = '';
    gifts.forEach(gift => {
        const item = document.createElement("div");
        item.className = "gift-item";

        const text = document.createElement("span");
        text.textContent = `Gift for ${gift.name}: ${gift.gift}`;
        item.appendChild(text);

        const select = document.createElement("select");
        select.className = "fulfilled-select";
        select.dataset.giftId = gift.id;

        const optionNotFulfilled = document.createElement("option");
        optionNotFulfilled.value = "false";
        optionNotFulfilled.textContent = "Not fulfilled";
        select.appendChild(optionNotFulfilled);

        const optionFulfilled = document.createElement("option");
        optionFulfilled.value = "true";
        optionFulfilled.textContent = "Fulfilled";
        select.appendChild(optionFulfilled);

        select.value = (gift.fulfilled || false).toString();
        select.addEventListener("change", (event) => {
            const giftId = parseInt(event.target.dataset.giftId);
            const fulfilled = event.target.value === "true";

            socket.emit('update_gift', { id: giftId, fulfilled });
        });

        item.appendChild(select);
        giftsContainer.appendChild(item);
    });
}

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = form.elements.name.value;
    const gift = form.elements.gift.value;

    socket.emit('create_gift', { name, gift });

    form.reset();
});

socket.on('gift_created', (newGift) => {
    const item = document.createElement("div");
    item.className = "gift-item";

    const text = document.createElement("span");
    text.textContent = `Gift for ${newGift.name}: ${newGift.gift}`;
    item.appendChild(text);

    const select = document.createElement("select");
    select.className = "fulfilled-select";
    select.dataset.giftId = newGift.id;

    const optionNotFulfilled = document.createElement("option");
    optionNotFulfilled.value = "false";
    optionNotFulfilled.textContent = "Not fulfilled";
    select.appendChild(optionNotFulfilled);

    const optionFulfilled = document.createElement("option");
    optionFulfilled.value = "true";
    optionFulfilled.textContent = "Fulfilled";
    select.appendChild(optionFulfilled);

    select.value = (newGift.fulfilled || false).toString();
    select.addEventListener("change", (event) => {
        const giftId = parseInt(event.target.dataset.giftId);
        const fulfilled = event.target.value === "true";
        socket.emit('update_gift', { id: giftId, fulfilled });
    });

    item.appendChild(select);
    giftsContainer.appendChild(item);
});

socket.on('gift_updated', (updatedGift) => {
    const select = document.querySelector(`[data-gift-id="${updatedGift.id}"]`);
    if (select) {
        select.value = updatedGift.fulfilled.toString();
    }
});

socket.on('error', (data) => {
    alert(data.message);
});

loadGifts();