let rawData = [];
let currentTab = 'teacher';
const timeSlots = generateTimeSlots();

// 1. Generate 30-min time slots (8:00 AM - 6:00 PM)
function generateTimeSlots() {
    let slots = [];
    let start = 8 * 60; 
    let end = 18 * 60;
    while (start < end) {
        let h = Math.floor(start / 60);
        let m = start % 60;
        let amp = h >= 12 ? 'PM' : 'AM';
        let dh = h > 12 ? h - 12 : h;
        slots.push(`${dh}:${m === 0 ? '00' : m} ${amp}`);
        start += 30;
    }
    return slots;
}

// 2. Load Data
window.onload = function() {
    // IMPORTANT: Reads the local JSON file
    fetch('schedule_data.json')
        .then(res => res.json())
        .then(data => {
            rawData = data;
            populateMainDropdown();
            populateTimeDropdowns();
        })
        .catch(err => console.error("Error loading data:", err));
};

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const stdControls = document.getElementById('standard-controls');
    const freeControls = document.getElementById('free-controls');
    const label = document.getElementById('dropdown-label');
    
    if (tab === 'free') {
        stdControls.classList.add('hidden');
        freeControls.classList.remove('hidden');
        document.getElementById('schedule-table').innerHTML = ""; 
        document.getElementById('table-title').innerText = "Select Time Slot";
    } else {
        stdControls.classList.remove('hidden');
        freeControls.classList.add('hidden');
        label.innerText = tab === 'teacher' ? "Select Teacher:" : "Select Room:";
        populateMainDropdown();
        renderSchedule();
    }
}

function populateMainDropdown() {
    const dropdown = document.getElementById('main-dropdown');
    dropdown.innerHTML = '<option value="">-- Select --</option>';
    
    let items = [];
    if (currentTab === 'teacher') items = [...new Set(rawData.map(d => d.teacher))];
    if (currentTab === 'room') items = [...new Set(rawData.map(d => d.room))];
    
    items.sort().forEach(item => {
        if(item) {
            let opt = document.createElement('option');
            opt.value = item;
            opt.innerText = item;
            dropdown.appendChild(opt);
        }
    });
}

function toggleDayCheckboxes() {
    const mode = document.querySelector('input[name="day-mode"]:checked').value;
    const box = document.getElementById('day-checkboxes');
    if (mode === 'specific') box.classList.remove('hidden');
    else box.classList.add('hidden');
    renderSchedule();
}

// 3. RENDER GRID LOGIC
function renderSchedule() {
    const selected = document.getElementById('main-dropdown').value;
    if (!selected) return;

    const table = document.getElementById('schedule-table');
    table.innerHTML = "";
    document.getElementById('table-title').innerText = `${currentTab.toUpperCase()}: ${selected}`;

    let activeDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const mode = document.querySelector('input[name="day-mode"]:checked').value;
    if (mode === 'specific') {
        activeDays = Array.from(document.querySelectorAll('#day-checkboxes input:checked')).map(cb => cb.value);
    }

    // Header
    let headerRow = `<tr><th style="width:100px">Time</th>`;
    activeDays.forEach(day => headerRow += `<th>${day}</th>`);
    headerRow += `</tr>`;
    table.innerHTML += headerRow;

    const relevantData = rawData.filter(d => d[currentTab] === selected);

    // Rows
    timeSlots.forEach(slot => {
        let rowHtml = `<tr><td class="time-col">${slot}</td>`;
        let slotVal = parseTime(slot);

        activeDays.forEach(day => {
            let cellContent = "";
            let matches = relevantData.filter(c => {
                if (c.day.toUpperCase() !== day) return false;
                let start = parseTime(c.start);
                let end = parseTime(c.end);
                return slotVal >= start && slotVal < end;
            });

            if (matches.length > 0) {
                matches.forEach(match => {
                    let info = currentTab === 'teacher' 
                        ? `<div class="cc-name">${match.course}</div><div class="cc-meta">Room: ${match.room}</div><div class="cc-meta" style="color:blue">${match.section}</div>`
                        : `<div class="cc-name">${match.course}</div><div class="cc-meta">👨‍🏫 ${match.teacher}</div><div class="cc-meta" style="color:blue">${match.section}</div>`;
                    cellContent += `<div class="class-card">${info}</div>`;
                });
                rowHtml += `<td>${cellContent}</td>`;
            } else {
                rowHtml += `<td><div class="slot-free">FREE</div></td>`;
            }
        });
        rowHtml += `</tr>`;
        table.innerHTML += rowHtml;
    });
}

// 4. FREE ROOM LOGIC
function populateTimeDropdowns() {
    const startDrop = document.getElementById('free-start');
    const endDrop = document.getElementById('free-end');
    timeSlots.forEach(t => {
        let opt1 = document.createElement('option'); opt1.value = t; opt1.innerText = t;
        let opt2 = document.createElement('option'); opt2.value = t; opt2.innerText = t;
        startDrop.appendChild(opt1);
        endDrop.appendChild(opt2);
    });
}

function findFreeRooms() {
    const day = document.getElementById('free-day').value;
    const startStr = document.getElementById('free-start').value;
    const endStr = document.getElementById('free-end').value;
    const userStart = parseTime(startStr);
    const userEnd = parseTime(endStr);

    if (userStart >= userEnd) { alert("Start time must be before End time"); return; }

    const table = document.getElementById('schedule-table');
    table.innerHTML = "";
    document.getElementById('table-title').innerText = `Available Rooms (${startStr} - ${endStr})`;

    const allRooms = [...new Set(rawData.map(d => d.room))];
    let exactMatches = [];
    let partialMatches = [];

    allRooms.forEach(room => {
        const classes = rawData.filter(d => d.room === room && d.day.toUpperCase() === day);
        let isFullyFree = true;
        let busyMinutes = 0;
        let duration = userEnd - userStart;

        classes.forEach(c => {
            let cStart = parseTime(c.start);
            let cEnd = parseTime(c.end);
            let overlapStart = Math.max(userStart, cStart);
            let overlapEnd = Math.min(userEnd, cEnd);
            
            if (overlapStart < overlapEnd) {
                isFullyFree = false;
                busyMinutes += (overlapEnd - overlapStart);
            }
        });

        if (isFullyFree) {
            exactMatches.push(room);
        } else if ((duration - busyMinutes) >= 30) {
            partialMatches.push({room: room, freeMins: duration - busyMinutes});
        }
    });

    // Render Results
    let html = `<tr><th colspan="2" style="background:green">✅ Fully Available Rooms</th></tr>`;
    if(exactMatches.length === 0) html += `<tr><td colspan="2">No rooms free for the full duration.</td></tr>`;
    else exactMatches.forEach(r => html += `<tr><td class="res-exact">${r}</td></tr>`);

    html += `<tr><th colspan="2" style="background:orange; color:black">⚠️ Partially Available (>30 mins)</th></tr>`;
    if(partialMatches.length === 0) html += `<tr><td colspan="2">No partial matches found.</td></tr>`;
    else partialMatches.forEach(m => html += `<tr><td class="res-partial"><b>${m.room}</b> (Free for ${m.freeMins} mins)</td></tr>`);

    table.innerHTML = html;
}

function parseTime(tStr) {
    if(!tStr) return 0;
    let [time, mod] = tStr.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (h === 12) h = 0;
    if (mod === 'PM') h += 12;
    return h * 60 + m;
}
