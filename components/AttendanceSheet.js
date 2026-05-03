import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AttendanceSheet({ lecture, onClose, profile }) {
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        // Fetch students matching the CR's semester and section
        const { data, error } = await supabase
            .from('class_roster')
            .select('*')
            .eq('semester', profile.semester)
            .eq('section', profile.section)
            .order('roll_number', { ascending: true });

        if (data) {
            setStudents(data);
            // Default everyone to 'Present'
            const defaultAtt = {};
            data.forEach(s => defaultAtt[s.id] = 'Present');
            setAttendance(defaultAtt);
        }
        setLoading(false);
    };

    const handleMark = (studentId, status) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const handleSubmit = async () => {
        const today = new Date().toLocaleDateString('en-CA');
        
        // 1. Create the session
        const { data: sessionData, error: sessionError } = await supabase
            .from('attendance_sessions')
            .insert([{ 
                base_schedule_id: lecture.id, 
                session_date: today,
                submitted_by: profile.id, // CR's ID
                status: 'pending'
            }])
            .select()
            .single();

        if (sessionError) {
            alert('Error creating session: ' + sessionError.message);
            return;
        }

        // 2. Insert records
        const records = students.map(student => ({
            session_id: sessionData.id,
            student_id: student.id,
            status: attendance[student.id]
        }));

        const { error: recordsError } = await supabase.from('attendance_records').insert(records);

        if (!recordsError) {
            alert('Attendance submitted for Teacher approval!');
            onClose();
        } else {
            alert('Error submitting records.');
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '15px', boxSizing: 'border-box' }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '10px', width: '100%', maxWidth: '500px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                    <h3 style={{ margin: 0, color: '#002147' }}>Mark Attendance: {lecture.course}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'red', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>X</button>
                </div>

                <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '5px' }}>
                    {loading ? <p>Loading roster...</p> : students.length === 0 ? <p>No students found in roster for this section.</p> : (
                        students.map((student) => (
                            <div key={student.id} style={{ border: '1px solid #ddd', padding: '12px', borderRadius: '8px', marginBottom: '10px', background: '#f9f9f9' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>{student.roll_number} - {student.student_name}</div>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    {['Present', 'Absent', 'Leave'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleMark(student.id, status)}
                                            style={{
                                                flex: 1, padding: '8px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                                                background: attendance[student.id] === status 
                                                    ? (status === 'Present' ? '#28a745' : status === 'Absent' ? '#dc3545' : '#ffc107') 
                                                    : '#e9ecef',
                                                color: attendance[student.id] === status && status !== 'Leave' ? 'white' : '#333'
                                            }}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <button onClick={handleSubmit} style={{ width: '100%', padding: '15px', background: '#002147', color: '#F2A900', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', marginTop: '15px' }}>
                    Submit to Teacher
                </button>
            </div>
        </div>
    );
}
