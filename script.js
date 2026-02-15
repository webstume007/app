// ==========================================
// 🔐 PASTE THE LINE FROM PYTHON HERE
// ==========================================
const ENCRYPTED_TOKEN = "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"; 

const REPO_OWNER = "webstume007"; 
const REPO_NAME = "app"; 
const TARGET_FILENAME = "schedule.pdf"; 

// ==========================================
// 🔓 DECRYPTION & UPLOAD LOGIC
// ==========================================
async function handleUpload() {
    alert("1. Function Started! The button works."); // DEBUG 1

    const password = document.getElementById('admin-pass').value;
    const fileInput = document.getElementById('hidden-file-input');

    if (!password) { alert("⚠️ Stop: No password entered."); return; }
    if (fileInput.files.length === 0) { alert("⚠️ Stop: No file selected."); return; }

    const file = fileInput.files[0];
    alert(`2. File selected: ${file.name}`); // DEBUG 2

    // 1. Decrypt
    let token = "";
    try {
        let hex = ENCRYPTED_TOKEN;
        let str = "";
        for (let i = 0; i < hex.length; i += 2) {
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        for (let i = 0; i < str.length; i++) {
            let key_char = password[i % password.length];
            token += String.fromCharCode(str.charCodeAt(i) ^ key_char.charCodeAt(0));
        }
        alert("3. Token Decrypted (Hidden)"); // DEBUG 3
    } catch(e) {
        alert("❌ Error Decrypting: " + e.message);
        return;
    }

    // 2. Upload
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = async function() {
        const base64Content = reader.result.split(',')[1];
        alert("4. Connecting to GitHub..."); // DEBUG 4

        const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${TARGET_FILENAME}`;
        
        try {
            // GET SHA
            let sha = null;
            const getRes = await fetch(apiUrl, {
                method: 'GET',
                headers: { 'Authorization': `token ${token}` }
            });

            if (getRes.status === 401) {
                alert("❌ 401 Unauthorized: WRONG PASSWORD"); // DEBUG 5
                return;
            }
            
            if (getRes.ok) {
                const getData = await getRes.json();
                sha = getData.sha;
            }

            // PUT FILE
            const body = {
                message: `Update schedule: ${file.name}`,
                content: base64Content
            };
            if (sha) body.sha = sha; 

            const putRes = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (putRes.ok) {
                alert("✅ SUCCESS! The file is uploaded.");
                location.reload(); 
            } else {
                const errText = await putRes.text();
                alert("❌ Upload Failed: " + errText);
            }
        } catch (error) {
            alert("❌ Network Error: " + error.message);
        }
    };
}
// ==========================================
// 📅 STANDARD APP LOGIC (Do not change)
// ==========================================
let rawData = [];
let currentTab = 'teacher';
const timeSlots = generateTimeSlots();

window.onload = function() {
    fetch('schedule_data.json')
        .then(res => res.json())
        .then(data => {
            rawData = data;
            populateMainDropdown();
            populateTimeDropdowns();
        })
        .catch(err => console.error("Error loading data:", err));
};

function generateTimeSlots() {
    let slots = [];
    let start = 8 * 60; let end = 18 * 60;
    while (start < end) {
        let h = Math.floor(start / 60); let m = start % 60;
        let amp = h >= 12 ? 'PM' : 'AM'; let dh = h > 12 ? h - 12 : h;
        slots.push(`${dh}:${m === 0 ? '00' : m} ${amp}`); start += 30;
    }
    return slots;
}
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    const std = document.getElementById('standard-controls');
    const free = document.getElementById('free-controls');
    if (tab === 'free') { std.classList.add('hidden'); free.classList.remove('hidden'); document.getElementById('schedule-table').innerHTML = ""; } 
    else { std.classList.remove('hidden'); free.classList.add('hidden'); populateMainDropdown(); renderSchedule(); }
}
function populateMainDropdown() {
    const dropdown = document.getElementById('main-dropdown');
    dropdown.innerHTML = '<option value="">-- Select --</option>';
    let items = [];
    if (currentTab === 'teacher') items = [...new Set(rawData.map(d => d.teacher))];
    if (currentTab === 'room') items = [...new Set(rawData.map(d => d.room))];
    items.sort().forEach(i => { if(i) { let o = document.createElement('option'); o.value = i; o.innerText = i; dropdown.appendChild(o); }});
}
function toggleDayCheckboxes() {
    const mode = document.querySelector('input[name="day-mode"]:checked').value;
    const box = document.getElementById('day-checkboxes');
    if (mode === 'specific') box.classList.remove('hidden'); else box.classList.add('hidden');
    renderSchedule();
}
function renderSchedule() {
    const selected = document.getElementById('main-dropdown').value;
    if (!selected) return;
    const table = document.getElementById('schedule-table');
    table.innerHTML = "";
    document.getElementById('table-title').innerText = `${currentTab.toUpperCase()}: ${selected}`;
    let activeDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
    if (document.querySelector('input[name="day-mode"]:checked').value === 'specific') {
        activeDays = Array.from(document.querySelectorAll('#day-checkboxes input:checked')).map(cb => cb.value);
    }
    let header = `<tr><th>Time</th>` + activeDays.map(d => `<th>${d}</th>`).join('') + `</tr>`;
    table.innerHTML += header;
    const relevant = rawData.filter(d => d[currentTab] === selected);
    timeSlots.forEach(slot => {
        let row = `<tr><td class="time-col">${slot}</td>`;
        let sVal = parseTime(slot);
        activeDays.forEach(day => {
            let matches = relevant.filter(c => c.day.toUpperCase() === day && sVal >= parseTime(c.start) && sVal < parseTime(c.end));
            if (matches.length > 0) {
                let cell = matches.map(m => `<div class="class-card"><div class="cc-name">${m.course}</div><div class="cc-meta">${currentTab==='teacher'?m.room:m.teacher}</div><div class="cc-meta" style="color:blue">${m.section}</div></div>`).join('');
                row += `<td>${cell}</td>`;
            } else row += `<td><div class="slot-free">FREE</div></td>`;
        });
        table.innerHTML += row + `</tr>`;
    });
}
function populateTimeDropdowns() {
    const s = document.getElementById('free-start'); const e = document.getElementById('free-end');
    timeSlots.forEach(t => { s.appendChild(new Option(t, t)); e.appendChild(new Option(t, t)); });
}
function findFreeRooms() {
    const day = document.getElementById('free-day').value;
    const sStr = document.getElementById('free-start').value;
    const eStr = document.getElementById('free-end').value;
    const uStart = parseTime(sStr); const uEnd = parseTime(eStr);
    if (uStart >= uEnd) { alert("Invalid Time Range"); return; }
    const table = document.getElementById('schedule-table');
    table.innerHTML = `<tr><th colspan="2" style="background:#002147;color:gold">Available Rooms (${sStr}-${eStr})</th></tr>`;
    const rooms = [...new Set(rawData.map(d => d.room))];
    let exact = [], partial = [];
    rooms.forEach(r => {
        const busy = rawData.filter(d => d.room === r && d.day.toUpperCase() === day);
        let free = true, busyMins = 0;
        busy.forEach(b => {
            let oS = Math.max(uStart, parseTime(b.start));
            let oE = Math.min(uEnd, parseTime(b.end));
            if (oS < oE) { free = false; busyMins += (oE - oS); }
        });
        if (free) exact.push(r); else if ((uEnd-uStart)-busyMins >= 30) partial.push({r, m: (uEnd-uStart)-busyMins});
    });
    let h = `<tr><td colspan="2" style="background:#d4edda;font-weight:bold">✅ Exact Matches</td></tr>`;
    exact.forEach(r => h += `<tr><td class="res-exact">${r}</td></tr>`);
    h += `<tr><td colspan="2" style="background:#fff3cd;font-weight:bold">⚠️ Partial Matches</td></tr>`;
    partial.forEach(p => h += `<tr><td class="res-partial"><b>${p.r}</b> (${p.m} mins)</td></tr>`);
    table.innerHTML = h;
}
function parseTime(t) { if(!t)return 0; let [tm, ap] = t.split(' '); let [h, m] = tm.split(':').map(Number); if(h===12)h=0; if(ap==='PM')h+=12; return h*60+m; }
