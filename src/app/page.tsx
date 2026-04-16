

"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase'; 
import { Upload, Users, UserPlus, Lock, Smartphone, ShieldCheck, Trash2, Download, BarChart2, Calendar, Search, Check, X, RefreshCw, ChevronDown, ChevronUp, Filter } from 'lucide-react';

const SUPER_ADMIN = ["harrypotterjee2023@gmail.com", "devangsharma0601@gmail.com"];
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://wave-api-2h7m.onrender.com";

export default function WaveDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  const [userRole, setUserRole] = useState<'admin' | 'faculty' | 'student' | 'unauthorized' | null>(null);
  const [userEnrollment, setUserEnrollment] = useState<string>("");
  
  const [facultySubject, setFacultySubject] = useState<string | null>(null);
  const [facultyName, setFacultyName] = useState<string | null>(null); 
  
  const [adminTab, setAdminTab] = useState<'faculty' | 'students' | 'logs'>('faculty');
  const [facultyTab, setFacultyTab] = useState<'scanner' | 'reports'>('scanner');
  const [studentTab, setStudentTab] = useState<'profile' | 'attendance'>('profile');

  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [studentLogs, setStudentLogs] = useState<any[]>([]);
  
  const [newFacName, setNewFacName] = useState(""); 
  const [newFacEmail, setNewFacEmail] = useState("");
  const [newFacSubject, setNewFacSubject] = useState("");
  
  const [macInput, setMacInput] = useState("");
  const [isMacRegistered, setIsMacRegistered] = useState(false);

  const [previewData, setPreviewData] = useState<{ present: any[], absent: any[] } | null>(null);
  const [showAbsentList, setShowAbsentList] = useState(false);
  const [scanDate, setScanDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [facLogDate, setFacLogDate] = useState("");
  const [facLogStudent, setFacLogStudent] = useState("");

  const [adminLogSubject, setAdminLogSubject] = useState("");
  const [adminLogDate, setAdminLogDate] = useState("");
  const [adminLogBranch, setAdminLogBranch] = useState("");
  const [adminLogEnrollment, setAdminLogEnrollment] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) await determineUserRole(currentUser.email || "");
    });
    return () => subscription.unsubscribe();
  }, []);

  const determineUserRole = async (email: string) => {
    for (const adminEmail of SUPER_ADMIN) {
      if (email === adminEmail) {
        fetchFaculty();
        fetchStudents();
        fetchReports(); 
        return setUserRole('admin');
      }
    }

    const { data: facultyData } = await supabase.from('faculty').select('name, subject_name').eq('email', email).single();
    if (facultyData) {
      setFacultyName(facultyData.name);
      setFacultySubject(facultyData.subject_name);
      fetchReports(facultyData.subject_name);
      return setUserRole('faculty');
    }

    if (email.endsWith("@uecu.ac.in")) {
      const enrollmentNo = email.split('@')[0].toUpperCase();
      setUserEnrollment(enrollmentNo); 
      
      const { data: studentRecord } = await supabase.from('students').select('mac_address').eq('roll_number', enrollmentNo).single();
      if (studentRecord?.mac_address) {
        setIsMacRegistered(true);
        fetchStudentAttendance(enrollmentNo);
        setStudentTab('attendance');
      } else {
        setIsMacRegistered(false);
      }
      return setUserRole('student');
    }
    setUserRole('unauthorized');
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    // This magically grabs whatever URL you are currently on!
    const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    
    await supabase.auth.signInWithOAuth({ 
      provider: 'google', 
      options: { redirectTo: currentUrl }
    });
    setLoading(false);
  };

  const fetchFaculty = async () => {
    const { data } = await supabase.from('faculty').select('*').order('email');
    if (data) setFacultyList(data);
  };
  
  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*').order('roll_number');
    if (data) setStudentsList(data);
  };
  
  const fetchReports = async (subject: string | null = null) => {
    let query = supabase.from('attendance_logs').select('*').order('date', { ascending: false });
    // Use subject_column to match the database schema
    if (subject) query = query.eq('subject_column', subject);
    const { data } = await query;
    if (data) setReportData(data);
  };
  
  const fetchStudentAttendance = async (enrollment: string) => {
    const { data } = await supabase.from('attendance_logs').select('*').eq('roll_number', enrollment).order('date', { ascending: true });
    if (data) setStudentLogs(data);
  };

  const handleFacultyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/upload/daily/preview`, { method: 'POST', body: formData });
      const data = await res.json();
      
      if (res.ok && data.present && data.absent) {
          setPreviewData(data);
          setMessage("CSV Parsed successfully. Please review below.");
      } else {
          setMessage(`Database Error: ${data.detail || "Failed to process"}`);
          setPreviewData(null); 
      }
    } catch { 
      setMessage("Backend Offline or Error Parsing CSV"); 
      setPreviewData(null);
    } 
    finally { setLoading(false); }
  };

  const toggleStudentStatus = (roll_number: string, currentStatus: 'Present' | 'Absent') => {
    if (!previewData) return;
    let present = [...previewData.present];
    let absent = [...previewData.absent];

    if (currentStatus === 'Present') {
      const student = present.find(s => s.roll_number === roll_number);
      present = present.filter(s => s.roll_number !== roll_number);
      if (student) absent.push({ ...student, status: 'Absent' });
    } else {
      const student = absent.find(s => s.roll_number === roll_number);
      absent = absent.filter(s => s.roll_number !== roll_number);
      if (student) present.push({ ...student, status: 'Present' });
    }
    setPreviewData({ present, absent });
  };

  const commitAttendance = async () => {
    if (!previewData) return;
    setLoading(true);
    
    const safeSubject = facultySubject || "General";
    
    const records = [
      ...previewData.present.map(s => ({ mac_address: s.mac_address, roll_number: s.roll_number, subject_column: safeSubject, status: s.status })),
      ...previewData.absent.map(s => ({ mac_address: s.mac_address, roll_number: s.roll_number, subject_column: safeSubject, status: s.status }))
    ];

    try {
      const res = await fetch(`${API_URL}/upload/daily/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, record_date: scanDate })
      });
      const data = await res.json();
      
      if(res.ok) {
          setMessage(data.message);
          setPreviewData(null); 
          fetchReports(facultySubject);
      } else {
          setMessage(data.detail || "Failed to save to database");
      }
    } catch { setMessage("Network error: Failed to save"); }
    finally { setLoading(false); }
  };

  const submitNewFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('faculty').insert([{ name: newFacName, email: newFacEmail, subject_name: newFacSubject }]);
    if (error) alert("Database Error: " + error.message);
    else {
      setNewFacName(""); setNewFacEmail(""); setNewFacSubject("");
      fetchFaculty(); 
    }
    setLoading(false);
  };

  const handleStudentLink = async () => {
    if (!macInput.includes(':') || macInput.length < 16) return alert("Please enter a valid MAC address");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/register/student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac_address: macInput, roll_number: userEnrollment })
      });
      if(res.ok) {
         setIsMacRegistered(true);
         setStudentTab('attendance');
         fetchStudentAttendance(userEnrollment);
      } else {
         const data = await res.json();
         setMessage(data.detail || "Error registering MAC");
      }
    } catch { setMessage("Backend Offline"); } 
    finally { setLoading(false); }
  };

  const extractBranch = (enrollment: string) => {
      const match = enrollment.match(/[A-Z]{2}/);
      return match ? match[0] : "";
  };

  const renderHeatmap = () => {
    const days = Array.from({length: 60}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (59 - i));
        return d.toISOString().split('T')[0];
    });

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full overflow-hidden">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm text-slate-400 font-bold flex items-center gap-2"><Calendar size={16}/> Last 60 Days Overview</h3>
                 <button onClick={() => fetchStudentAttendance(userEnrollment)} className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-all"><RefreshCw size={12}/> Sync</button>
             </div>
             
             <div className="w-full overflow-x-auto pb-4">
                 <div className="flex gap-1.5 min-w-max">
                     {days.map(dayStr => {
                         const record = studentLogs.find(log => log.date === dayStr);
                         let bgColor = "bg-slate-800"; 
                         if (record?.status === "Present") bgColor = "bg-green-500";
                         if (record?.status === "Absent") bgColor = "bg-red-500";
                         
                         return (
                             <div key={dayStr} 
                                  title={`Date: ${dayStr}\nStatus: ${record ? record.status : 'No Class/Data'}`} 
                                  className={`w-4 h-4 md:w-5 md:h-5 rounded-sm ${bgColor} hover:ring-2 ring-white cursor-pointer transition-all`}>
                             </div>
                         );
                     })}
                 </div>
             </div>
             <div className="flex gap-4 items-center mt-2 text-xs text-slate-400">
                 <span>Less</span>
                 <div className="flex gap-1.5">
                     <div className="w-4 h-4 rounded-sm bg-slate-800" title="No Class"></div>
                     <div className="w-4 h-4 rounded-sm bg-red-500" title="Absent"></div>
                     <div className="w-4 h-4 rounded-sm bg-green-500" title="Present"></div>
                 </div>
                 <span>More</span>
             </div>
        </div>
    );
  };

  if (!user || !userRole) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-3xl w-full max-w-md text-center shadow-2xl border border-slate-800">
          <Lock size={40} className="text-blue-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-white mb-8">WAVE Access</h2>
          <button onClick={handleGoogleLogin} disabled={loading} className="w-full py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-200 transition-all">Sign in with College Google Account</button>
        </div>
      </div>
    );
  }

  if (userRole === 'faculty') {
    const filteredFacReports = reportData.filter(r => 
        (facLogDate === "" || r.date === facLogDate) &&
        (facLogStudent === "" || (r.roll_number || "").includes(facLogStudent.toUpperCase()))
    );

    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mb-8 text-center md:text-left">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-blue-400">Welcome, {facultyName || "Professor"}</h1>
            <p className="text-sm text-slate-400 mt-1">Subject: <strong className="text-white">{facultySubject}</strong></p>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-sm bg-slate-800 px-6 py-2.5 rounded-xl hover:bg-slate-700 transition-all font-medium">Logout</button>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-3 mb-8 border-b border-slate-800 pb-4 overflow-x-auto">
          <button onClick={() => setFacultyTab('scanner')} className={`px-6 py-3 font-bold rounded-xl flex items-center justify-center gap-2 whitespace-nowrap transition-all ${facultyTab === 'scanner' ? 'bg-blue-600 shadow-lg shadow-blue-900/20' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}><Upload size={18}/> Scanner & Review</button>
          <button onClick={() => setFacultyTab('reports')} className={`px-6 py-3 font-bold rounded-xl flex items-center justify-center gap-2 whitespace-nowrap transition-all ${facultyTab === 'reports' ? 'bg-blue-600 shadow-lg shadow-blue-900/20' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}><BarChart2 size={18}/> History Logs</button>
        </div>

        <div className="max-w-7xl mx-auto">
          {facultyTab === 'scanner' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {!previewData ? (
                 <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-xl text-center">
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                        <label className="text-sm font-bold text-slate-400">Class Date:</label>
                        <input type="date" value={scanDate} onChange={e => setScanDate(e.target.value)} className="bg-slate-900 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500 text-white w-full sm:w-auto"/>
                    </div>
                    <div className="border-2 border-dashed border-slate-700 rounded-3xl p-10 md:p-16 cursor-pointer hover:border-blue-500 hover:bg-blue-950/20 transition-all group">
                      <input type="file" onChange={handleFacultyUpload} className="hidden" id="csv" accept=".csv" />
                      <label htmlFor="csv" className="cursor-pointer flex flex-col items-center justify-center w-full h-full gap-4">
                          <Upload size={40} className="text-slate-500 group-hover:text-blue-400 transition-colors"/>
                          <span className="text-slate-300 font-medium text-lg">Click to Upload ESP8266 CSV</span>
                      </label>
                    </div>
                    {message && <div className="mt-6 p-4 bg-red-900/20 border border-red-900/50 rounded-xl text-red-400 text-sm font-medium">{message}</div>}
                 </div>
              ) : (
                 <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 border-b border-slate-800 pb-6">
                        <div>
                            <h2 className="text-xl font-bold">Review Attendance</h2>
                            <p className="text-slate-400 text-sm">Date: {scanDate}</p>
                        </div>
                        <button onClick={() => setPreviewData(null)} className="text-slate-400 hover:text-white flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800"><RefreshCw size={16}/> Cancel & Re-upload</button>
                    </div>

                    <div className="mb-8">
                        <h3 className="text-green-400 font-bold mb-4 flex items-center gap-2 bg-green-950/20 w-fit px-4 py-2 rounded-xl border border-green-900/30"><Check size={18}/> Present Students ({previewData.present.length})</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {previewData.present.map(s => (
                                <div key={s.roll_number} className="bg-slate-950 border border-green-900/30 p-3 rounded-xl flex justify-between items-center group hover:border-green-500/50 transition-colors">
                                    <span className="font-mono text-sm font-bold text-slate-300">{s.roll_number}</span>
                                    <button onClick={() => toggleStudentStatus(s.roll_number, 'Present')} className="text-xs bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800">Mark Absent</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mb-8">
                        <button onClick={() => setShowAbsentList(!showAbsentList)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center font-bold text-red-400 hover:bg-slate-900 transition-all">
                            <span className="flex items-center gap-2"><X size={18}/> Absent Students ({previewData.absent.length})</span>
                            {showAbsentList ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                        </button>
                        {showAbsentList && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                                {previewData.absent.map(s => (
                                    <div key={s.roll_number} className="bg-slate-950 border border-red-900/30 p-3 rounded-xl flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity">
                                        <span className="font-mono text-sm font-bold text-slate-300">{s.roll_number}</span>
                                        <button onClick={() => toggleStudentStatus(s.roll_number, 'Absent')} className="text-xs bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800">Mark Present</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button onClick={commitAttendance} disabled={loading} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-lg shadow-blue-900/20 text-lg transition-all">
                        {loading ? "Saving to Database..." : "Confirm & Save to Database"}
                    </button>
                 </div>
              )}
            </div>
          )}

          {facultyTab === 'reports' && (
            <div className="bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800 w-full overflow-hidden">
               <div className="flex flex-col md:flex-row gap-3 mb-6 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                   <div className="flex flex-col flex-1 gap-1">
                       <label className="text-xs text-slate-500 font-bold ml-1">Search Enrollment (All)</label>
                       <div className="relative w-full">
                           <Search size={16} className="absolute left-3 top-3.5 text-slate-500"/>
                           <input type="text" placeholder="e.g. 0701CS..." value={facLogStudent} onChange={e=>setFacLogStudent(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pl-10 outline-none focus:border-blue-500 text-white font-mono text-sm"/>
                       </div>
                   </div>
                   
                   <div className="flex flex-col flex-1 gap-1">
                       <label className="text-xs text-slate-500 font-bold ml-1">Filter by Date (All)</label>
                       <input type="date" value={facLogDate} onChange={e=>setFacLogDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 outline-none focus:border-blue-500 text-slate-300 text-sm"/>
                   </div>

                   <div className="flex flex-col justify-end">
                       <button onClick={() => {setFacLogDate(""); setFacLogStudent("");}} className="h-[46px] px-6 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold text-slate-300 transition-all border border-slate-700">Clear</button>
                   </div>
               </div>

               <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 shadow-inner">
                  <table className="w-full text-left min-w-[500px] border-collapse">
                    <thead className="bg-slate-900">
                      <tr className="text-slate-400 text-sm border-b border-slate-800">
                          <th className="p-4 font-bold">Date</th>
                          <th className="p-4 font-bold">Enrollment No</th>
                          <th className="p-4 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredFacReports.length === 0 ? <tr><td colSpan={3} className="p-8 text-center text-slate-500 font-medium">No logs match criteria.</td></tr> :
                        filteredFacReports.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-900/50 text-sm transition-colors">
                          <td className="p-4 text-slate-300">{r.date}</td>
                          <td className="p-4 font-bold font-mono text-white tracking-wide">{r.roll_number}</td>
                          <td className="p-4">
                              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${r.status === 'Present' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                  {r.status}
                              </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (userRole === 'student') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-blue-400 tracking-tight">Student Portal</h2>
          <button onClick={() => supabase.auth.signOut()} className="text-sm bg-slate-800 px-6 py-2.5 rounded-xl hover:bg-slate-700 font-medium w-full sm:w-auto transition-all">Logout</button>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 mb-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-center sm:text-left">
                  <p className="text-sm text-slate-400 mb-1 font-medium">Authenticated Account</p>
                  <p className="font-black text-2xl md:text-3xl font-mono tracking-widest text-white">{userEnrollment}</p>
              </div>
              <div className={`px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 w-full sm:w-auto justify-center border shadow-inner ${isMacRegistered ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                  {isMacRegistered ? <><ShieldCheck size={20}/> Device Locked</> : <><Smartphone size={20}/> Registration Required</>}
              </div>
          </div>

          {!isMacRegistered ? (
            <div className="bg-slate-900 border border-blue-900/50 rounded-3xl p-8 md:p-12 shadow-2xl text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-cyan-400"></div>
              <h3 className="text-2xl font-black mb-4 text-white">One-Time Device Registration</h3>
              <p className="text-slate-400 mb-8 text-sm md:text-base max-w-lg mx-auto leading-relaxed">Enter your primary device MAC address. This action is <strong className="text-red-400">permanent</strong> and cannot be altered by the student later to ensure structural integrity.</p>
              
              <div className="max-w-sm mx-auto space-y-4">
                  <input value={macInput} onChange={(e) => setMacInput(e.target.value.toUpperCase())} placeholder="AA:BB:CC:DD:EE:FF" className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-white uppercase font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center tracking-widest text-lg shadow-inner" />
                  <button onClick={handleStudentLink} disabled={loading} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all text-lg">
                    {loading ? "Locking Device..." : "Permanently Lock Device"}
                  </button>
                  {message && <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-xl text-red-400 text-sm font-medium">{message}</div>}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
                {renderHeatmap()}

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full overflow-hidden shadow-xl">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                        <h3 className="font-bold text-lg md:text-xl text-white">Detailed Subject Logs</h3>
                        <button onClick={() => fetchStudentAttendance(userEnrollment)} className="text-sm flex items-center gap-2 text-blue-400 hover:text-blue-300 font-bold bg-blue-950/30 px-4 py-2 rounded-lg transition-colors"><RefreshCw size={14}/> Refresh Logs</button>
                    </div>
                    
                    {studentLogs.length === 0 ? (
                        <div className="text-center p-12 bg-slate-950 rounded-2xl border border-dashed border-slate-800">
                            <Calendar size={32} className="mx-auto text-slate-700 mb-4"/>
                            <p className="text-slate-500 font-medium">No attendance data recorded yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {studentLogs.map((log, i) => (
                                <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-slate-950 p-4 md:p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-colors">
                                    <div>
                                        <p className="font-bold text-white text-lg">{log.subject_column}</p>
                                        <p className="text-sm text-slate-400 mt-1">{log.date}</p>
                                    </div>
                                    <span className={`self-start sm:self-auto px-4 py-1.5 rounded-lg text-sm font-bold border ${log.status === 'Present' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                        {log.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (userRole === 'admin') {
     const filteredAdminReports = reportData.filter(r => {
         const subj = r.subject_column || "";
         const roll = r.roll_number || "";
         
         const matchSubject = adminLogSubject === "" || subj.toLowerCase().includes(adminLogSubject.toLowerCase());
         const matchDate = adminLogDate === "" || r.date === adminLogDate;
         const matchEnrollment = adminLogEnrollment === "" || roll.toUpperCase().includes(adminLogEnrollment.toUpperCase());
         const matchBranch = adminLogBranch === "" || extractBranch(roll) === adminLogBranch.toUpperCase();
         
         return matchSubject && matchDate && matchEnrollment && matchBranch;
     });

     return (
        <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
              <h1 className="text-2xl md:text-3xl font-black text-purple-400 flex items-center gap-3"><ShieldCheck size={32}/> Admin Command Center</h1>
              <button onClick={() => supabase.auth.signOut()} className="text-sm bg-slate-800 px-6 py-2.5 rounded-xl hover:bg-slate-700 font-medium transition-all w-full md:w-auto">Logout</button>
            </div>
            
            <div className="max-w-7xl mx-auto flex gap-2 mb-8 border-b border-slate-800 pb-4 overflow-x-auto custom-scrollbar">
              <button onClick={() => setAdminTab('faculty')} className={`px-6 py-3 font-bold rounded-xl whitespace-nowrap transition-all ${adminTab === 'faculty' ? 'bg-purple-600 shadow-lg shadow-purple-900/20' : 'bg-slate-900 hover:bg-slate-800 text-slate-400'}`}>Manage Faculty</button>
              <button onClick={() => setAdminTab('students')} className={`px-6 py-3 font-bold rounded-xl whitespace-nowrap transition-all ${adminTab === 'students' ? 'bg-purple-600 shadow-lg shadow-purple-900/20' : 'bg-slate-900 hover:bg-slate-800 text-slate-400'}`}>Student Devices</button>
              <button onClick={() => setAdminTab('logs')} className={`px-6 py-3 font-bold rounded-xl whitespace-nowrap transition-all ${adminTab === 'logs' ? 'bg-purple-600 shadow-lg shadow-purple-900/20' : 'bg-slate-900 hover:bg-slate-800 text-slate-400'}`}>Global Attendance Logs</button>
            </div>

            <div className="max-w-7xl mx-auto">
                {adminTab === 'faculty' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-slate-900 p-6 md:p-8 rounded-3xl border border-purple-900/30 shadow-xl h-fit">
                      <h2 className="font-bold mb-6 flex items-center gap-2 text-lg text-white"><UserPlus size={20} className="text-purple-400"/> Add Faculty</h2>
                      <form onSubmit={submitNewFaculty} className="space-y-4">
                        <input type="text" value={newFacName} onChange={e => setNewFacName(e.target.value)} required placeholder="Professor Name" className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:border-purple-500 text-white" />
                        <input type="email" value={newFacEmail} onChange={e => setNewFacEmail(e.target.value)} required placeholder="Official Email" className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:border-purple-500 text-white" />
                        <input type="text" value={newFacSubject} onChange={e => setNewFacSubject(e.target.value)} required placeholder="Subject Code/Name" className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:border-purple-500 text-white" />
                        <button type="submit" disabled={loading} className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold shadow-lg transition-all mt-2 text-white">Save Faculty Profile</button>
                      </form>
                    </div>

                    <div className="lg:col-span-2 bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl w-full overflow-hidden">
                      <h2 className="font-bold mb-6 text-lg text-white flex items-center gap-2"><Users size={20} className="text-purple-400"/> Active Faculty Directory</h2>
                      <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                        <table className="w-full text-left min-w-[600px] border-collapse">
                          <thead className="bg-slate-900">
                              <tr className="text-slate-400 border-b border-slate-800 text-sm">
                                  <th className="p-4 font-bold">Name</th>
                                  <th className="p-4 font-bold">Email</th>
                                  <th className="p-4 font-bold">Subject</th>
                                  <th className="p-4 text-right font-bold">Action</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {facultyList.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-500">No faculty members found.</td></tr> : 
                              facultyList.map(f => (
                              <tr key={f.email} className="hover:bg-slate-900/50 transition-colors">
                                <td className="p-4 font-bold text-white whitespace-nowrap">{f.name}</td>
                                <td className="p-4 whitespace-nowrap text-slate-400 text-sm">{f.email}</td>
                                <td className="p-4 text-purple-400 whitespace-nowrap font-medium">{f.subject_name}</td>
                                <td className="p-4 text-right">
                                    <button onClick={async () => {
                                        if(window.confirm(`Delete faculty ${f.name}?`)) {
                                            await supabase.from('faculty').delete().eq('email', f.email);
                                            fetchFaculty();
                                        }
                                    }} className="text-slate-500 hover:text-red-400 bg-slate-950 hover:bg-red-500/10 p-2 rounded-lg transition-all border border-transparent hover:border-red-900/30"><Trash2 size={18}/></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {adminTab === 'students' && (
                    <div className="bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl w-full overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-800 pb-4">
                            <div>
                                <h2 className="font-bold text-xl text-white">Student Device Registry</h2>
                                <p className="text-slate-400 text-sm mt-1">Deleting a student record unlinks their device, allowing re-registration on their next login.</p>
                            </div>
                        </div>
                        <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                            <table className="w-full text-left min-w-[500px] border-collapse">
                                <thead className="bg-slate-900">
                                    <tr className="text-slate-400 border-b border-slate-800 text-sm">
                                        <th className="p-4 font-bold">Enrollment No</th>
                                        <th className="p-4 font-bold">Locked MAC Address</th>
                                        <th className="p-4 text-right font-bold">Admin Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {studentsList.length === 0 ? <tr><td colSpan={3} className="p-8 text-center text-slate-500">No student devices registered.</td></tr> :
                                      studentsList.map(s => (
                                        <tr key={s.mac_address} className="hover:bg-slate-900/50 transition-colors">
                                            <td className="p-4 font-mono font-bold text-white tracking-wide">{s.roll_number}</td>
                                            <td className="p-4 font-mono text-blue-400 text-sm">{s.mac_address}</td>
                                            <td className="p-4 text-right">
                                                <button onClick={async () => {
                                                    if(window.confirm(`Delete MAC locking for student ${s.roll_number}?`)) {
                                                        await supabase.from('students').delete().eq('roll_number', s.roll_number);
                                                        fetchStudents();
                                                    }
                                                }} className="bg-slate-950 hover:bg-red-900/20 text-red-400 px-4 py-2 rounded-xl text-sm transition-all font-bold border border-slate-800 hover:border-red-900/50">Unlink Device</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {adminTab === 'logs' && (
                     <div className="bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl w-full overflow-hidden">
                        <div className="flex items-center gap-2 mb-6">
                            <Filter size={20} className="text-purple-400"/>
                            <h2 className="font-bold text-xl text-white">Global Attendance Explorer</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-8 bg-slate-950 p-5 rounded-2xl border border-slate-800">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">Subject</label>
                                <input type="text" placeholder="All Subjects" value={adminLogSubject} onChange={e=>setAdminLogSubject(e.target.value)} className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-sm text-white outline-none focus:border-purple-500 w-full"/>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">Date</label>
                                <input type="date" value={adminLogDate} onChange={e=>setAdminLogDate(e.target.value)} className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-sm text-slate-300 outline-none focus:border-purple-500 w-full"/>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">Branch (e.g. CS, EC)</label>
                                <input type="text" placeholder="All Branches" value={adminLogBranch} onChange={e=>setAdminLogBranch(e.target.value)} className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-sm text-white outline-none focus:border-purple-500 font-mono uppercase w-full"/>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1">Enrollment No.</label>
                                <input type="text" placeholder="Search specific..." value={adminLogEnrollment} onChange={e=>setAdminLogEnrollment(e.target.value)} className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-sm text-white outline-none focus:border-purple-500 font-mono w-full"/>
                            </div>
                            <div className="flex flex-col justify-end">
                                <button onClick={() => {
                                    setAdminLogSubject(""); setAdminLogDate(""); setAdminLogBranch(""); setAdminLogEnrollment("");
                                }} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold p-2.5 rounded-xl text-sm border border-slate-700 transition-all h-[42px] w-full">Clear Filters</button>
                            </div>
                        </div>

                        <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                            <table className="w-full text-left text-sm min-w-[700px] border-collapse">
                                <thead className="bg-slate-900">
                                    <tr className="text-slate-400 border-b border-slate-800">
                                        <th className="p-4 font-bold">Date</th>
                                        <th className="p-4 font-bold">Enrollment No</th>
                                        <th className="p-4 font-bold">Branch</th>
                                        <th className="p-4 font-bold">Subject</th>
                                        <th className="p-4 font-bold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {filteredAdminReports.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-500">No records match the current filters.</td></tr> :
                                     filteredAdminReports.map((r, i) => {
                                        const branch = extractBranch(r.roll_number || "");
                                        return (
                                        <tr key={i} className="hover:bg-slate-900/50 transition-colors">
                                            <td className="p-4 text-slate-300">{r.date}</td>
                                            <td className="p-4 font-mono font-bold text-white tracking-wide">{r.roll_number}</td>
                                            <td className="p-4 font-mono text-slate-400">{branch}</td>
                                            <td className="p-4 font-medium text-purple-400">{r.subject_column}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${r.status === 'Present' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                     </div>
                )}
            </div>
        </div>
     );
  }

  return null;
}
