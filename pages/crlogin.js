import { useEffect, useState, useRef } from 'react'; 
import Head from 'next/head';
import { supabase } from '../lib/supabase';
import AttendanceSheet from '../components/AttendanceSheet';

export default function Dashboard() {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [schedule, setSchedule] = useState([]); 
    const [baseSchedule, setBaseSchedule] = useState([]); 
    const [roster, setRoster] = useState([]); 
    const [loading, setLoading] = useState(true);
    
    // --- GATEKEEPER STATE ---
    const [isPendingApproval, setIsPendingApproval] = useState(false);

    // --- RESPONSIVE & SIDEBAR STATES ---
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // --- DROPDOWN STATES ---
    const [availableRooms, setAvailableRooms] = useState([]);
    const [allDepartmentRooms, setAllDepartmentRooms] = useState([]); 
    const [availableCourses, setAvailableCourses] = useState([]);
    const [availableTeachers, setAvailableTeachers] = useState([]);
    const [teacherCourseMap, setTeacherCourseMap] = useState({}); 

    // --- TOGGLE STATES FOR MANUAL ENTRY ---
    const [isManualCourse, setIsManualCourse] = useState(false);
    const [isManualTeacher, setIsManualTeacher] = useState(false);
    const [isManualRoom, setIsManualRoom] = useState(false); 

    // --- TAB & UI STATES ---
    const [activeTab, setActiveTab] = useState('weekly'); 
    
    const [selectedDay, setSelectedDay] = useState(() => {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        return ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].includes(today) ? today : "MON";
    });
    
    const [expandedLectureId, setExpandedLectureId] = useState(null);

    // --- ATTENDANCE STATES ---
    const [attendanceView, setAttendanceView] = useState('mark'); 
    const [activeAttendanceLecture, setActiveAttendanceLecture] = useState(null);
    const [attendanceStats, setAttendanceStats] = useState([]); 
    const [allSessionsData, setAllSessionsData] = useState([]); 
    const [attendanceSubjectFilter, setAttendanceSubjectFilter] = useState('ALL'); 

    // --- STUDENT MANAGEMENT STATE ---
    const [newStudent, setNewStudent] = useState({ name: '', roll: '' });
    const fileInputRef = useRef(null);

    // --- ANNOUNCEMENT STATES ---
    const [announcements, setAnnouncements] = useState([]);
    const [editAnnId, setEditAnnId] = useState(null);
    const [oldAnnMsg, setOldAnnMsg] = useState('');
    const [announcementForm, setAnnouncementForm] = useState({ type: 'assignment', subject: '', lecture_selector: '', deadline_date: '', deadline_time: '8:00 AM', topics: '', details: '' });
    const [upcomingLectures, setUpcomingLectures] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const notifiedDeadlines = useRef(new Set()); 

    // --- MODAL STATES ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [newDate, setNewDate] = useState('');
    const [newStartTime, setNewStartTime] = useState('8:00 AM');
    const [newEndTime, setNewEndTime] = useState('9:30 AM');
    const [newRoom, setNewRoom] = useState('');

    const [isBaseModalOpen, setIsBaseModalOpen] = useState(false);
    const [baseForm, setBaseForm] = useState({ id: null, course: '', teacher: '', room: '', day: 'MON', start_time: '8:00 AM', end_time: '9:30 AM' });

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

    // --- WINDOW RESIZE LISTENER ---
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = windowWidth < 768;

    useEffect(() => {
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchProfileAndSchedule(session.user.id);
            else window.location.href = '/login';
        });

        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);

            announcements.forEach(ann => {
                if (ann.type === 'assignment' && ann.deadline_date && ann.deadline_time) {
                    const deadlineDate = new Date(ann.deadline_date);
                    const deadlineMins = parseTime(ann.deadline_time);
                    deadlineDate.setHours(Math.floor(deadlineMins / 60), deadlineMins % 60, 0, 0);
                    
                    const diffMins = Math.floor((deadlineDate - now) / 60000);
                    
                    if (diffMins <= 241 && diffMins >= 239 && !notifiedDeadlines.current.has(ann.id)) {
                        notifiedDeadlines.current.add(ann.id);
                        supabase.from('notifications').insert([{ 
                            message: `⏰ DEADLINE ALERT: Only 4 hours left for ${ann.subject} Assignment (${ann.topics}).` 
                        }]).then();
                        
                        if (Notification.permission === "granted") {
                            new Notification("Assignment Deadline Approaching!", { body: `4 hours left for ${ann.subject}` });
                        }
                    }
                }
            });
        }, 60000);

        return () => clearInterval(timer);
    }, [announcements]);

    useEffect(() => {
        if (!profile || !profile.is_approved) return; 
        const channel = supabase
            .channel('cr-realtime-updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
                const newMsg = payload.new.message;
                if (newMsg.includes(profile.section) && Notification.permission === "granted") {
                    new Notification("IUB Update Alert", { body: newMsg, icon: "/icon.png" });
                }
            }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [profile]);

    useEffect(() => {
        if(announcementForm.subject && announcementForm.subject !== 'General') {
            const relatedLectures = schedule.filter(c => c.course === announcementForm.subject);
            setUpcomingLectures(relatedLectures);
        } else {
            setUpcomingLectures([]);
        }
    }, [announcementForm.subject, schedule]);

    const fetchProfileAndSchedule = async (userId) => {
        const { data: profileData } = await supabase.from('cr_profiles').select('*').eq('id', userId).single();
        
        if (profileData) {
            setProfile(profileData);
            
            if (profileData.is_approved === false) {
                setIsPendingApproval(true);
                setLoading(false);
                return; 
            }

            // 1. Fetch Students using strict session & section
            const { data: rosterData } = await supabase.from('students')
                .select('*')
                .eq('session', profileData.session)
                .eq('section', profileData.section)
                .order('registration_number');
            setRoster(rosterData || []);

            // 2. Fetch Base Schedule using strict session & section
            const { data: scheduleData } = await supabase.from('base_schedule')
                .select('*')
                .eq('session', profileData.session)
                .eq('section', profileData.section);
            setBaseSchedule(scheduleData || []);
            
            const { data: allBaseSchedules } = await supabase.from('base_schedule').select('room, teacher, course');
            if (allBaseSchedules) {
                const deptRooms = [...new Set(allBaseSchedules.map(x => x.room))].filter(Boolean).sort();
                setAllDepartmentRooms(deptRooms);
                
                const tMap = {};
                allBaseSchedules.forEach(bs => {
                    if (bs.teacher && bs.course) tMap[bs.teacher] = bs.course;
                });
                setTeacherCourseMap(tMap);
            }
            
            // 3. Fetch Announcements using strict session & section
            const { data: annData } = await supabase.from('class_announcements')
                .select('*')
                .eq('session', profileData.session)
                .eq('section', profileData.section)
                .order('created_at', { ascending: false });
            setAnnouncements(annData || []);

            if (scheduleData) {
                setAvailableRooms([...new Set(scheduleData.map(x => x.room))].filter(Boolean).sort());
                setAvailableCourses([...new Set(scheduleData.map(x => x.course))].filter(Boolean).sort());
                setAvailableTeachers([...new Set(scheduleData.map(x => x.teacher))].filter(Boolean).sort());
            }

            const baseIds = scheduleData ? scheduleData.map(s => s.id) : [];
            const [exceptionsRes, sessionsRes, recordsRes] = await Promise.all([
                supabase.from('schedule_exceptions').select('*'),
                supabase.from('attendance_sessions').select('*').in('base_schedule_id', baseIds),
                supabase.from('attendance_records').select('*')
            ]);

            const exceptionsData = exceptionsRes.data || [];
            const allSessions = sessionsRes.data || [];
            const allRecords = recordsRes.data || [];

            const sessionsWithRecords = allSessions.map(s => ({
                ...s,
                course: scheduleData.find(b => b.id === s.base_schedule_id)?.course,
                records: allRecords.filter(r => r.session_id === s.id)
            }));
            
            setAllSessionsData(sessionsWithRecords); 

            const mergedSchedule = (scheduleData || []).map(cls => {
                const targetDate = getDateForCurrentWeekDay(cls.day);
                const exception = exceptionsData.find(ex => ex.base_schedule_id === cls.id && ex.exception_date === targetDate);
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

            const uniqueSubjects = [...new Set((scheduleData || []).map(s => s.course))];

            const stats = uniqueSubjects.map(subject => {
                const subjectBaseIds = scheduleData.filter(s => s.course === subject).map(s => s.id);
                const subjectSessions = sessionsWithRecords.filter(s => subjectBaseIds.includes(s.base_schedule_id));
                
                let totalRecords = 0;
                let presentRecords = 0;
                
                subjectSessions.forEach(sess => {
                    sess.records.forEach(rec => {
                        totalRecords++;
                        if (rec.status === 'Present' || rec.status === 'Leave') {
                            presentRecords++;
                        }
                    });
                });

                const percentage = totalRecords === 0 ? 0 : Math.round((presentRecords / totalRecords) * 100);
                return { subject, totalConducted: subjectSessions.length, percentage, sessions: subjectSessions };
            });

            setAttendanceStats(stats);
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    const getStudentAttendance = (studentReg, subjectFilter) => {
        let present = 0, total = 0;
        allSessionsData.forEach(session => {
            if (subjectFilter !== 'ALL' && session.course !== subjectFilter) return;
            const record = session.records.find(r => r.student_id === studentReg);
            if (record) {
                total++;
                if (record.status === 'Present' || record.status === 'Leave') present++;
            }
        });
        return total === 0 ? 0 : Math.round((present / total) * 100);
    };

    const handleEditAnnouncement = (ann) => {
        setEditAnnId(ann.id);
        setAnnouncementForm({
            type: ann.type,
            subject: ann.subject,
            lecture_selector: 'manual',
            deadline_date: ann.deadline_date || '',
            deadline_time: ann.deadline_time || '8:00 AM',
            topics: ann.topics,
            details: ann.details
        });
        
        const oldMsg = ann.type === 'assignment' 
            ? `📢 NEW ASSIGNMENT: ${ann.subject} - ${ann.topics}. Due: ${ann.deadline_date}`
            : `📢 MESSAGE: ${ann.topics} - Section ${profile.section}`;
        setOldAnnMsg(oldMsg);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const submitAnnouncement = async (e) => {
        e.preventDefault();

        const payload = {
            session: profile.session, 
            section: profile.section,
            type: announcementForm.type,
            subject: announcementForm.subject,
            deadline_date: announcementForm.type === 'assignment' ? announcementForm.deadline_date : null,
            deadline_time: announcementForm.type === 'assignment' ? announcementForm.deadline_time : null,
            topics: announcementForm.topics,
            details: announcementForm.details
        };

        if (editAnnId) {
            const { error } = await supabase.from('class_announcements').update(payload).eq('id', editAnnId);
            if (error) return alert("Failed to update: " + error.message);

            const notifMsg = payload.type === 'assignment' 
                ? `📢 UPDATED ASSIGNMENT: ${payload.subject} - ${payload.topics}. Due: ${payload.deadline_date}`
                : `📢 UPDATED MESSAGE: ${payload.topics} - Section ${profile.section}`;
                
            await supabase.from('notifications').update({ message: notifMsg }).eq('message', oldAnnMsg);
            alert("Announcement updated and class notified!");
        } else {
            const { error } = await supabase.from('class_announcements').insert([payload]);
            if (error) return alert("Failed to add announcement: " + error.message);

            const notifMsg = payload.type === 'assignment' 
                ? `📢 NEW ASSIGNMENT: ${payload.subject} - ${payload.topics}. Due: ${payload.deadline_date}`
                : `📢 MESSAGE: ${payload.topics} - Section ${profile.section}`;
                
            await supabase.from('notifications').insert([{ message: notifMsg }]);
            alert("Announcement posted and class notified!");
        }

        setEditAnnId(null);
        setAnnouncementForm({ type: 'assignment', subject: '', lecture_selector: '', deadline_date: '', deadline_time: '8:00 AM', topics: '', details: '' });
        fetchProfileAndSchedule(session.user.id);
    };

    const downloadCSV = (stat) => {
        if (stat.sessions.length === 0) return alert("No attendance recorded for this subject yet.");

        let csv = "Registration Number,Name";
        const sortedSessions = stat.sessions.sort((a,b) => new Date(a.session_date) - new Date(b.session_date));
        
        sortedSessions.forEach(s => { csv += `,${s.session_date}`; });
        csv += ",Overall %\n";

        roster.forEach(student => {
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
        a.download = `${stat.subject}_Attendance.csv`;
        a.click();
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('students').insert([{ student_name: newStudent.name, registration_number: newStudent.roll, session: profile.session, section: profile.section }]);
        if (error) alert("Error: " + error.message);
        else { setNewStudent({ name: '', roll: '' }); fetchProfileAndSchedule(session.user.id); }
    };

    const handleDeleteStudent = async (regNum) => {
        if (!window.confirm("Remove this student?")) return;
        await supabase.from('students').delete().eq('registration_number', regNum);
        fetchProfileAndSchedule(session.user.id);
    };

    const handleCSVUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                const rows = text.split('\n').map(r => r.split(','));
                const payloads = [];
                
                let startIndex = rows[0].join('').toLowerCase().includes('regist') || rows[0].join('').toLowerCase().includes('roll') ? 1 : 0;
                for(let i = startIndex; i < rows.length; i++) {
                    const row = rows[i];
                    if (row.length >= 2) {
                        const reg = row[0].trim();
                        const name = row[1].trim();
                        if (reg && name) { payloads.push({ student_name: name, registration_number: reg, session: profile.session, section: profile.section }); }
                    }
                }

                if (payloads.length > 0) {
                    const { error } = await supabase.from('students').insert(payloads);
                    if (error) alert("Error importing: " + error.message);
                    else { alert(`Successfully imported ${payloads.length} students!`); fetchProfileAndSchedule(session.user.id); }
                } else { alert("No valid data found in CSV."); }
            } catch (err) { alert("Failed to parse CSV."); }
            e.target.value = null; 
        };
        reader.readAsText(file);
    };

    const handleConfirmClass = async (e, classId, courseName, clsDay) => {
        e.stopPropagation(); 
        const targetDate = getDateForCurrentWeekDay(clsDay);
        await supabase.from('schedule_exceptions').insert([{ base_schedule_id: classId, exception_date: targetDate, status: 'confirmed', cancelled_by: session.user.id }]);
        await supabase.from('notifications').insert([{ message: `✅ Confirmed: ${courseName} for Section ${profile.section} will be held on ${targetDate}.` }]);
        fetchProfileAndSchedule(session.user.id); 
    };

    const handleCancelClass = async (e, classId, courseName, clsDay) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to CANCEL ${courseName}?`)) return;
        const targetDate = getDateForCurrentWeekDay(clsDay);
        await supabase.from('schedule_exceptions').insert([{ base_schedule_id: classId, exception_date: targetDate, status: 'cancelled', cancelled_by: session.user.id }]);
        await supabase.from('notifications').insert([{ message: `🚨 Cancelled: ${courseName} for Section ${profile.section} on ${targetDate} is cancelled.` }]);
        fetchProfileAndSchedule(session.user.id);
    };

    const handleUndoException = async (e, classId, actionType, courseName, clsDay) => {
        e.stopPropagation();
        const targetDate = getDateForCurrentWeekDay(clsDay);
        await supabase.from('schedule_exceptions').delete().match({ base_schedule_id: classId, exception_date: targetDate });

        if (actionType === 'cancelled') await supabase.from('notifications').delete().eq('message', `🚨 Cancelled: ${courseName} for Section ${profile.section} on ${targetDate} is cancelled.`);
        else if (actionType === 'confirmed') await supabase.from('notifications').delete().eq('message', `✅ Confirmed: ${courseName} for Section ${profile.section} will be held on ${targetDate}.`);
        else if (actionType === 'rescheduled') await supabase.from('notifications').delete().ilike('message', `🕒 Rescheduled: ${courseName} for Section ${profile.section}%`);

        fetchProfileAndSchedule(session.user.id);
    };

    const openEditModal = (e, cls) => {
        e.stopPropagation(); setEditingClass(cls); setNewDate(new Date().toLocaleDateString('en-CA'));
        setNewStartTime(convertTo12Hour(cls.start_time)); setNewEndTime(convertTo12Hour(cls.end_time));
        setNewRoom(cls.room); setIsEditModalOpen(true);
    };

    const submitReschedule = async (e) => {
        e.preventDefault();
        const targetDate = getDateForCurrentWeekDay(editingClass.day);
        await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: editingClass.id, exception_date: targetDate, status: 'rescheduled',
            new_start_time: newStartTime, new_end_time: newEndTime, new_room: newRoom, cancelled_by: session.user.id
        }]);
        await supabase.from('notifications').insert([{ message: `🕒 Rescheduled: ${editingClass.course} for Section ${profile.section} moved to Room ${newRoom} (${newStartTime} - ${newEndTime}) on ${targetDate}.` }]);
        alert(`Class rescheduled!`); setIsEditModalOpen(false); fetchProfileAndSchedule(session.user.id);
    };

    const openBaseModal = (cls = null) => {
        if (cls) {
            setBaseForm({ ...cls, start_time: convertTo12Hour(cls.start_time), end_time: convertTo12Hour(cls.end_time) });
            setIsManualCourse(!availableCourses.includes(cls.course)); setIsManualTeacher(!availableTeachers.includes(cls.teacher)); setIsManualRoom(!allDepartmentRooms.includes(cls.room));
        } else {
            setBaseForm({ id: null, course: '', teacher: '', room: '', day: 'MON', start_time: '8:00 AM', end_time: '9:30 AM' });
            setIsManualCourse(false); setIsManualTeacher(false); setIsManualRoom(false);
        }
        setIsBaseModalOpen(true);
    };

    const submitBaseSchedule = async (e) => {
        e.preventDefault(); setIsBaseModalOpen(false); 
        const payload = { course: baseForm.course, teacher: baseForm.teacher, room: baseForm.room, day: baseForm.day, start_time: baseForm.start_time, end_time: baseForm.end_time, session: profile.session, section: profile.section };
        if (baseForm.id) await supabase.from('base_schedule').update(payload).eq('id', baseForm.id);
        else await supabase.from('base_schedule').insert([payload]);
        fetchProfileAndSchedule(session.user.id);
    };

    const deleteBaseLecture = async (id, courseName) => {
        if (!window.confirm(`Permanently delete ${courseName}? This cannot be undone.`)) return;
        await supabase.from('base_schedule').delete().eq('id', id);
        fetchProfileAndSchedule(session.user.id);
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>Loading Dashboard...</div>;
    if (!session) return null;

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

    const filteredWeeklySchedule = schedule
        .filter(cls => cls.day === selectedDay)
        .sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));
    
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const currentMins = new Date().getHours() * 60 + new Date().getMinutes();

    const visibleTabs = isMobile 
        ? ['weekly', 'attendance', 'announcements'] 
        : ['weekly', 'permanent', 'students', 'attendance', 'announcements'];

    return (
        <div style={{ background: '#f0f2f5', minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
            <Head>
                <title>CR Dashboard | IUB</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
            </Head>

            <header style={{ background: '#002147', color: '#F2A900', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={() => setIsSidebarOpen(true)} style={{ background: 'transparent', border: 'none', color: '#F2A900', fontSize: '1.8rem', cursor: 'pointer', padding: 0 }}>
                        ☰
                    </button>
                    <div style={{ fontWeight: '900', fontSize: '1.2rem' }}>🎓 CR Dashboard</div>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <a href="/notifications" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>🔔 Notifications</a>
                    <button onClick={handleLogout} style={{ background: '#F2A900', color: '#002147', border: 'none', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Logout</button>
                </div>
            </header>

            {isSidebarOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 3000 }} onClick={() => setIsSidebarOpen(false)}>
                    <div style={{ width: '280px', height: '100vh', background: '#002147', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', transform: 'translateX(0)', transition: '0.3s ease-in-out' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '10px' }}>
                            <span style={{ fontWeight: 'bold', color: '#F2A900', fontSize: '1.2rem' }}>Menu</span>
                            <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
                        </div>
                        <button onClick={() => { setActiveTab('weekly'); setIsSidebarOpen(false); }} style={sidebarBtnStyle(activeTab === 'weekly')}>📅 Weekly Timetable</button>
                        <button onClick={() => { setActiveTab('permanent'); setIsSidebarOpen(false); }} style={sidebarBtnStyle(activeTab === 'permanent')}>🏛️ Base Schedule</button>
                        <button onClick={() => { setActiveTab('students'); setIsSidebarOpen(false); }} style={sidebarBtnStyle(activeTab === 'students')}>👥 Manage Students</button>
                        <button onClick={() => { setActiveTab('attendance'); setIsSidebarOpen(false); }} style={sidebarBtnStyle(activeTab === 'attendance')}>📝 Attendance</button>
                        <button onClick={() => { setActiveTab('announcements'); setIsSidebarOpen(false); }} style={sidebarBtnStyle(activeTab === 'announcements')}>📢 Announcements</button>
                    </div>
                </div>
            )}

            <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 15px' }}>
                
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '20px', borderLeft: '5px solid #F2A900', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                        <h2 style={{ margin: '0 0 10px 0', color: '#002147', fontSize: '1.5rem' }}>Welcome, {profile?.first_name} {profile?.last_name}</h2>
                        <p style={{ margin: 0, color: '#555', fontSize: '0.95rem' }}>Managing: <strong>{profile?.session} | Section {profile?.section}</strong></p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {visibleTabs.includes('weekly') && <button onClick={() => setActiveTab('weekly')} style={tabStyle(activeTab === 'weekly')}>📅 Weekly Timetable</button>}
                    {visibleTabs.includes('permanent') && <button onClick={() => setActiveTab('permanent')} style={tabStyle(activeTab === 'permanent')}>🏛️ Base Schedule</button>}
                    {visibleTabs.includes('students') && <button onClick={() => setActiveTab('students')} style={tabStyle(activeTab === 'students')}>👥 Manage Students</button>}
                    {visibleTabs.includes('attendance') && <button onClick={() => setActiveTab('attendance')} style={tabStyle(activeTab === 'attendance')}>📝 Attendance</button>}
                    {visibleTabs.includes('announcements') && <button onClick={() => setActiveTab('announcements')} style={tabStyle(activeTab === 'announcements')}>📢 Announcements</button>}
                </div>

                {/* ================= WEEKLY SCHEDULE TAB ================= */}
                {activeTab === 'weekly' && (
                    <div>
                        <div style={{ display: 'flex', overflowX: 'auto', gap: '10px', marginBottom: '20px', paddingBottom: '10px', scrollbarWidth: 'none' }}>
                            {days.map(day => (
                                <button key={day} onClick={() => setSelectedDay(day)}
                                    style={{ 
                                        padding: '10px 20px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', border: 'none',
                                        background: selectedDay === day ? '#002147' : '#e9ecef', color: selectedDay === day ? '#F2A900' : '#495057', boxShadow: selectedDay === day ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
                                    }}>
                                    {day}
                                </button>
                            ))}
                        </div>
                        
                        {filteredWeeklySchedule.length === 0 ? (
                            <p style={{ textAlign: 'center', padding: '20px', background: 'white', borderRadius: '8px' }}>No classes scheduled for {selectedDay}.</p>
                        ) : (
                            filteredWeeklySchedule.map((cls) => (
                                <div key={cls.id} onClick={() => setExpandedLectureId(expandedLectureId === cls.id ? null : cls.id)}
                                     style={{ 
                                        background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '15px', cursor: 'pointer', transition: '0.2s',
                                        borderLeft: cls.isRescheduled ? '5px solid #007bff' : cls.isConfirmed ? '5px solid #28a745' : '5px solid transparent', opacity: cls.isCancelled ? 0.6 : 1 
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: expandedLectureId === cls.id ? '1px solid #eee' : 'none', paddingBottom: expandedLectureId === cls.id ? '10px' : '0', marginBottom: expandedLectureId === cls.id ? '10px' : '0', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: cls.isCancelled ? 'red' : '#000', textDecoration: cls.isCancelled ? 'line-through' : 'none' }}>
                                                {cls.course}
                                            </div>
                                            <div style={{ color: '#666', fontSize: '0.9rem' }}>{cls.teacher} | Room {cls.room}</div>
                                            
                                            {cls.attendanceSession && (
                                                <div style={{ display: 'inline-block', marginTop: '5px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', 
                                                    background: cls.attendanceSession.status === 'approved' ? '#d4edda' : '#fff3cd', 
                                                    color: cls.attendanceSession.status === 'approved' ? '#155724' : '#856404' }}>
                                                    {cls.attendanceSession.status === 'approved' ? '✓ Attendance Approved' : '⏳ Attendance Pending'}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#002147', fontWeight: '900' }}>{cls.day}</div>
                                            <div style={{ color: '#F2A900', fontWeight: 'bold' }}>{convertTo12Hour(cls.start_time)} - {convertTo12Hour(cls.end_time)}</div>
                                        </div>
                                    </div>

                                    {expandedLectureId === cls.id && (
                                        <div style={{ marginTop: '15px', animation: 'fadeIn 0.3s ease-in-out' }}>
                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                {cls.isCancelled ? (
                                                    <button onClick={(e) => handleUndoException(e, cls.id, 'cancelled', cls.course, cls.day)} style={btnStyle('#6c757d')}>↩️ Undo Cancellation</button>
                                                ) : cls.isConfirmed ? (
                                                    <button onClick={(e) => handleUndoException(e, cls.id, 'confirmed', cls.course, cls.day)} style={btnStyle('#6c757d')}>↩️ Mark Not Confirm</button>
                                                ) : cls.isRescheduled ? (
                                                    <button onClick={(e) => handleUndoException(e, cls.id, 'rescheduled', cls.course, cls.day)} style={btnStyle('#6c757d')}>↩️ Undo Reschedule</button>
                                                ) : (
                                                    <>
                                                        <button onClick={(e) => handleConfirmClass(e, cls.id, cls.course, cls.day)} style={btnStyle('#28a745')}>✅ Will Held</button>
                                                        <button onClick={(e) => openEditModal(e, cls)} style={btnStyle('#007bff')}>🕒 Edit Timing</button>
                                                        <button onClick={(e) => handleCancelClass(e, cls.id, cls.course, cls.day)} style={btnStyle('#dc3545')}>❌ Cancel Class</button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ================= SPLIT ATTENDANCE TAB ================= */}
                {activeTab === 'attendance' && (
                    <div>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', padding: '5px', background: '#e9ecef', borderRadius: '8px' }}>
                            <button onClick={() => setAttendanceView('mark')} style={subTabStyle(attendanceView === 'mark')}>✅ Mark Attendance</button>
                            <button onClick={() => setAttendanceView('download')} style={subTabStyle(attendanceView === 'download')}>📥 Download CSV</button>
                            <button onClick={() => setAttendanceView('stats')} style={subTabStyle(attendanceView === 'stats')}>📊 Statistics</button>
                        </div>

                        {/* SUB-VIEW 1: MARK ATTENDANCE */}
                        {attendanceView === 'mark' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                                {attendanceStats.map(stat => {
                                    const todayClass = schedule.find(c => c.course === stat.subject && c.day === currentDay && !c.isCancelled);
                                    let isOngoing = false;
                                    let canEdit = false;
                                    let todaySession = null;

                                    if (todayClass) {
                                        const startMins = parseTime(todayClass.start_time);
                                        const endMins = parseTime(todayClass.end_time);
                                        isOngoing = currentMins >= startMins && currentMins <= endMins;
                                        todaySession = todayClass.attendanceSession;
                                        
                                        if (todaySession) {
                                            const sessionTime = new Date(todaySession.created_at).getTime();
                                            const now = new Date().getTime();
                                            const diffMins = (now - sessionTime) / 60000;
                                            if (diffMins <= 30 && todaySession.status === 'pending') {
                                                canEdit = true;
                                            }
                                        }
                                    }

                                    if (!todayClass) return null; 

                                    return (
                                        <div key={`mark-${stat.subject}`} style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderTop: '4px solid #28a745' }}>
                                            <h3 style={{ margin: '0 0 10px 0', color: '#002147', fontSize: '1.2rem' }}>{stat.subject}</h3>
                                            <p style={{ margin: '0 0 15px 0', fontSize: '0.85rem', color: '#666' }}>{todayClass.start_time} - {todayClass.end_time} | Room {todayClass.room}</p>
                                            
                                            {isOngoing && !todaySession && (
                                                <button onClick={() => setActiveAttendanceLecture(todayClass)} style={{ width: '100%', padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', animation: 'pulse 2s infinite' }}>
                                                    📝 Mark Attendance (Ongoing)
                                                </button>
                                            )}
                                            {todaySession && canEdit && (
                                                <button onClick={() => setActiveAttendanceLecture(todayClass)} style={{ width: '100%', padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
                                                    ✏️ Edit Attendance (Time Remaining)
                                                </button>
                                            )}
                                            {todaySession && !canEdit && (
                                                <button disabled style={{ width: '100%', padding: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'not-allowed', opacity: 0.8 }}>
                                                    🔒 Locked ({todaySession.status === 'approved' ? 'Approved' : 'Pending Teacher'})
                                                </button>
                                            )}
                                            {!isOngoing && !todaySession && (
                                                <div style={{ textAlign: 'center', padding: '10px', color: '#856404', background: '#fff3cd', borderRadius: '5px', fontSize: '0.9rem' }}>
                                                    Not currently active.
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {attendanceStats.filter(stat => schedule.find(c => c.course === stat.subject && c.day === currentDay && !c.isCancelled)).length === 0 && (
                                    <p style={{textAlign: 'center', width: '100%', padding: '20px', background: 'white', borderRadius: '8px'}}>No classes scheduled for today to mark attendance.</p>
                                )}
                            </div>
                        )}

                        {/* SUB-VIEW 2: DOWNLOAD CSV */}
                        {attendanceView === 'download' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
                                {attendanceStats.map(stat => (
                                    <div key={`dl-${stat.subject}`} style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderTop: '4px solid #17a2b8' }}>
                                        <h3 style={{ margin: '0 0 10px 0', color: '#002147', fontSize: '1.2rem' }}>{stat.subject}</h3>
                                        <p style={{ margin: '0 0 15px 0', fontSize: '0.85rem', color: '#666' }}>Lectures Conducted: <strong>{stat.totalConducted}</strong></p>
                                        <button onClick={() => downloadCSV(stat)} style={{ width: '100%', padding: '10px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
                                            📥 Download .CSV Report
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* SUB-VIEW 3: STATISTICS */}
                        {attendanceView === 'stats' && (
                            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                                    <h3 style={{ margin: 0, color: '#002147' }}>Student Attendance Overview</h3>
                                    <select value={attendanceSubjectFilter} onChange={(e) => setAttendanceSubjectFilter(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd', outline: 'none', fontWeight: 'bold' }}>
                                        <option value="ALL">All Subjects (Overall)</option>
                                        {availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                                                <th style={{ padding: '12px' }}>Registration Number</th>
                                                <th style={{ padding: '12px' }}>Name</th>
                                                <th style={{ padding: '12px', textAlign: 'right' }}>Attendance %</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {roster.map(student => {
                                                const pct = getStudentAttendance(student.registration_number, attendanceSubjectFilter);
                                                return (
                                                    <tr key={student.registration_number} style={{ borderBottom: '1px solid #eee' }}>
                                                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{student.registration_number}</td>
                                                        <td style={{ padding: '12px' }}>{student.student_name}</td>
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

                {/* ================= ANNOUNCEMENTS TAB ================= */}
                {activeTab === 'announcements' && (
                    <div>
                        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
                            <h3 style={{ marginTop: 0, color: '#002147', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                {editAnnId ? '✏️ Edit Announcement' : 'Publish Announcement'}
                            </h3>
                            <form onSubmit={submitAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <select value={announcementForm.type} onChange={(e) => setAnnouncementForm({...announcementForm, type: e.target.value})} style={{...inputStyle, flex: 1, fontWeight: 'bold'}}>
                                        <option value="assignment">📝 Assignment</option>
                                        <option value="message">📢 Simple Message</option>
                                    </select>
                                    <select required value={announcementForm.subject} onChange={(e) => {
                                        setAnnouncementForm({...announcementForm, subject: e.target.value, lecture_selector: ''});
                                    }} style={{...inputStyle, flex: 2}}>
                                        <option value="" disabled>-- Select Subject --</option>
                                        <option value="General">General / Off-Topic</option>
                                        {availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>

                                {announcementForm.type === 'assignment' && announcementForm.subject && (
                                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                                        <label style={{display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#002147', marginBottom: '8px'}}>Select Deadline</label>
                                        
                                        {upcomingLectures.length > 0 && announcementForm.subject !== 'General' && (
                                            <select 
                                                value={announcementForm.lecture_selector} 
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setAnnouncementForm({...announcementForm, lecture_selector: val});
                                                    if (val && val !== 'manual') {
                                                        const [d, t] = val.split('|');
                                                        setAnnouncementForm(prev => ({...prev, deadline_date: d, deadline_time: t}));
                                                    }
                                                }} 
                                                style={{...inputStyle, marginBottom: '10px'}}
                                            >
                                                <option value="" disabled>-- Select Upcoming Lecture Date --</option>
                                                {upcomingLectures.map(l => {
                                                    const dDate = getDateForCurrentWeekDay(l.day);
                                                    const timeFmt = convertTo12Hour(l.start_time);
                                                    return <option key={l.id} value={`${dDate}|${timeFmt}`}>{l.day} {dDate} (By {timeFmt})</option>;
                                                })}
                                                <option value="manual">➕ Provide Manual Date & Time</option>
                                            </select>
                                        )}

                                        {(announcementForm.lecture_selector === 'manual' || upcomingLectures.length === 0 || announcementForm.subject === 'General') && (
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <div style={{flex: 1}}>
                                                    <label style={{display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#666', marginBottom: '5px'}}>Manual Date</label>
                                                    <input type="date" required value={announcementForm.deadline_date} onChange={(e) => setAnnouncementForm({...announcementForm, deadline_date: e.target.value})} style={inputStyle} />
                                                </div>
                                                <div style={{flex: 1}}>
                                                    <label style={{display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#666', marginBottom: '5px'}}>Manual Time</label>
                                                    <select required value={announcementForm.deadline_time} onChange={(e) => setAnnouncementForm({...announcementForm, deadline_time: e.target.value})} style={inputStyle}>
                                                        {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                                        <option value="11:59 PM">11:59 PM (Midnight)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <input type="text" placeholder={announcementForm.type === 'assignment' ? "Assignment Topic (e.g. Chapter 4 Exercises)" : "Message Title"} required value={announcementForm.topics} onChange={(e) => setAnnouncementForm({...announcementForm, topics: e.target.value})} style={inputStyle} />
                                <textarea placeholder="Provide detailed instructions or message content here..." required value={announcementForm.details} onChange={(e) => setAnnouncementForm({...announcementForm, details: e.target.value})} style={{...inputStyle, minHeight: '100px', resize: 'vertical'}} />
                                
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {editAnnId && (
                                        <button type="button" onClick={() => { setEditAnnId(null); setAnnouncementForm({ type: 'assignment', subject: '', lecture_selector: '', deadline_date: '', deadline_time: '8:00 AM', topics: '', details: '' }); }} style={{ padding: '15px', background: '#ccc', color: '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}>
                                            Cancel Edit
                                        </button>
                                    )}
                                    <button type="submit" style={{ padding: '15px', background: '#002147', color: '#F2A900', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', flex: 2 }}>
                                        {editAnnId ? '💾 Update Announcement' : '🚀 Push to Entire Class'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px', marginBottom: '15px' }}>Active Announcements</h3>
                        {announcements.length === 0 ? <p style={{textAlign: 'center', background: 'white', padding: '20px', borderRadius: '8px'}}>No announcements yet.</p> : (
                            announcements.map(ann => {
                                let timeRemainingDisplay = null;
                                let isExpired = false;

                                if (ann.type === 'assignment' && ann.deadline_date && ann.deadline_time) {
                                    const deadlineDate = new Date(ann.deadline_date);
                                    const deadlineMins = parseTime(ann.deadline_time);
                                    deadlineDate.setHours(Math.floor(deadlineMins / 60), deadlineMins % 60, 0, 0);
                                    
                                    const diffMs = deadlineDate - currentTime;
                                    
                                    if (diffMs > 0) {
                                        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                        const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
                                        const mins = Math.floor((diffMs / 1000 / 60) % 60);
                                        timeRemainingDisplay = `⏳ ${days > 0 ? days + 'd ' : ''}${hours}h ${mins}m remaining`;
                                    } else {
                                        isExpired = true;
                                        timeRemainingDisplay = `❌ Deadline Passed`;
                                    }
                                }

                                return (
                                    <div key={ann.id} style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '15px', borderLeft: ann.type === 'assignment' ? '5px solid #F2A900' : '5px solid #007bff', opacity: isExpired ? 0.6 : 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', background: '#eee', padding: '3px 8px', borderRadius: '12px', color: '#555', textTransform: 'uppercase' }}>
                                                {ann.subject} • {ann.type}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#999' }}>{new Date(ann.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#000' }}>{ann.topics}</h4>
                                        <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#444', whiteSpace: 'pre-wrap' }}>{ann.details}</p>
                                        
                                        {ann.type === 'assignment' && (
                                            <div style={{ background: isExpired ? '#f8d7da' : '#fff3cd', color: isExpired ? '#721c24' : '#856404', padding: '10px', borderRadius: '5px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '5px' }}>
                                                <span>Due: {new Date(ann.deadline_date).toLocaleDateString()} at {ann.deadline_time}</span>
                                                <span>{timeRemainingDisplay}</span>
                                            </div>
                                        )}
                                        
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                            <button onClick={() => handleEditAnnouncement(ann)} style={{ ...btnStyle('#17a2b8'), padding: '5px 10px', fontSize: '0.75rem', width: 'auto', flex: 'none' }}>
                                                ✏️ Edit
                                            </button>
                                            <button onClick={async () => {
                                                if(window.confirm('Delete this announcement globally?')) {
                                                    await supabase.from('class_announcements').delete().eq('id', ann.id);
                                                    fetchProfileAndSchedule(session.user.id);
                                                }
                                            }} style={{ ...btnStyle('#dc3545'), padding: '5px 10px', fontSize: '0.75rem', width: 'auto', flex: 'none' }}>
                                                🗑️ Delete Post
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                )}

                {/* ================= PERMANENT SCHEDULE TAB ================= */}
                {activeTab === 'permanent' && (
                    <div>
                        {baseSchedule.length === 0 ? <p>No base schedule found.</p> : (
                            baseSchedule.sort((a, b) => a.day.localeCompare(b.day)).map((cls) => (
                                <div key={`base-${cls.id}`} style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#000' }}>{cls.course}</div>
                                            <div style={{ color: '#666', fontSize: '0.9rem' }}>{cls.teacher} | Room {cls.room}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#002147', fontWeight: '900' }}>{cls.day}</div>
                                            <div style={{ color: '#F2A900', fontWeight: 'bold' }}>{convertTo12Hour(cls.start_time)} - {convertTo12Hour(cls.end_time)}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        <button onClick={() => openBaseModal(cls)} style={btnStyle('#17a2b8')}>✏️ Edit Lecture</button>
                                        <button onClick={() => deleteBaseLecture(cls.id, cls.course)} style={btnStyle('#dc3545')}>🗑️ Delete Lecture</button>
                                    </div>
                                </div>
                            ))
                        )}
                        <button onClick={() => openBaseModal()} style={{ width: '100%', padding: '15px', background: '#002147', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', marginBottom: '30px' }}>➕ Add New Lecture</button>
                    </div>
                )}

                {/* ================= MANAGE STUDENTS TAB ================= */}
                {activeTab === 'students' && (
                    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: '#002147' }}>Add New Student</h3>
                            <div>
                                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} style={{ display: 'none' }} />
                                <button onClick={() => fileInputRef.current.click()} style={{ padding: '8px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>
                                    📥 Import CSV
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleAddStudent} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '25px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                            <input type="text" placeholder="Registration No (e.g. FA23-BSE-001)" required value={newStudent.roll} onChange={(e) => setNewStudent({...newStudent, roll: e.target.value})} style={{...inputStyle, flex: 1, minWidth: '150px'}} />
                            <input type="text" placeholder="Student Full Name" required value={newStudent.name} onChange={(e) => setNewStudent({...newStudent, name: e.target.value})} style={{...inputStyle, flex: 2, minWidth: '200px'}} />
                            <button type="submit" style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>➕ Add</button>
                        </form>

                        <h3 style={{ color: '#002147' }}>Class Roster ({roster.length} Students)</h3>
                        {roster.length === 0 ? <p>No students added yet.</p> : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                                            <th style={{ padding: '12px' }}>Registration Number</th>
                                            <th style={{ padding: '12px' }}>Name</th>
                                            <th style={{ padding: '12px', textAlign: 'center' }}>Att %</th>
                                            <th style={{ padding: '12px', textAlign: 'right' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {roster.map(student => {
                                            const pct = getStudentAttendance(student.registration_number, 'ALL');
                                            return (
                                                <tr key={student.registration_number} style={{ borderBottom: '1px solid #eee' }}>
                                                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{student.registration_number}</td>
                                                    <td style={{ padding: '12px' }}>{student.student_name}</td>
                                                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: pct > 75 ? '#28a745' : '#dc3545' }}>{pct}%</td>
                                                    <td style={{ padding: '12px', textAlign: 'right' }}>
                                                        <button onClick={() => handleDeleteStudent(student.registration_number)} style={{ padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODALS */}
            {activeAttendanceLecture && (
                <AttendanceSheet 
                    lecture={activeAttendanceLecture} 
                    profile={profile}
                    existingSession={activeAttendanceLecture.attendanceSession}
                    onClose={(didUpdate) => {
                        setActiveAttendanceLecture(null);
                        if (didUpdate) fetchProfileAndSchedule(session.user.id);
                    }} 
                />
            )}

            {/* TEMP EXCEPTION MODAL */}
            {isEditModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '15px', boxSizing: 'border-box' }}>
                    <div style={{ background: 'white', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '400px' }}>
                        <h3 style={{ marginTop: 0 }}>Reschedule Class (Temp)</h3>
                        <form onSubmit={submitReschedule} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <input type="date" required value={newDate} onChange={(e) => setNewDate(e.target.value)} style={inputStyle} />
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <select value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} style={{...inputStyle, flex: 1}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                <select value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} style={{...inputStyle, flex: 1}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                            </div>
                            <select required value={newRoom} onChange={(e) => {
                                if (e.target.value === 'MANUAL') {
                                    setIsManualRoom(true); setNewRoom('');
                                } else {
                                    setNewRoom(e.target.value);
                                }
                            }} style={inputStyle}>
                                <option value="" disabled>-- Select Dept Room --</option>
                                {allDepartmentRooms.map(r => <option key={`resch-${r}`} value={r}>{r}</option>)}
                                <option value="MANUAL">➕ Add Room Manually</option>
                            </select>
                            {isManualRoom && <input type="text" placeholder="Type Room Name Manually..." required value={newRoom} onChange={(e) => setNewRoom(e.target.value)} style={{...inputStyle, border: '2px solid #007bff'}} />}
                            
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => { setIsEditModalOpen(false); setIsManualRoom(false); }} style={{ flex: 1, padding: '12px', background: '#eee', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', background: '#F2A900', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* BASE MODAL */}
            {isBaseModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '15px', boxSizing: 'border-box' }}>
                    <div style={{ background: 'white', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '400px' }}>
                        <h3 style={{ marginTop: 0 }}>{baseForm.id ? 'Edit Base Lecture' : 'Add New Lecture'}</h3>
                        <form onSubmit={submitBaseSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {/* Course Dropdown */}
                            {isManualCourse ? <input type="text" placeholder="Subject Name..." required value={baseForm.course} onChange={(e) => setBaseForm({...baseForm, course: e.target.value})} style={{...inputStyle, border: '2px solid #007bff'}} /> : 
                            <select required value={baseForm.course} onChange={(e) => { 
                                if (e.target.value === 'MANUAL') { setIsManualCourse(true); setBaseForm({...baseForm, course: ''}); } 
                                else setBaseForm({...baseForm, course: e.target.value}); 
                            }} style={inputStyle}>
                                <option value="" disabled>-- Select Subject --</option>
                                {availableCourses.map(c => <option key={`bc-${c}`} value={c}>{c}</option>)}
                                <option value="MANUAL">➕ Add Manually</option>
                            </select>}

                            {/* Teacher Dropdown (Auto-fills Course) */}
                            {isManualTeacher ? <input type="text" placeholder="Teacher Name..." required value={baseForm.teacher} onChange={(e) => setBaseForm({...baseForm, teacher: e.target.value})} style={{...inputStyle, border: '2px solid #007bff'}} /> : 
                            <select required value={baseForm.teacher} onChange={(e) => { 
                                if (e.target.value === 'MANUAL') { setIsManualTeacher(true); setBaseForm({...baseForm, teacher: ''}); } 
                                else {
                                    const selectedTeacher = e.target.value;
                                    const autoCourse = teacherCourseMap[selectedTeacher];
                                    setBaseForm({...baseForm, teacher: selectedTeacher, course: autoCourse || baseForm.course});
                                }
                            }} style={inputStyle}>
                                <option value="" disabled>-- Select Teacher --</option>
                                {availableTeachers.map(t => <option key={`bt-${t}`} value={t}>{t}</option>)}
                                <option value="MANUAL">➕ Add Manually</option>
                            </select>}

                            {/* Room Dropdown (Shows all Dept Rooms) */}
                            {isManualRoom ? <input type="text" placeholder="Room Name..." required value={baseForm.room} onChange={(e) => setBaseForm({...baseForm, room: e.target.value})} style={{...inputStyle, border: '2px solid #007bff'}} /> : 
                            <select required value={baseForm.room} onChange={(e) => { 
                                if (e.target.value === 'MANUAL') { setIsManualRoom(true); setBaseForm({...baseForm, room: ''}); } 
                                else setBaseForm({...baseForm, room: e.target.value}); 
                            }} style={inputStyle}>
                                <option value="" disabled>-- Select Room --</option>
                                {allDepartmentRooms.map(r => <option key={`br-${r}`} value={r}>{r}</option>)}
                                <option value="MANUAL">➕ Add Manually</option>
                            </select>}

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

const btnStyle = (bg) => ({ flex: 1, minWidth: '100px', padding: '10px', background: bg, color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' });
const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' };
const tabStyle = (isActive) => ({ flex: 1, padding: '12px', background: isActive ? '#002147' : '#ddd', color: isActive ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' });
const subTabStyle = (isActive) => ({ flex: 1, padding: '10px', background: isActive ? '#fff' : 'transparent', color: isActive ? '#002147' : '#555', border: isActive ? '1px solid #ddd' : '1px solid transparent', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' });
const sidebarBtnStyle = (isActive) => ({ width: '100%', padding: '12px', background: isActive ? '#F2A900' : 'transparent', color: isActive ? '#002147' : 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', transition: '0.2s' });
