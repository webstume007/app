let rawData = [];
let currentTab = 'teacher';
const timeSlots = generateTimeSlots();

// 1. Generate 30-min intervals
function generateTimeSlots() {
    let slots = [];
    let start = 8 * 60; // 8:00 AM
    let end = 18 * 60;  // 6:00 PM
    while (start < end) {
        let h = Math.floor(start / 60);
        let m = start % 60;
        let amp = h >= 12 ? 'PM' : 'AM';
        let dh = h > 12 ? h - 12 : h;
        let timeStr = `${dh}:${m === 0 ? '00' : m} ${amp}`;
        slots.push(timeStr);
        start += 30;
    }
    return slots;
}

// 2. Initialize
window.onload = function() {
    fetchData();
    populateTimeDropdowns();
};

function fetchData() {
    fetch('/api/data')
        .then(res => res.json())
        .then(data => {
            rawData = data;
            populateMainDropdown();
        });
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Toggle Views
    const stdControls = document.getElementById('standard-controls');
    const freeControls = document.getElementById('free-controls');
    
    if (tab === 'free') {
        stdControls.classList.add('hidden');
        freeControls.classList.remove('hidden');
        document.getElementById('schedule-table').innerHTML = ""; 
    } else {
        stdControls.classList.remove('hidden');
        freeControls.classList.add('hidden');
        populateMainDropdown();
        renderSchedule();
    }
}

function populateMainDropdown() {
    const dropdown = document.getElementById('main-dropdown');
    dropdown.innerHTML = '<option value="">-- Select --</option>';
    
    // Extract Unique Items
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

// 3. RENDER LOGIC (GRID)
function renderSchedule() {
    const selected = document.getElementById('main-dropdown').value;
    if (!selected) return;

    const table = document.getElementById('schedule-table');
    table.innerHTML = "";
    document.getElementById('table-title').innerText = `${currentTab.toUpperCase()}: ${selected}`;

    // Get Active Days
    let activeDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const mode = document.querySelector('input[name="day-mode"]:checked').value;
    if (mode === 'specific') {
        activeDays = Array.from(document.querySelectorAll('#day-checkboxes input:checked')).map(cb => cb.value);
    }

    // Build Header
    let headerRow = `<tr style="background:#002147; color:white;"><th>Time</th>`;
    activeDays.forEach(day => headerRow += `<th>${day}</th>`);
    headerRow += `</tr>`;
    table.innerHTML += headerRow;

    // Filter Data
    const relevantData = rawData.filter(d => d[currentTab] === selected);

    // Build Rows
    timeSlots.forEach(slot => {
        let rowHtml = `<tr><td style="background:#eee; font-weight:bold;">${slot}</td>`;
        let slotVal = parseTime(slot);

        activeDays.forEach(day => {
            // Find class in this slot
            let match = relevantData.find(c => {
                if (c.day.toUpperCase() !== day) return false;
                let start = parseTime(c.start_time);
                let end = parseTime(c.end_time);
                return slotVal >= start && slotVal < end;
            });

            if (match) {
                // Determine info to show
                let info = currentTab === 'teacher' 
                    ? `<div style="font-weight:bold">${match.course_name}</div><div style="font-size:0.8em">${match.room}</div><div style="font-size:0.8em; color:blue;">${match.section_name}</div>`
                    : `<div style="font-weight:bold">${match.course_name}</div><div style="font-size:0.8em">👨‍🏫 ${match.teacher}</div><div style="font-size:0.8em; color:blue;">${match.section_name}</div>`;
                
                rowHtml += `<td style="background:#e3f2fd; border:1px solid #ccc;">${info}</td>`;
            } else {
                rowHtml += `<td style="color:green; font-weight:bold;">FREE</td>`;
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
    document.getElementById('table-title').innerText = `Available Rooms on ${day} (${startStr} - ${endStr})`;

    const allRooms = [...new Set(rawData.map(d => d.room))];
    let exactMatches = [];
    let partialMatches = [];

    allRooms.forEach(room => {
        // Get classes for this room on this day
        const classes = rawData.filter(d => d.room === room && d.day.toUpperCase() === day);
        
        // Check overlaps
        let isFullyFree = true;
        let busyMinutes = 0;
        let duration = userEnd - userStart;

        classes.forEach(c => {
            let cStart = parseTime(c.start_time);
            let cEnd = parseTime(c.end_time);
            
            // Intersection Logic
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
            // If room is free for at least 30 mins total in that slot
            partialMatches.push({room: room, freeMins: duration - busyMinutes});
        }
    });

    // Render Results
    let html = `<tr><th colspan="2" style="background:green; color:white;">✅ Exact Matches (Full Time)</th></tr>`;
    if(exactMatches.length === 0) html += `<tr><td colspan="2">No rooms free for the full duration.</td></tr>`;
    else exactMatches.forEach(r => html += `<tr><td class="free-exact" style="font-weight:bold; font-size:1.2em;">${r}</td></tr>`);

    html += `<tr><th colspan="2" style="background:orange; color:black;">⚠️ Partial Matches (Free for >30 mins)</th></tr>`;
    if(partialMatches.length === 0) html += `<tr><td colspan="2">No partial matches found.</td></tr>`;
    else partialMatches.forEach(m => html += `<tr><td class="free-partial"><b>${m.room}</b> (Free for ${m.freeMins} mins)</td></tr>`);

    table.innerHTML = html;
}

// Helper: Parse "8:00 AM" to minutes
function parseTime(tStr) {
    if(!tStr) return 0;
    let [time, mod] = tStr.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (h === 12) h = 0;
    if (mod === 'PM') h += 12;
    return h * 60 + m;
}

// ADMIN FUNCTIONS
function toggleAdminModal() { document.getElementById('admin-modal').classList.toggle('hidden'); }
function adminLogin() {
    const u = document.getElementById('admin-user').value;
    const p = document.getElementById('admin-pass').value;
    fetch('/api/admin/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: u, password: p})
    }).then(res => res.json()).then(d => {
        if(d.success) document.getElementById('upload-section').classList.remove('hidden');
        else alert('Wrong credentials');
    });
}
function uploadPDF() {
    const file = document.getElementById('pdf-upload').files[0];
    const fd = new FormData();
    fd.append('file', file);
    document.getElementById('upload-status').innerText = "Uploading & Processing...";
    
    fetch('/api/admin/upload', {method: 'POST', body: fd})
        .then(res => res.json())
        .then(d => {
            if(d.success) alert(`Updated! ${d.count} classes added.`);
            else alert("Error: " + d.error);
            location.reload();
        });
}
