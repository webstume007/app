import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AttendanceSheet({ lecture, onClose, profile, existingSession, students }) {
    const [attendance, setAttendance] = useState({});
    const [loading, setLoading] = useState(true);
    
    // Add an initialized lock to stop React from resetting the state on background re-renders
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        // If we already loaded, or if students haven't arrived from the dashboard yet, do nothing.
        if (initialized || !students || students.length === 0) return;

        const loadRecords = async () => {
            const initialAtt = {};

            // 1. If editing, fetch existing records from attendance_records
            if (existingSession) {
                const { data: recordsData } = await supabase
                    .from('attendance_records')
                    .select('*')
                    .eq('session_id', existingSession.id);
                
                if (recordsData) {
                    recordsData.forEach(record => {
                        // Crucial: Track using the internal UUID (student_id), not registration_number
                        initialAtt[record.student_id] = record.status;
                    });
                }
                
                // Fallback: Default to Present if a new student was added after this session was created
                students.forEach(s => {
                    if (!initialAtt[s.id]) {
                        initialAtt[s.id] = 'Present';
                    }
                });
            } else {
                // 2. Default to Present if new session
                students.forEach(s => initialAtt[s.id] = 'Present');
            }
            
            setAttendance(initialAtt);
            setInitialized(true); // Lock it so it doesn't run again!
            setLoading(false);
        };

        loadRecords();
    }, [existingSession, students, initialized]); // Added initialized to dependencies

    const handleMark = (studentId, status) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const handleSubmit = async () => {
        const today = new Date().toLocaleDateString('en-CA');
        let sessionId = existingSession?.id;

        // 1. Create or Update Session
        if (!sessionId) {
            const { data: sessionData, error: sessionError } = await supabase
                .from('attendance_sessions')
                .insert([{ 
                    base_schedule_id: lecture.id, 
                    session_date: today,
                    submitted_by: profile.id,
                    status: 'pending'
                }])
                .select()
                .single();

            if (sessionError) return alert('Error creating session: ' + sessionError.message);
            sessionId = sessionData.id;
        }

        // 2. Clear old records if editing
        if (existingSession) {
            await supabase.from('attendance_records').delete().eq('session_id', sessionId);
        }

        // 3. Insert new records - USING UUIDs (student.id)
        const records = students.map(student => ({
            session_id: sessionId,
            student_id: student.id, // Fixed: Sending UUID to the database
            status: attendance[student.id]
        }));

        const { error: recordsError } = await supabase.from('attendance_records').insert(records);

        if (!recordsError) {
            alert(existingSession ? 'Attendance Updated!' : 'Attendance submitted for Teacher approval!');
            onClose(true); // Trigger UI refresh in parent
        } else {
            alert('Error submitting records: ' + recordsError.message);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '15px', boxSizing: 'border-box' }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '10px', width: '100%', maxWidth: '500px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                    <h3 style={{ margin: 0, color: '#002147' }}>
                        {existingSession ? 'Edit Attendance' : 'Mark Attendance'}: {lecture.course}
                    </h3>
                    <button onClick={() => onClose(false)} style={{ background: 'none', border: 'none', color: 'red', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>X</button>
                </div>

                <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '5px' }}>
                    {loading ? <p>Loading records...</p> : !students || students.length === 0 ? <p>No students found. Add them in the Manage Students tab.</p> : (
                        students.map((student) => (
                            <div key={student.id} style={{ border: '1px solid #ddd', padding: '12px', borderRadius: '8px', marginBottom: '10px', background: '#f9f9f9' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                                    {/* UI shows Registration Number, but buttons use UUID under the hood */}
                                    {student.registration_number} - {student.student_name}
                                </div>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    {['Present', 'Absent', 'Leave'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleMark(student.id, status)} // Passing UUID
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
                    {existingSession ? 'Update Attendance' : 'Submit to Teacher'}
                </button>
            </div>
        </div>
    );
}
