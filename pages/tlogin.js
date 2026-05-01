import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

export default function TeacherLoginAndDashboard() {
    // --- AUTH STATES ---
    const [session, setSession] = useState(null);
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // --- SIGNUP SPECIFIC STATES ---
    const [signupName, setSignupName] = useState('');
    const [cnic, setCnic] = useState('');
    const [phone, setPhone] = useState('');
    const [availableTeacherNames, setAvailableTeacherNames] = useState([]);
    const [authError, setAuthError] = useState('');

    // --- DASHBOARD STATES ---
    const [profile, setProfile] = useState(null);
    const [schedule, setSchedule] = useState([]);
    const [baseSchedule, setBaseSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const alertedClasses = useRef(new Set()); 

    // --- PWA & NOTIFICATION STATES (From index.js) ---
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showNotifBanner, setShowNotifBanner] = useState(false);

    // --- DROPDOWN STATES ---
    const [availableRooms, setAvailableRooms] = useState([]);
    const [availableCourses, setAvailableCourses] = useState([]);
    const [availableSemesters, setAvailableSemesters] = useState([]);
    const [availableSections, setAvailableSections] = useState([]);

    // --- TOGGLE STATES FOR MANUAL ENTRY ---
    const [isManualCourse, setIsManualCourse] = useState(false);
    const [isManualRoom, setIsManualRoom] = useState(false);
    const [isManualSemester, setIsManualSemester] = useState(false);
    const [isManualSection, setIsManualSection] = useState(false);

    const [activeTab, setActiveTab] = useState('weekly');

    // --- MODAL STATES ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [newDate, setNewDate] = useState('');
    const [newStartTime, setNewStartTime] = useState('8:00 AM');
    const [newEndTime, setNewEndTime] = useState('9:30 AM');
    const [newRoom, setNewRoom] = useState('');
    const [isBaseModalOpen, setIsBaseModalOpen] = useState(false);
    const [baseForm, setBaseForm] = useState({ id: null, semester: '', section: '', course: '', room: '', day: 'MON', start_time: '8:00 AM', end_time: '9:30 AM' });

    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const timeSlots = [];
    let ts = 8 * 60; 
    while (ts < 18 * 60) {
        let h = Math.floor(ts / 60), m = ts % 60, amp = h >= 12 ? 'PM' : 'AM', dh = h > 12 ? h - 12 : h;
        if (dh === 0) dh = 12; 
        timeSlots.push(`${dh}:${m === 0 ? '00' : m} ${amp}`); 
        ts += 30;
    }

    const convertTo12Hour = (timeStr) => {
        if (!timeStr) return "";
        if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) return timeStr;
        let [h, m] = timeStr.split(':').map(Number);
        const suffix = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${h}:${m === 0 ? '00' : m < 10 ? '0' + m : m} ${suffix}`;
    };

    const parseTime = (t) => {
        if (!t) return 0;
        let clean = t.replace(/\./g, '').trim().toUpperCase();
        let [tm, ap] = clean.split(' ');
        let [h, m] = tm.split(':').map(Number);
        if (h === 12) h = 0;
        if (ap === 'PM') h += 12;
        return h * 60 + (m || 0);
    };

    // --- 1. INITIAL LOAD & AUTH CHECK ---
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                fetchProfileAndSchedule(session.user.id);
            } else {
                fetchUnclaimedTeachers(); // Fetch dropdown for signup
                setLoading(false);
            }
        });

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchProfileAndSchedule(session.user.id);
            else { setProfile(null); setLoading(false); }
        });

        // PWA & Notification setup
        if ("Notification" in window && Notification.permission === "default") {
            setShowNotifBanner(true);
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        });

        return () => { authListener.subscription.unsubscribe(); };
    }, []);

    // --- FETCH UNCLAIMED TEACHERS FOR SIGNUP ---
    const fetchUnclaimedTeachers = async () => {
        const { data: allLectures } = await supabase.from('base_schedule').select('teacher');
        const { data: claimedProfiles } = await supabase.from('teacher_profiles').select('name');
        
        if (allLectures) {
            const allTeacherNames = [...new Set(allLectures.map(x => x.teacher))].filter(Boolean);
            const claimedNames = claimedProfiles ? claimedProfiles.map(p => p.name) : [];
            
            // Only show teachers who haven't created an account yet
            const unclaimed = allTeacherNames.filter(name => !claimedNames.includes(name));
            setAvailableTeacherNames(unclaimed.sort());
        }
    };

    // --- AUTHENTICATION HANDLERS ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthError('');
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setAuthError(error.message);
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setAuthError('');
        
        if (!signupName) return setAuthError('Please select your name from the dropdown.');
    
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                // These values are sent to 'raw_user_meta_data' for the SQL trigger
                data: { 
                    full_name: signupName,
                    phone: phone,
                    cnic: cnic
                }
            }
        });
    
        if (error) {
            setAuthError(error.message);
        } else {
            alert("Verification email sent! Please check your inbox and click the link to activate your account.");
            setIsLoginMode(true);
        }
    };

    // 3. Insert the Profile
    const { error: profileError } = await supabase
        .from('teacher_profiles')
        .insert([{
            id: data.user.id, // This MUST match auth.users.id
            name: signupName,
            email: email,
            phone: phone,
            cnic: cnic
        }]);

    if (profileError) {
        console.error("Profile Insert Error:", profileError);
        // If profile fails, the user is still in Auth, but we need to tell them
        setAuthError("Auth created, but profile failed: " + profileError.message);
    } else {
        alert("Account created successfully! You can now login.");
        setIsLoginMode(true);
        fetchUnclaimedTeachers(); // Refresh the list
    }
};

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
    };

    // --- DASHBOARD DATA FETCHING ---
    const fetchProfileAndSchedule = async (userId) => {
        const { data: profileData } = await supabase.from('teacher_profiles').select('*').eq('id', userId).single();
        setProfile(profileData);

        if (profileData) {
            const { data: scheduleData } = await supabase.from('base_schedule').select('*').eq('teacher', profileData.name);
            setBaseSchedule(scheduleData || []);
            
            const { data: allData } = await supabase.from('base_schedule').select('room, course, semester, section');
            if (allData) {
                setAvailableRooms([...new Set(allData.map(x => x.room))].filter(Boolean).sort());
                setAvailableCourses([...new Set(allData.map(x => x.course))].filter(Boolean).sort());
                setAvailableSemesters([...new Set(allData.map(x => x.semester))].filter(Boolean).sort());
                setAvailableSections([...new Set(allData.map(x => x.section))].filter(Boolean).sort());
            }

            const today = new Date().toLocaleDateString('en-CA');
            const { data: exceptionsData } = await supabase.from('schedule_exceptions').select('*').eq('exception_date', today);

            const mergedSchedule = (scheduleData || []).map(cls => {
                const exception = (exceptionsData || []).find(ex => ex.base_schedule_id === cls.id);
                return { 
                    ...cls, 
                    isCancelled: exception?.status === 'cancelled',
                    isRescheduled: exception?.status === 'rescheduled',
                    isConfirmed: exception?.status === 'confirmed',
                    exceptionDetails: exception
                };
            });

            setSchedule(mergedSchedule);
        }
        setLoading(false);
    };

    // --- 3-HOUR REMINDER INTERVAL ---
    useEffect(() => {
        if (!session || schedule.length === 0) return;

        const interval = setInterval(() => {
            const now = new Date();
            const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            const currentMins = now.getHours() * 60 + now.getMinutes();

            schedule.forEach(cls => {
                if (cls.day === currentDay) {
                    const startMins = parseTime(cls.start_time);
                    const diff = startMins - currentMins;

                    if (diff <= 180 && diff > 178 && !cls.isConfirmed && !cls.isCancelled && !cls.isRescheduled) {
                        if (!alertedClasses.current.has(cls.id)) {
                            alertedClasses.current.add(cls.id);
                            if (Notification.permission === "granted") {
                                new Notification("Lecture Action Required", { 
                                    body: `${cls.course} for Sec ${cls.section} starts in 3 hours. Please Confirm or Cancel.`, 
                                    icon: "/icon.png" 
                                });
                            }
                            supabase.from('notifications').insert([{ 
                                message: `⚠️ Teacher Reminder: ${cls.course} (Sec ${cls.section}) is pending confirmation.` 
                            }]).then();
                        }
                    }
                }
            });
        }, 60000); 

        return () => clearInterval(interval);
    }, [schedule, session]);

    // --- REALTIME LISTENER ---
    useEffect(() => {
        if (!profile || schedule.length === 0) return;

        const channel = supabase
            .channel('teacher-updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
                const newMsg = payload.new.message;
                const isRelevant = schedule.some(cls => newMsg.includes(cls.course) && newMsg.includes(cls.section));
                
                if (isRelevant && Notification.permission === "granted") {
                    new Notification("IUB Schedule Alert", { body: newMsg, icon: "/icon.png" });
                }
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [profile, schedule]);

    // --- PWA PERMISSION ACTIONS ---
    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setDeferredPrompt(null);
        }
    };

    const forceNotificationPermission = async () => {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            setShowNotifBanner(false);
            new Notification("Notifications Enabled!", { body: "You will now receive IUB alerts." });
        }
    };

    // --- LECTURE ACTIONS ---
    const handleConfirmClass = async (classId, courseName, section) => {
        setSchedule(prev => prev.map(c => c.id === classId ? { ...c, isConfirmed: true, isCancelled: false } : c));
        const today = new Date().toLocaleDateString('en-CA');
        const { error } = await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: classId, exception_date: today, status: 'confirmed', cancelled_by: session.user.id
        }]);

        if (!error) {
            await supabase.from('notifications').insert([{ message: `✅ Confirmed: ${courseName} for Section ${section} will be held as scheduled today.` }]);
        }
        fetchProfileAndSchedule(session.user.id); 
    };

    const handleCancelClass = async (classId, courseName, section) => {
        const confirmCancel = window.confirm(`Are you sure you want to CANCEL ${courseName}?`);
        if (!confirmCancel) return;

        setSchedule(prev => prev.map(c => c.id === classId ? { ...c, isCancelled: true, isConfirmed: false } : c));
        const today = new Date().toLocaleDateString('en-CA');
        const { error } = await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: classId, exception_date: today, status: 'cancelled', cancelled_by: session.user.id
        }]);

        if (!error) {
            await supabase.from('notifications').insert([{ message: `🚨 Cancelled: ${courseName} for Section ${section} has been cancelled by ${profile.name}.` }]);
        }
        fetchProfileAndSchedule(session.user.id);
    };

    const handleUndoException = async (classId, actionType, courseName, section) => {
        setSchedule(prev => prev.map(c => c.id === classId ? { ...c, isCancelled: false, isConfirmed: false, isRescheduled: false, exceptionDetails: null } : c));
        const today = new Date().toLocaleDateString('en-CA');
        await supabase.from('schedule_exceptions').delete().match({ base_schedule_id: classId, exception_date: today });

        if (actionType === 'cancelled') {
            await supabase.from('notifications').delete().eq('message', `🚨 Cancelled: ${courseName} for Section ${section} has been cancelled by ${profile.name}.`);
        } else if (actionType === 'confirmed') {
            await supabase.from('notifications').delete().eq('message', `✅ Confirmed: ${courseName} for Section ${section} will be held as scheduled today.`);
        } else if (actionType === 'rescheduled') {
            await supabase.from('notifications').delete().ilike('message', `🕒 Rescheduled: ${courseName} for Section ${section}%`);
        }
        fetchProfileAndSchedule(session.user.id);
    };

    // --- MODAL FUNCTIONS (Edit / Permanent) ---
    const openEditModal = (cls) => {
        setEditingClass(cls); setNewDate(new Date().toLocaleDateString('en-CA'));
        setNewStartTime(convertTo12Hour(cls.start_time)); setNewEndTime(convertTo12Hour(cls.end_time));
        setNewRoom(cls.room); setIsEditModalOpen(true);
    };

    const submitReschedule = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: editingClass.id, exception_date: new Date().toLocaleDateString('en-CA'), status: 'rescheduled',
            new_start_time: newStartTime, new_end_time: newEndTime, new_room: newRoom, cancelled_by: session.user.id
        }]);

        if (!error) {
            await supabase.from('notifications').insert([{ message: `🕒 Rescheduled: ${editingClass.course} for Section ${editingClass.section} moved to Room ${newRoom} (${newStartTime} - ${newEndTime}).` }]);
            alert(`Class rescheduled successfully!`);
        }
        setIsEditModalOpen(false); fetchProfileAndSchedule(session.user.id);
    };

    const openBaseModal = (cls = null) => {
        if (cls) {
            setBaseForm({ ...cls, start_time: convertTo12Hour(cls.start_time), end_time: convertTo12Hour(cls.end_time) });
            setIsManualCourse(!availableCourses.includes(cls.course)); setIsManualRoom(!availableRooms.includes(cls.room));
            setIsManualSemester(!availableSemesters.includes(cls.semester)); setIsManualSection(!availableSections.includes(cls.section));
        } else {
            setBaseForm({ id: null, semester: '', section: '', course: '', room: '', day: 'MON', start_time: '8:00 AM', end_time: '9:30 AM' });
            setIsManualCourse(false); setIsManualRoom(false); setIsManualSemester(false); setIsManualSection(false);
        }
        setIsBaseModalOpen(true);
    };

    const submitBaseSchedule = async (e) => {
        e.preventDefault();
        setIsBaseModalOpen(false); 
        const payload = { 
            course: baseForm.course, teacher: profile.name, room: baseForm.room, 
            day: baseForm.day, start_time: baseForm.start_time, end_time: baseForm.end_time, 
            semester: baseForm.semester, section: baseForm.section 
        };
        if (baseForm.id) await supabase.from('base_schedule').update(payload).eq('id', baseForm.id);
        else await supabase.from('base_schedule').insert([payload]);
        await fetchProfileAndSchedule(session.user.id);
    };

    const deleteBaseLecture = async (id, courseName, section) => {
        if (!window.confirm(`Permanently delete ${courseName} (Sec ${section}) from your schedule? This cannot be undone.`)) return;
        setBaseSchedule(prev => prev.filter(c => c.id !== id));
        await supabase.from('base_schedule').delete().eq('id', id);
        await fetchProfileAndSchedule(session.user.id);
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>Loading...</div>;

    // ==========================================
    // RENDER: AUTHENTICATION SCREEN
    // ==========================================
    if (!session) {
        return (
            <div style={{ background: '#002147', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "'Roboto', sans-serif" }}>
                <div style={{ background: 'white', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                    <h2 style={{ color: '#002147', textAlign: 'center', margin: '0 0 20px 0' }}>{isLoginMode ? 'Teacher Login' : 'Teacher Sign Up'}</h2>
                    
                    {authError && <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '0.85rem' }}>{authError}</div>}

                    <form onSubmit={isLoginMode ? handleLogin : handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        
                        {!isLoginMode && (
                            <>
                                <select required value={signupName} onChange={(e) => setSignupName(e.target.value)} style={inputStyle}>
                                    <option value="" disabled>-- Select Your Name --</option>
                                    {availableTeacherNames.map(name => <option key={name} value={name}>{name}</option>)}
                                </select>
                                {availableTeacherNames.length === 0 && <span style={{ fontSize: '0.75rem', color: 'red' }}>All teachers currently in the record already have accounts.</span>}
                                
                                <input type="text" placeholder="CNIC Number" required value={cnic} onChange={(e) => setCnic(e.target.value)} style={inputStyle} />
                                <input type="text" placeholder="Phone Number" required value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
                            </>
                        )}
                        
                        <input type="email" placeholder="Email Address" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
                        <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
                        
                        <button type="submit" disabled={!isLoginMode && availableTeacherNames.length === 0} style={{ width: '100%', padding: '15px', background: '#F2A900', color: '#002147', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', opacity: (!isLoginMode && availableTeacherNames.length === 0) ? 0.5 : 1 }}>
                            {isLoginMode ? 'Login' : 'Sign Up'}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
                        {isLoginMode ? "Don't have an account? " : "Already have an account? "}
                        <span onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(''); }} style={{ color: '#007bff', cursor: 'pointer', fontWeight: 'bold' }}>
                            {isLoginMode ? 'Sign Up' : 'Login'}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: TEACHER DASHBOARD
    // ==========================================
    return (
        <div style={{ background: '#f0f2f5', minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
            <Head>
                <title>Teacher Dashboard | IUB</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
            </Head>

            <header style={{ background: '#002147', color: '#F2A900', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontWeight: '900', fontSize: '1.2rem' }}>👨‍🏫 Teacher Portal</div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <button onClick={handleLogout} style={{ background: '#F2A900', color: '#002147', border: 'none', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Logout</button>
                </div>
            </header>

            <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 15px' }}>
                
                {/* --- PWA & NOTIF BANNERS --- */}
                {deferredPrompt && (
                    <div style={{ background: '#17a2b8', color: '#fff', padding: '12px 15px', borderRadius: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <div><b>Install App 📱</b><br/><span style={{ opacity: 0.9 }}>Add IUB Assistant to your home screen for better performance.</span></div>
                        <button onClick={handleInstallClick} style={{ background: '#fff', color: '#17a2b8', border: 'none', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Install</button>
                    </div>
                )}
                {showNotifBanner && (
                    <div style={{ background: '#002147', color: '#fff', padding: '12px 15px', borderRadius: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', border: '2px solid #F2A900' }}>
                        <div><b>Stay Updated! 🔔</b><br/><span style={{ opacity: 0.9 }}>Allow notifications to get instant lecture reminders.</span></div>
                        <button onClick={forceNotificationPermission} style={{ background: '#F2A900', color: '#002147', border: 'none', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Enable</button>
                    </div>
                )}

                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '20px', borderLeft: '5px solid #F2A900' }}>
                    <h2 style={{ margin: '0 0 10px 0', color: '#002147', fontSize: '1.5rem' }}>Welcome, {profile?.name}</h2>
                    <p style={{ margin: 0, color: '#555', fontSize: '0.95rem' }}>Manage your daily lectures and notify your classes instantly.</p>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button onClick={() => setActiveTab('weekly')} style={{ flex: 1, padding: '12px', background: activeTab === 'weekly' ? '#002147' : '#ddd', color: activeTab === 'weekly' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}>
                        📅 Today / Weekly
                    </button>
                    <button onClick={() => setActiveTab('permanent')} style={{ flex: 1, padding: '12px', background: activeTab === 'permanent' ? '#002147' : '#ddd', color: activeTab === 'permanent' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}>
                        🏛️ Base Schedule
                    </button>
                </div>

                {/* ================= WEEKLY SCHEDULE TAB ================= */}
                {activeTab === 'weekly' && (
                    <div>
                        <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px', marginBottom: '15px' }}>Your Classes (Temp Actions)</h3>
                        {schedule.length === 0 ? <p>No classes found assigned to you.</p> : (
                            schedule.sort((a, b) => a.day.localeCompare(b.day)).map((cls) => (
                                <div key={cls.id} style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '15px', borderLeft: cls.isRescheduled ? '5px solid #007bff' : cls.isConfirmed ? '5px solid #28a745' : 'none', opacity: cls.isCancelled ? 0.6 : 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: cls.isCancelled ? 'red' : '#000', textDecoration: cls.isCancelled ? 'line-through' : 'none' }}>{cls.course}</div>
                                            <div style={{ color: '#666', fontSize: '0.9rem' }}>Section {cls.section} ({cls.semester}) | Room {cls.room}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#002147', fontWeight: '900' }}>{cls.day}</div>
                                            <div style={{ color: '#F2A900', fontWeight: 'bold' }}>{convertTo12Hour(cls.start_time)} - {convertTo12Hour(cls.end_time)}</div>
                                        </div>
                                    </div>
                                    {cls.isRescheduled && <div style={{ background: '#e7f1ff', color: '#004085', padding: '10px', borderRadius: '5px', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>🔄 Moved to {cls.exceptionDetails.new_room} on {cls.exceptionDetails.exception_date} ({convertTo12Hour(cls.exceptionDetails.new_start_time)} - {convertTo12Hour(cls.exceptionDetails.new_end_time)})</div>}
                                    {cls.isConfirmed && <div style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '5px', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>✅ Confirmed to be Held</div>}
                                    
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {cls.isCancelled ? <button onClick={() => handleUndoException(cls.id, 'cancelled', cls.course, cls.section)} style={btnStyle('#6c757d')}>↩️ Undo Cancellation</button> : cls.isConfirmed ? <button onClick={() => handleUndoException(cls.id, 'confirmed', cls.course, cls.section)} style={btnStyle('#6c757d')}>↩️ Mark Not Confirm</button> : cls.isRescheduled ? <button onClick={() => handleUndoException(cls.id, 'rescheduled', cls.course, cls.section)} style={btnStyle('#6c757d')}>↩️ Undo Reschedule</button> : (
                                            <>
                                                <button onClick={() => handleConfirmClass(cls.id, cls.course, cls.section)} style={btnStyle('#28a745')}>✅ Will Held</button>
                                                <button onClick={() => openEditModal(cls)} style={btnStyle('#007bff')}>🕒 Modify Time/Room</button>
                                                <button onClick={() => handleCancelClass(cls.id, cls.course, cls.section)} style={btnStyle('#dc3545')}>❌ Cancel Lecture</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ================= PERMANENT SCHEDULE TAB ================= */}
                {activeTab === 'permanent' && (
                    <div>
                        <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px', marginBottom: '15px' }}>Your Permanent Schedule</h3>
                        {baseSchedule.length === 0 ? <p>No base schedule found.</p> : (
                            baseSchedule.sort((a, b) => a.day.localeCompare(b.day)).map((cls) => (
                                <div key={`base-${cls.id}`} style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#000' }}>{cls.course}</div>
                                            <div style={{ color: '#666', fontSize: '0.9rem' }}>Sec: {cls.section} | Sem: {cls.semester} | Room: {cls.room}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#002147', fontWeight: '900' }}>{cls.day}</div>
                                            <div style={{ color: '#F2A900', fontWeight: 'bold' }}>{convertTo12Hour(cls.start_time)} - {convertTo12Hour(cls.end_time)}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        <button onClick={() => openBaseModal(cls)} style={btnStyle('#17a2b8')}>✏️ Edit Lecture</button>
                                        <button onClick={() => deleteBaseLecture(cls.id, cls.course, cls.section)} style={btnStyle('#dc3545')}>🗑️ Delete Lecture</button>
                                    </div>
                                </div>
                            ))
                        )}
                        <button onClick={() => openBaseModal()} style={{ width: '100%', padding: '15px', background: '#002147', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginTop: '10px', marginBottom: '30px' }}>➕ Add New Lecture</button>
                    </div>
                )}
            </div>

            {/* TEMP EXCEPTION EDIT MODAL */}
            {isEditModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '15px', boxSizing: 'border-box' }}>
                    <div style={{ background: 'white', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '400px' }}>
                        <h3 style={{ marginTop: 0 }}>Modify Lecture Time</h3>
                        <form onSubmit={submitReschedule} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <input type="date" required value={newDate} onChange={(e) => setNewDate(e.target.value)} style={inputStyle} />
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <select value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} style={{...inputStyle, flex: 1}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                <select value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} style={{...inputStyle, flex: 1}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                            </div>
                            <select required value={newRoom} onChange={(e) => setNewRoom(e.target.value)} style={inputStyle}>
                                {availableRooms.length > 0 ? availableRooms.map(r => <option key={r} value={r}>{r}</option>) : <option value={newRoom}>{newRoom}</option>}
                            </select>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#eee', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', background: '#F2A900', color: '#002147', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PERMANENT BASE SCHEDULE MODAL */}
            {isBaseModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '15px', boxSizing: 'border-box', overflowY: 'auto' }}>
                    <div style={{ background: 'white', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0 }}>{baseForm.id ? 'Edit Base Lecture' : 'Add New Lecture'}</h3>
                        <form onSubmit={submitBaseSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {isManualSemester ? <input type="text" placeholder="Semester (e.g. 1st)..." required value={baseForm.semester} onChange={(e) => setBaseForm({...baseForm, semester: e.target.value})} style={inputStyle} /> : <select required value={baseForm.semester} onChange={(e) => { if (e.target.value === 'MANUAL') { setIsManualSemester(true); setBaseForm({...baseForm, semester: ''}); } else setBaseForm({...baseForm, semester: e.target.value}); }} style={inputStyle}><option value="" disabled>-- Select Semester --</option>{availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}<option value="MANUAL">+ Add Manually</option></select>}
                            {isManualSection ? <input type="text" placeholder="Section (e.g. A)..." required value={baseForm.section} onChange={(e) => setBaseForm({...baseForm, section: e.target.value})} style={inputStyle} /> : <select required value={baseForm.section} onChange={(e) => { if (e.target.value === 'MANUAL') { setIsManualSection(true); setBaseForm({...baseForm, section: ''}); } else setBaseForm({...baseForm, section: e.target.value}); }} style={inputStyle}><option value="" disabled>-- Select Section --</option>{availableSections.map(s => <option key={s} value={s}>{s}</option>)}<option value="MANUAL">+ Add Manually</option></select>}
                            {isManualCourse ? <input type="text" placeholder="Subject Name..." required value={baseForm.course} onChange={(e) => setBaseForm({...baseForm, course: e.target.value})} style={inputStyle} /> : <select required value={baseForm.course} onChange={(e) => { if (e.target.value === 'MANUAL') { setIsManualCourse(true); setBaseForm({...baseForm, course: ''}); } else setBaseForm({...baseForm, course: e.target.value}); }} style={inputStyle}><option value="" disabled>-- Select Subject --</option>{availableCourses.map(c => <option key={c} value={c}>{c}</option>)}<option value="MANUAL">+ Add Manually</option></select>}
                            {isManualRoom ? <input type="text" placeholder="Room Name (e.g. 101)..." required value={baseForm.room} onChange={(e) => setBaseForm({...baseForm, room: e.target.value})} style={inputStyle} /> : <select required value={baseForm.room} onChange={(e) => { if (e.target.value === 'MANUAL') { setIsManualRoom(true); setBaseForm({...baseForm, room: ''}); } else setBaseForm({...baseForm, room: e.target.value}); }} style={inputStyle}><option value="" disabled>-- Select Room --</option>{availableRooms.map(r => <option key={r} value={r}>{r}</option>)}<option value="MANUAL">+ Add Manually</option></select>}
                            <select required value={baseForm.day} onChange={(e) => setBaseForm({...baseForm, day: e.target.value})} style={inputStyle}>{days.map(d => <option key={d} value={d}>{d}</option>)}</select>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <select value={baseForm.start_time} onChange={(e) => setBaseForm({...baseForm, start_time: e.target.value})} style={{...inputStyle, flex: 1}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                <select value={baseForm.end_time} onChange={(e) => setBaseForm({...baseForm, end_time: e.target.value})} style={{...inputStyle, flex: 1}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => setIsBaseModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#eee', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', background: '#F2A900', color: '#002147', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const btnStyle = (bg) => ({ flex: 1, minWidth: '100px', padding: '10px', background: bg, color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' });
const inputStyle = { width: '100%', padding: '12px', border: '2px solid #dee2e6', borderRadius: '8px', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' };
