import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AttendanceSheet({ lecture, onClose, crId }) {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // { student_id: 'Present' }

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    // Fetch from your roster table
    const { data, error } = await supabase.from('Class_Roster').select('*');
    if (data) {
      setStudents(data);
      // Optional: Auto-fill everyone as 'Present' for efficiency
      const defaultAttendance = {};
      data.forEach(s => defaultAttendance[s.id] = 'Present');
      setAttendance(defaultAttendance);
    }
  };

  const handleMark = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async () => {
    // 1. Create the Session
    const { data: sessionData, error: sessionError } = await supabase
      .from('Attendance_Sessions')
      .insert([{ 
        lecture_id: lecture.id, 
        date: new Date().toISOString().split('T')[0],
        submitted_by: crId,
        status: 'pending'
      }])
      .select()
      .single();

    if (sessionError) return alert('Error creating session');

    // 2. Prepare bulk insert array for records
    const recordsToInsert = students.map(student => ({
      session_id: sessionData.id,
      student_id: student.id,
      status: attendance[student.id]
    }));

    // 3. Bulk Insert
    const { error: recordsError } = await supabase
      .from('Attendance_Records')
      .insert(recordsToInsert);

    if (!recordsError) {
      alert('Attendance Submitted to Teacher for Approval!');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Mark Attendance: {lecture.subject}</h2>
          <button onClick={onClose} className="text-red-500 font-bold">X</button>
        </div>

        <div className="overflow-y-auto flex-grow space-y-4">
          {students.map((student) => (
            <div key={student.id} className="border p-3 rounded flex flex-col">
              <span className="font-semibold">{student.roll_number} - {student.student_name}</span>
              <div className="flex justify-between mt-2">
                {['Present', 'Absent', 'Leave'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleMark(student.id, status)}
                    className={`px-3 py-1 rounded ${
                      attendance[student.id] === status 
                        ? (status === 'Present' ? 'bg-green-500 text-white' : status === 'Absent' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white')
                        : 'bg-gray-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={handleSubmit} 
          className="mt-4 w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 transition"
        >
          Submit Attendance
        </button>
      </div>
    </div>
  );
}
