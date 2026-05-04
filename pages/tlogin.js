import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';
import AttendanceSheet from '../components/AttendanceSheet'; 

export default function TeacherLoginAndDashboard() {
    // --- AUTH STATES ---
    const [session, setSession] = useState(null);
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // --- GATEKEEPER STATE ---
    const [isPendingApproval, setIsPendingApproval] = useState(false);

    // --- SIGNUP SPECIFIC STATES ---
    const [signupName, setSignupName] = useState('');
    const [cnic, setCnic] = useState('');
    const [phone, setPhone] = useState('');
    const [availableTeacherNames, setAvailableTeacherNames] = useState([]);
    const [authError, setAuthError] = useState('');

    // --- TOAST & TIMER STATES ---
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [resendTimer, setResendTimer] = useState(0);
    const [unverifiedEmail, setUnverifiedEmail] = useState('');

    // --- DASHBOARD STATES ---
    const [profile, setProfile] = useState(null);
    const [schedule, setSchedule] = useState([]);
    const [baseSchedule, setBaseSchedule] = useState([]);
    const [roster, setRoster] = useState([]); // All students for this teacher's sections
    const [loading, setLoading] = useState(true);
    const alertedClasses = useRef(new Set()); 

    // --- PWA & NOTIFICATION STATES ---
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

    // --- TAB STATES ---
    const [activeTab, setActiveTab] = useState('weekly');
    
    // --- WEEKLY TIMETABLE STATES ---
    const [selectedDay, setSelectedDay] = useState(() => {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        return ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].includes(today) ? today : "MON";
    });

    // --- ATTENDANCE & APPROVAL STATES ---
    const [attendanceView, setAttendanceView] = useState('approve'); // mark, approve, download, stats
    const [pendingAttendances, setPendingAttendances] = useState([]);
    const [activeAttendanceLecture, setActiveAttendanceLecture] = useState(null);
    const [attendanceStats, setAttendanceStats] = useState([]);
    const [allSessionsData, setAllSessionsData] = useState([]);
    const [attendanceSectionFilter, setAttendanceSectionFilter] = useState('ALL');

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
        const match12 = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match12) {
            let h = parseInt(match12[1], 10);
            let m = parseInt(match12[2], 10);
            let ap = match12[3].toUpperCase();
            if (h === 12) h = 0;
            if (ap === 'PM') h += 12;
            return h * 60 + m;
        }
        const match24 = t.match(/(\d+):(\d+)/);
        if (match24) {
            let h = parseInt(match24[1], 10);
            let m = parseInt(match24[2], 10);
            return h * 60 + m;
        }
        return 0;
    };

    const getDateForCurrentWeekDay = (dayName) => {
        const dayMap = { 'SUN': 0, 'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6 };
        const today = new Date();
        const currentDay = today.getDay(); 
        const targetDay = dayMap[dayName.toUpperCase()];
        const diff = targetDay - currentDay;
        
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + diff);
        return targetDate.toLocaleDateString('en-CA');
    };

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
    };

    useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch((err) => console.error('SW Registration Failed', err));
        }

        const handleInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleInstall);

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                verifyTeacherAndLoad(session.user.id, session);
            } else {
                fetchUnclaimedTeachers();
                setLoading(false);
            }
        });

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                verifyTeacherAndLoad(session.user.id, session);
            } else { 
                setSession(null); setProfile(null); setLoading(false); 
            }
        });

        if ("Notification" in window && Notification.permission === "default") {
            setShowNotifBanner(true);
        }

        return () => {
            authListener.subscription.unsubscribe();
            window.removeEventListener('beforeinstallprompt', handleInstall);
        };
    }, []);

    // --- STRICT TEACHER VERIFICATION (GATEKEEPER) ---
    const verifyTeacherAndLoad = async (userId, activeSession) => {
        const { data: profileData, error } = await supabase.from('teacher_profiles').select('*').eq('id', userId).single();
        if (error || !profileData) {
            await supabase.auth.signOut();
            setSession(null);
            setLoading(false);
            setAuthError("Unauthorized: This email is not registered as a Teacher.");
        } else if (profileData.is_approved === false) {
            setIsPendingApproval(true);
            setSession(activeSession);
            setProfile(profileData);
            setLoading(false);
        } else {
            setSession(activeSession);
            setProfile(profileData);
            fetchProfileAndSchedule(profileData.name);
        }
    };

    const fetchUnclaimedTeachers = async () => {
        const { data: allLectures } = await supabase.from('base_schedule').select('teacher');
        const { data: claimedProfiles } = await supabase.from('teacher_profiles').select('name');
        
        if (allLectures) {
            const allTeacherNames = [...new Set(allLectures.map(x => x.teacher))].filter(Boolean);
            const claimedNames = claimedProfiles ? claimedProfiles.map(p => p.name) : [];
            const unclaimed = allTeacherNames.filter(name => !claimedNames.includes(name));
            setAvailableTeacherNames(unclaimed.sort());
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthError('');
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setAuthError(error.message);
        } 
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        if (!signupName) return showToast('Please select your name from the dropdown.', 'error');
    
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                emailRedirectTo: 'https://mohsinakhtar.me/verify-success',
                data: { full_name: signupName, phone: phone, cnic: cnic }
            }
        });
    
        if (error) {
            showToast(error.message, "error");
            return;
        }

        if (data?.user) {
            const { error: profileError } = await supabase.from('teacher_profiles').insert([{
                id: data.user.id, 
                name: signupName,
                email: email,
                phone: phone,
                cnic: cnic
            }]);

            if (profileError) {
                console.error("Profile Insert Error:", profileError);
                showToast("Auth created, but profile failed: " + profileError.message, "error");
            } else {
                setUnverifiedEmail(email);
                setResendTimer(60); 
                showToast("Account created! Verify your email to submit your profile for admin approval.", "success");
                setIsLoginMode(true);
                fetchUnclaimedTeachers(); 
            }
        }
    };

    const handleResendEmail = async () => {
        if (resendTimer > 0) return;
        const { error } = await supabase.auth.resend({ type: 'signup', email: unverifiedEmail });
        if (error) showToast(error.message, "error");
        else { showToast("Verification email resent! Please check your inbox.", "success"); setResendTimer(60); }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        setIsPendingApproval(false);
    };

    const fetchProfileAndSchedule = async (teacherName) => {
        // Fetch Base Schedule for this teacher
        const { data: scheduleData } = await supabase.from('base_schedule').select('*').eq('teacher', teacherName);
        setBaseSchedule(scheduleData || []);
        
        // Populate all Dropdowns
        const { data: allData } = await supabase.from('base_schedule').select('room, course, semester, section');
        if (allData) {
            setAvailableRooms([...new Set(allData.map(x => x.room))].filter(Boolean).sort());
            setAvailableCourses([...new Set(allData.map(x => x.course))].filter(Boolean).sort());
            setAvailableSemesters([...new Set(allData.map(x => x.semester))].filter(Boolean).sort());
            setAvailableSections([...new Set(allData.map(x => x.section))].filter(Boolean).sort());
        }

        // Fetch Students for the classes this teacher teaches
        if (scheduleData && scheduleData.length > 0) {
            const uniqueGroups = [...new Set(scheduleData.map(s => JSON.stringify({ session: s.semester, section: s.section })))].map(str => JSON.parse(str));
            let allStudents = [];
            for (const group of uniqueGroups) {
                const { data: students } = await supabase.from('students').select('*').eq('session', group.session).eq('section', group.section);
                if (students) allStudents = [...allStudents, ...students];
            }
            setRoster(allStudents);
        }

        const { data: exceptionsData } = await supabase.from('schedule_exceptions').select('*');

        const baseIds = scheduleData ? scheduleData.map(s => s.id) : [];
        let sessionsWithRecords = [];
        let stats = [];
        let pending = [];

        if (baseIds.length > 0) {
            const [sessionsRes, recordsRes] = await Promise.all([
                supabase.from('attendance_sessions').select('*').in('base_schedule_id', baseIds),
                supabase.from('attendance_records').select('*')
            ]);

            const allSessions = sessionsRes.data || [];
            const allRecords = recordsRes.data || [];

            sessionsWithRecords = allSessions.map(s => {
                const base = scheduleData.find(b => b.id === s.base_schedule_id);
                return {
                    ...s,
                    course: base?.course,
                    section: base?.section,
                    semester: base?.semester,
                    day: base?.day,
                    baseLecture: base,
                    records: allRecords.filter(r => r.session_id === s.id)
                }
            });
            
            setAllSessionsData(sessionsWithRecords);

            // Calculate pending attendances
            pending = sessionsWithRecords.filter(s => s.status === 'pending').map(session => {
                const presentCount = session.records.filter(r => r.status === 'Present' || r.status === 'Leave').length;
                return { ...session, presentCount, totalCount: session.records.length };
            });
            setPendingAttendances(pending);

            // Calculate overall stats per Course + Section combination
            const uniqueClasses = [...new Set(scheduleData.map(s => JSON.stringify({ course: s.course, section: s.section })))].map(str => JSON.parse(str));
            
            stats = uniqueClasses.map(cls => {
                const classBaseIds = scheduleData.filter(s => s.course === cls.course && s.section === cls.section).map(s => s.id);
                const classSessions = sessionsWithRecords.filter(s => classBaseIds.includes(s.base_schedule_id));
                
                let totalRecords = 0;
                let presentRecords = 0;
                
                classSessions.forEach(sess => {
                    sess.records.forEach(rec => {
                        totalRecords++;
                        if (rec.status === 'Present' || rec.status === 'Leave') presentRecords++;
                    });
                });

                const percentage = totalRecords === 0 ? 0 : Math.round((presentRecords / totalRecords) * 100);
                return { subject: cls.course, section: cls.section, totalConducted: classSessions.length, percentage, sessions: classSessions };
            });
            setAttendanceStats(stats);
        }

        const mergedSchedule = (scheduleData || []).map(cls => {
            const targetDate = getDateForCurrentWeekDay(cls.day);
            const exception = (exceptionsData || []).find(ex => ex.base_schedule_id === cls.id && ex.exception_date === targetDate);
            const sessionToday = sessionsWithRecords.find(s => s.base_schedule_id === cls.id && s.session_date === targetDate);
            
            return { 
                ...cls, 
                isCancelled: exception?.status === 'cancelled',
                isRescheduled: exception?.status === 'rescheduled',
                isConfirmed: exception?.status === 'confirmed',
                exceptionDetails: exception,
                attendanceSession: sessionToday
            };
        });

        setSchedule(mergedSchedule);
        setLoading(false);
    };

    const handleApproveAttendance = async (sessionId) => {
        const { error } = await supabase.from('attendance_sessions').update({ status: 'approved' }).eq('id', sessionId);
        if (error) {
            showToast("Failed to approve: " + error.message, "error");
        } else {
            showToast("Attendance approved successfully!", "success");
            fetchProfileAndSchedule(profile.name);
        }
    };

    // Calculate individual student attendance %
    const getStudentAttendance = (studentReg, subjectFilter, sectionFilter) => {
        let present = 0, total = 0;
        allSessionsData.forEach(session => {
            // Check filters
            if (subjectFilter !== 'ALL' && session.course !== subjectFilter) return;
            if (sectionFilter !== 'ALL' && session.section !== sectionFilter) return;

            const record = session.records.find(r => r.student_id === studentReg);
            if (record) {
                total++;
                if (record.status === 'Present' || record.status === 'Leave') present++;
            }
        });
        return total === 0 ? 0 : Math.round((present / total) * 100);
    };

    const downloadCSV = (stat) => {
        if (stat.sessions.length === 0) return showToast("No attendance recorded for this subject yet.", "error");

        let csv = "Registration Number,Name";
        const sortedSessions = stat.sessions.sort((a,b) => new Date(a.session_date) - new Date(b.session_date));
        
        sortedSessions.forEach(s => { csv += `,${s.session_date}`; });
        csv += ",Overall %\n";

        // Filter roster to only include students in this section
        const sectionRoster = roster.filter(student => student.section === stat.section);

        sectionRoster.forEach(student => {
            let row = `${student.registration_number},${student.student_name}`;
            let presentCount = 0, totalCount = 0;
            
            sortedSessions.forEach(s => {
                const rec = s.records.find(r => r.student_id === student.registration_number);
                if (rec) {
                    totalCount++;
                    const isPresent = (rec.status === 'Present' || rec.status === 'Leave') ? 1 : 0;
                    row += `,${isPresent}`;
                    if (isPresent === 1) presentCount++;
                } else { row += `,N/A`; }
            });
            
            const pct = totalCount === 0 ? 0 : Math.round((presentCount / totalCount) * 100);
            row += `,${pct}%\n`;
            csv += row;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${stat.subject}_Section_${stat.section}_Attendance.csv`;
        a.click();
    };

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
                            supabase.from('notifications').insert([{ message: `⚠️ Teacher Reminder: ${cls.course} (Sec ${cls.section}) is pending confirmation.` }]).then();
                        }
                    }
                }
            });
        }, 60000); 

        return () => clearInterval(interval);
    }, [schedule, session]);

    useEffect(() => {
        if (!profile || !profile.is_approved || schedule.length === 0) return;
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

    const handleConfirmClass = async (classId, courseName, section, clsDay) => {
        setSchedule(prev => prev.map(c => c.id === classId ? { ...c, isConfirmed: true, isCancelled: false, isRescheduled: false } : c));
        const targetDate = getDateForCurrentWeekDay(clsDay);
        const { error } = await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: classId, exception_date: targetDate, status: 'confirmed', cancelled_by: session.user.id
        }]);

        if (error) showToast("Failed to update: " + error.message, "error");
        else {
            const { error: notifError } = await supabase.from('notifications').insert([{ message: `✅ Confirmed: ${courseName} for Section ${section} will be held on ${targetDate}.` }]);
            if(notifError) showToast("Updated, but notification failed.", "error");
            else showToast("Class confirmed & students notified!", "success");
        }
        fetchProfileAndSchedule(profile.name); 
    };

    const handleCancelClass = async (classId, courseName, section, clsDay) => {
        const confirmCancel = window.confirm(`Are you sure you want to CANCEL ${courseName}?`);
        if (!confirmCancel) return;

        setSchedule(prev => prev.map(c => c.id === classId ? { ...c, isCancelled: true, isConfirmed: false, isRescheduled: false } : c));
        const targetDate = getDateForCurrentWeekDay(clsDay);
        const { error } = await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: classId, exception_date: targetDate, status: 'cancelled', cancelled_by: session.user.id
        }]);

        if (error) showToast("Failed to cancel: " + error.message, "error");
        else {
            const { error: notifError } = await supabase.from('notifications').insert([{ message: `🚨 Cancelled: ${courseName} for Section ${section} on ${targetDate} has been cancelled by ${profile.name}.` }]);
            if(notifError) showToast("Cancelled, but notification failed.", "error");
            else showToast("Class cancelled & students notified!", "success");
        }
        fetchProfileAndSchedule(profile.name);
    };

    const handleUndoException = async (classId, actionType, courseName, section, clsDay) => {
        setSchedule(prev => prev.map(c => c.id === classId ? { ...c, isCancelled: false, isConfirmed: false, isRescheduled: false, exceptionDetails: null } : c));
        const targetDate = getDateForCurrentWeekDay(clsDay);
        
        const { error } = await supabase.from('schedule_exceptions').delete().match({ base_schedule_id: classId, exception_date: targetDate });

        if (error) showToast("Failed to undo: " + error.message, "error");
        else {
            if (actionType === 'cancelled') await supabase.from('notifications').delete().eq('message', `🚨 Cancelled: ${courseName} for Section ${section} on ${targetDate} has been cancelled by ${profile.name}.`);
            else if (actionType === 'confirmed') await supabase.from('notifications').delete().eq('message', `✅ Confirmed: ${courseName} for Section ${section} will be held on ${targetDate}.`);
            else if (actionType === 'rescheduled') await supabase.from('notifications').delete().ilike('message', `🕒 Rescheduled: ${courseName} for Section ${section}%`);
            showToast("Action reversed successfully.", "success");
        }
        fetchProfileAndSchedule(profile.name);
    };

    const submitReschedule = async (e) => {
        e.preventDefault();
        const targetDate = getDateForCurrentWeekDay(editingClass.day);
        const { error } = await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: editingClass.id, exception_date: targetDate, status: 'rescheduled',
            new_start_time: newStartTime, new_end_time: newEndTime, new_room: newRoom, cancelled_by: session.user.id
        }]);

        if (error) showToast("Failed to reschedule: " + error.message, "error");
        else {
            const { error: notifError } = await supabase.from('notifications').insert([{ message: `🕒 Rescheduled: ${editingClass.course} for Section ${editingClass.section} moved to Room ${newRoom} (${newStartTime} - ${newEndTime}) on ${targetDate}.` }]);
            if(notifError) showToast("Rescheduled, but notification failed.", "error");
            else showToast(`Class rescheduled & students notified!`, "success");
        }
        setIsEditModalOpen(false); 
        fetchProfileAndSchedule(profile.name);
    };

    const openEditModal = (cls) => {
        setEditingClass(cls); setNewDate(new Date().toLocaleDateString('en-CA'));
        setNewStartTime(convertTo12Hour(cls.start_time)); setNewEndTime(convertTo12Hour(cls.end_time));
        setNewRoom(cls.room); setIsEditModalOpen(true);
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
        await fetchProfileAndSchedule(profile.name);
    };

    const deleteBaseLecture = async (id, courseName, section) => {
        if (!window.confirm(`Permanently delete ${courseName} (Sec ${section}) from your schedule? This cannot be undone.`)) return;
        setBaseSchedule(prev => prev.filter(c => c.id !== id));
        await supabase.from('base_schedule').delete().eq('id', id);
        await fetchProfileAndSchedule(profile.name);
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>Loading...</div>;

    // ==========================================
    // RENDER: AUTHENTICATION SCREEN
    // ==========================================
    if (!session) {
        return (
            <div style={{ background: '#002147', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "'Roboto', sans-serif" }}>
                <div style={{...toastStyle, opacity: toast.show ? 1 : 0, transform: toast.show ? 'translateY(0)' : 'translateY(-20px)', backgroundColor: toast.type === 'error' ? '#dc3545' : '#28a745' }}>
                    {toast.message}
                </div>
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
                    {isLoginMode && unverifiedEmail && (
                        <div style={{ marginTop: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem' }}>
                            <p style={{ margin: '0 0 10px 0', color: '#555', fontWeight: 'bold' }}>Didn't receive the email?</p>
                            <button onClick={handleResendEmail} disabled={resendTimer > 0} style={{ width: '100%', background: resendTimer > 0 ? '#ccc' : '#002147', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                                {resendTimer > 0 ? `Resend available in ${resendTimer}s` : 'Resend Verification Email'}
                            </button>
                        </div>
                    )}
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

    // --- RENDER PENDING APPROVAL SCREEN ---
    if (isPendingApproval) {
        return (
            <div style={{ background: '#f0f2f5', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "'Roboto', sans-serif", padding: '20px' }}>
                <Head><title>Pending Approval | IUB Assistant</title></Head>
                <div style={{ background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⏳</div>
                    <h2 style={{ color: '#002147', margin: '0 0 15px 0' }}>Approval Pending</h2>
                    <p style={{ color: '#555', fontSize: '1rem', lineHeight: '1.5', marginBottom: '25px' }}>
                        Your account has been successfully verified, but an administrator must manually approve your access before you can view your dashboard.
                    </p>
                    <button onClick={handleLogout} style={{ background: '#F2A900', color: '#002147', border: 'none', padding: '12px 25px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
                        Log Out
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: TEACHER DASHBOARD
    // ==========================================
    
    const filteredWeeklySchedule = schedule
        .filter(cls => cls.day === selectedDay)
        .sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));

    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const currentMins = new Date().getHours() * 60 + new Date().getMinutes();

    return (
        <div style={{ background: '#f0f2f5', minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
          <Head>
            <title>Teacher Dashboard | IUB</title>
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
            <link rel="manifest" href="/manifest.json" />
            <meta name="theme-color" content="#002147" />
        </Head>

            <div style={{...toastStyle, opacity: toast.show ? 1 : 0, transform: toast.show ? 'translateY(0)' : 'translateY(-20px)', backgroundColor: toast.type === 'error' ? '#dc3545' : '#28a745' }}>
                {toast.message}
            </div>

            <header style={{ background: '#002147', color: '#F2A900', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontWeight: '900', fontSize: '1.2rem' }}>👨‍🏫 Teacher Portal</div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <button onClick={handleLogout} style={{ background: '#F2A900', color: '#002147', border: 'none', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Logout</button>
                </div>
            </header>

            <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 15px' }}>
                
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
                    <p style={{ margin: 0, color: '#555', fontSize: '0.95rem' }}>Manage your daily lectures and student attendance.</p>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <button onClick={() => setActiveTab('weekly')} style={{ flex: 1, padding: '12px', background: activeTab === 'weekly' ? '#002147' : '#ddd', color: activeTab === 'weekly' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}>
                        📅 Today / Weekly
                    </button>
                    <button onClick={() => setActiveTab('attendance')} style={{ flex: 1, padding: '12px', background: activeTab === 'attendance' ? '#002147' : '#ddd', color: activeTab === 'attendance' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s', position: 'relative' }}>
                        📝 Attendance & Approvals
                        {pendingAttendances.length > 0 && (
                            <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#dc3545', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.75rem', border: '2px solid white' }}>{pendingAttendances.length}</span>
                        )}
                    </button>
                    <button onClick={() => setActiveTab('permanent')} style={{ flex: 1, padding: '12px', background: activeTab === 'permanent' ? '#002147' : '#ddd', color: activeTab === 'permanent' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}>
                        🏛️ Base Schedule
                    </button>
                </div>

                {/* ================= WEEKLY SCHEDULE TAB ================= */}
                {activeTab === 'weekly' && (
                    <div>
                        <div style={{ display: 'flex', overflowX: 'auto', gap: '10px', marginBottom: '20px', paddingBottom: '10px', scrollbarWidth: 'none' }}>
                            {days.map(day => (
                                <button key={`day-${day}`} onClick={() => setSelectedDay(day)}
                                    style={{ 
                                        padding: '10px 20px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', border: 'none',
                                        background: selectedDay === day ? '#002147' : '#e9ecef', color: selectedDay === day ? '#F2A900' : '#495057', boxShadow: selectedDay === day ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
                                    }}>
                                    {day}
                                </button>
                            ))}
                        </div>

                        <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px', marginBottom: '15px' }}>Classes for {selectedDay} (Temp Actions)</h3>
                        {filteredWeeklySchedule.length === 0 ? <p style={{ textAlign: 'center', padding: '20px', background: 'white', borderRadius: '8px' }}>No classes scheduled for {selectedDay}.</p> : (
                            filteredWeeklySchedule.map((cls) => (
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
                                    {cls.isConfirmed && <div style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '5px', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>✅ Confirmed to be Held on {cls.exceptionDetails?.exception_date}</div>}
                                    
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {cls.isCancelled ? <button onClick={(e) => handleUndoException(cls.id, 'cancelled', cls.course, cls.section, cls.day)} style={btnStyle('#6c757d')}>↩️ Undo Cancellation</button> : cls.isConfirmed ? <button onClick={(e) => handleUndoException(cls.id, 'confirmed', cls.course, cls.section, cls.day)} style={btnStyle('#6c757d')}>↩️ Mark Not Confirm</button> : cls.isRescheduled ? <button onClick={(e) => handleUndoException(cls.id, 'rescheduled', cls.course, cls.section, cls.day)} style={btnStyle('#6c757d')}>↩️ Undo Reschedule</button> : (
                                            <>
                                                <button onClick={(e) => handleConfirmClass(cls.id, cls.course, cls.section, cls.day)} style={btnStyle('#28a745')}>✅ Will Held</button>
                                                <button onClick={(e) => openEditModal(cls)} style={btnStyle('#007bff')}>🕒 Modify Time/Room</button>
                                                <button onClick={(e) => handleCancelClass(cls.id, cls.course, cls.section, cls.day)} style={btnStyle('#dc3545')}>❌ Cancel Lecture</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ================= COMPREHENSIVE ATTENDANCE TAB ================= */}
                {activeTab === 'attendance' && (
                    <div>
                        {/* Attendance Sub-navigation */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', padding: '5px', background: '#e9ecef', borderRadius: '8px', overflowX: 'auto' }}>
                            <button onClick={() => setAttendanceView('approve')} style={subTabStyle(attendanceView === 'approve')}>
                                ✅ Approvals {pendingAttendances.length > 0 && <span style={{ background: '#dc3545', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem', marginLeft: '5px' }}>{pendingAttendances.length}</span>}
                            </button>
                            <button onClick={() => setAttendanceView('mark')} style={subTabStyle(attendanceView === 'mark')}>📝 Mark / Edit</button>
                            <button onClick={() => setAttendanceView('download')} style={subTabStyle(attendanceView === 'download')}>📥 Download CSV</button>
                            <button onClick={() => setAttendanceView('stats')} style={subTabStyle(attendanceView === 'stats')}>📊 Statistics</button>
                        </div>

                        {/* SUB-VIEW 1: APPROVALS */}
                        {attendanceView === 'approve' && (
                            <div>
                                <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px', marginBottom: '15px' }}>Pending Attendance submitted by CR</h3>
                                {pendingAttendances.length === 0 ? <p style={{ background: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>No pending attendance to approve.</p> : (
                                    pendingAttendances.map(session => (
                                        <div key={`pend-${session.id}`} style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '15px', borderLeft: '5px solid #f59e0b' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                                                <div>
                                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#000' }}>{session.course}</div>
                                                    <div style={{ color: '#666', fontSize: '0.9rem' }}>Section {session.section} ({session.semester})</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ color: '#002147', fontWeight: '900' }}>{session.session_date}</div>
                                                    <div style={{ color: '#666', fontSize: '0.9rem' }}>{session.presentCount} / {session.totalCount} Present</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                <button onClick={() => handleApproveAttendance(session.id)} style={btnStyle('#28a745')}>✅ Approve Directly</button>
                                                <button onClick={() => {
                                                    const formattedLecture = { ...session.baseLecture, attendanceSession: session };
                                                    setActiveAttendanceLecture(formattedLecture);
                                                }} style={btnStyle('#007bff')}>✏️ Review & Edit</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* SUB-VIEW 2: MARK / EDIT ATTENDANCE */}
                        {attendanceView === 'mark' && (
                            <div>
                                <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px', marginBottom: '15px' }}>Today's Lectures</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                                    {attendanceStats.map(stat => {
                                        const todayClass = schedule.find(c => c.course === stat.subject && c.section === stat.section && c.day === currentDay && !c.isCancelled);
                                        if (!todayClass) return null;

                                        const startMins = parseTime(todayClass.start_time);
                                        const endMins = parseTime(todayClass.end_time);
                                        const isOngoing = currentMins >= startMins && currentMins <= endMins;
                                        const todaySession = todayClass.attendanceSession;

                                        return (
                                            <div key={`mark-today-${stat.subject}-${stat.section}`} style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderTop: '4px solid #28a745' }}>
                                                <h3 style={{ margin: '0 0 5px 0', color: '#002147', fontSize: '1.2rem' }}>{stat.subject}</h3>
                                                <p style={{ margin: '0 0 15px 0', fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>Sec: {stat.section} | {todayClass.start_time} - {todayClass.end_time}</p>
                                                
                                                {isOngoing && !todaySession && (
                                                    <button onClick={() => setActiveAttendanceLecture(todayClass)} style={{ width: '100%', padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', animation: 'pulse 2s infinite' }}>
                                                        📝 Mark Attendance (Ongoing)
                                                    </button>
                                                )}
                                                {(!isOngoing && !todaySession) && (
                                                    <button onClick={() => setActiveAttendanceLecture(todayClass)} style={{ width: '100%', padding: '12px', background: '#002147', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
                                                        📝 Mark Attendance
                                                    </button>
                                                )}
                                                {todaySession && (
                                                    <button onClick={() => setActiveAttendanceLecture(todayClass)} style={{ width: '100%', padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
                                                        ✏️ Edit Today's Attendance
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {attendanceStats.filter(stat => schedule.find(c => c.course === stat.subject && c.section === stat.section && c.day === currentDay && !c.isCancelled)).length === 0 && (
                                        <p style={{textAlign: 'center', width: '100%', padding: '20px', background: 'white', borderRadius: '8px'}}>No classes scheduled for today.</p>
                                    )}
                                </div>

                                <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px', marginBottom: '15px' }}>Edit Past Sessions (Anytime)</h3>
                                {allSessionsData.length === 0 ? <p style={{textAlign: 'center', padding: '20px', background: 'white', borderRadius: '8px'}}>No past sessions recorded.</p> : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                                        {allSessionsData.sort((a,b) => new Date(b.session_date) - new Date(a.session_date)).map(session => (
                                            <div key={`editpast-${session.id}`} style={{ background: 'white', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #6c757d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 'bold', color: '#000', fontSize: '0.95rem' }}>{session.course}</div>
                                                    <div style={{ color: '#666', fontSize: '0.8rem' }}>Sec: {session.section} | Date: {session.session_date}</div>
                                                </div>
                                                <button onClick={() => {
                                                    const formattedLecture = { ...session.baseLecture, attendanceSession: session };
                                                    setActiveAttendanceLecture(formattedLecture);
                                                }} style={{ padding: '8px 15px', background: '#002147', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>
                                                    Edit
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SUB-VIEW 3: DOWNLOAD CSV */}
                        {attendanceView === 'download' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                                {attendanceStats.map(stat => (
                                    <div key={`dl-${stat.subject}-${stat.section}`} style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderTop: '4px solid #17a2b8' }}>
                                        <h3 style={{ margin: '0 0 5px 0', color: '#002147', fontSize: '1.2rem' }}>{stat.subject}</h3>
                                        <p style={{ margin: '0 0 15px 0', fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>Section: {stat.section}</p>
                                        <p style={{ margin: '0 0 15px 0', fontSize: '0.85rem', color: '#666' }}>Lectures Conducted: <strong>{stat.totalConducted}</strong></p>
                                        <button onClick={() => downloadCSV(stat)} style={{ width: '100%', padding: '10px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
                                            📥 Download .CSV Report
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* SUB-VIEW 4: STATISTICS */}
                        {attendanceView === 'stats' && (
                            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                                    <h3 style={{ margin: 0, color: '#002147' }}>Student Attendance Overview</h3>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        <select value={attendanceSectionFilter} onChange={(e) => setAttendanceSectionFilter(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd', outline: 'none', fontWeight: 'bold' }}>
                                            <option value="ALL">All Sections</option>
                                            {availableSections.map(s => <option key={s} value={s}>Section {s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                                                <th style={{ padding: '12px' }}>Registration No.</th>
                                                <th style={{ padding: '12px' }}>Name</th>
                                                <th style={{ padding: '12px' }}>Section</th>
                                                <th style={{ padding: '12px', textAlign: 'right' }}>Overall Att %</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {roster.filter(s => attendanceSectionFilter === 'ALL' || s.section === attendanceSectionFilter).map(student => {
                                                const pct = getStudentAttendance(student.registration_number, 'ALL', attendanceSectionFilter);
                                                return (
                                                    <tr key={student.registration_number} style={{ borderBottom: '1px solid #eee' }}>
                                                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{student.registration_number}</td>
                                                        <td style={{ padding: '12px' }}>{student.student_name}</td>
                                                        <td style={{ padding: '12px' }}>{student.section}</td>
                                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: pct > 75 ? '#28a745' : '#dc3545' }}>
                                                            {pct}%
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
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

            {/* ATTENDANCE SHEET MODAL */}
            {activeAttendanceLecture && (
                <AttendanceSheet 
                    lecture={activeAttendanceLecture} 
                    profile={{ name: profile.name, isTeacher: true, section: activeAttendanceLecture.section, semester: activeAttendanceLecture.semester }}
                    existingSession={activeAttendanceLecture.attendanceSession}
                    onClose={(didUpdate) => {
                        setActiveAttendanceLecture(null);
                        if (didUpdate) fetchProfileAndSchedule(profile.name);
                    }} 
                />
            )}

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
                                <button type="submit" style={{ flex: 1, padding: '12px', background: '#F2A900', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* BASE MODAL */}
            {isBaseModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '15px', boxSizing: 'border-box', overflowY: 'auto' }}>
                    <div style={{ background: 'white', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0 }}>{baseForm.id ? 'Edit Base Lecture' : 'Add New Lecture'}</h3>
                        <form onSubmit={submitBaseSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {isManualSemester ? <input type="text" placeholder="Semester (e.g. Spring 2026)..." required value={baseForm.semester} onChange={(e) => setBaseForm({...baseForm, semester: e.target.value})} style={inputStyle} /> : <select required value={baseForm.semester} onChange={(e) => { if (e.target.value === 'MANUAL') { setIsManualSemester(true); setBaseForm({...baseForm, semester: ''}); } else setBaseForm({...baseForm, semester: e.target.value}); }} style={inputStyle}><option value="" disabled>-- Select Semester --</option>{availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}<option value="MANUAL">+ Add Manually</option></select>}
                            {isManualSection ? <input type="text" placeholder="Section (e.g. 1E)..." required value={baseForm.section} onChange={(e) => setBaseForm({...baseForm, section: e.target.value})} style={inputStyle} /> : <select required value={baseForm.section} onChange={(e) => { if (e.target.value === 'MANUAL') { setIsManualSection(true); setBaseForm({...baseForm, section: ''}); } else setBaseForm({...baseForm, section: e.target.value}); }} style={inputStyle}><option value="" disabled>-- Select Section --</option>{availableSections.map(s => <option key={s} value={s}>{s}</option>)}<option value="MANUAL">+ Add Manually</option></select>}
                            {isManualCourse ? <input type="text" placeholder="Subject Name..." required value={baseForm.course} onChange={(e) => setBaseForm({...baseForm, course: e.target.value})} style={inputStyle} /> : <select required value={baseForm.course} onChange={(e) => { if (e.target.value === 'MANUAL') { setIsManualCourse(true); setBaseForm({...baseForm, course: ''}); } else setBaseForm({...baseForm, course: e.target.value}); }} style={inputStyle}><option value="" disabled>-- Select Subject --</option>{availableCourses.map(c => <option key={c} value={c}>{c}</option>)}<option value="MANUAL">+ Add Manually</option></select>}
                            {isManualRoom ? <input type="text" placeholder="Room Name (e.g. 101)..." required value={baseForm.room} onChange={(e) => setBaseForm({...baseForm, room: e.target.value})} style={inputStyle} /> : <select required value={baseForm.room} onChange={(e) => { if (e.target.value === 'MANUAL') { setIsManualRoom(true); setBaseForm({...baseForm, room: ''}); } else setBaseForm({...baseForm, room: e.target.value}); }} style={inputStyle}><option value="" disabled>-- Select Room --</option>{availableRooms.map(r => <option key={r} value={r}>{r}</option>)}<option value="MANUAL">+ Add Manually</option></select>}
                            <select required value={baseForm.day} onChange={(e) => setBaseForm({...baseForm, day: e.target.value})} style={inputStyle}>{days.map(d => <option key={d} value={d}>{d}</option>)}</select>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <select value={baseForm.start_time} onChange={(e) => setBaseForm({...baseForm, start_time: e.target.value})} style={{...inputStyle, flex: 1}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                <select value={baseForm.end_time} onChange={(e) => setBaseForm({...baseForm, end_time: e.target.value})} style={{...inputStyle, flex: 1}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => setIsBaseModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#eee', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', background: '#F2A900', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
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
const subTabStyle = (isActive) => ({ flex: 1, padding: '10px', background: isActive ? '#fff' : 'transparent', color: isActive ? '#002147' : '#555', border: isActive ? '1px solid #ddd' : '1px solid transparent', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', whiteSpace: 'nowrap' });
const toastStyle = { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', color: 'white', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', transition: 'all 0.3s ease', zIndex: 9999, fontWeight: 'bold', fontSize: '0.95rem' };
