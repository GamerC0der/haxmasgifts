const form = document.getElementById("giftForm")
const giftsContainer = document.getElementById("gifts");
const timeTracker = document.getElementById("timeTracker");

const socket = io();

function updateTimeTracker() {
    const startDate = new Date('2025-12-17T21:35:00.000Z');
    const now = new Date();
    const diffMs = now - startDate;

    if (diffMs < 0) {
        timeTracker.textContent = "Tracking gifts since 2025";
        return;
    }

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30.44);
    const diffYears = Math.floor(diffDays / 365.25);

    let timeText = "Tracking gifts since ";
    if (diffYears > 0) {
        timeText += `${diffYears} year${diffYears > 1 ? 's' : ''}, `;
        timeText += `${diffMonths % 12} month${(diffMonths % 12) > 1 ? 's' : ''}, `;
        timeText += `${diffDays % 30} day${(diffDays % 30) > 1 ? 's' : ''}`;
    } else if (diffMonths > 0) {
        timeText += `${diffMonths} month${diffMonths > 1 ? 's' : ''}, `;
        timeText += `${diffDays % 30} day${(diffDays % 30) > 1 ? 's' : ''}`;
    } else if (diffDays > 0) {
        timeText += `${diffDays} day${diffDays > 1 ? 's' : ''}, `;
        timeText += `${diffHours % 24} hour${(diffHours % 24) > 1 ? 's' : ''}, `;
        timeText += `${diffMinutes % 60} minute${(diffMinutes % 60) > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
        timeText += `${diffHours} hour${diffHours > 1 ? 's' : ''}, `;
        timeText += `${diffMinutes % 60} minute${(diffMinutes % 60) > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
        timeText += `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}, `;
        timeText += `${diffSeconds % 60} second${(diffSeconds % 60) > 1 ? 's' : ''}`;
    } else {
        timeText += `${diffSeconds} second${diffSeconds > 1 ? 's' : ''}`;
    }

    timeTracker.textContent = timeText + " ago";
}

setInterval(updateTimeTracker, 1000);
updateTimeTracker();

// Rest of your code remains exactly the same...
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
