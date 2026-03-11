import React, { useState, useEffect } from 'react';
import { BookOpen, Mic, Square, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Types ---
type Role = 'student' | 'teacher';

interface TestSection {
  name: string;
  standardAnswer: string;
  gradingCriteria: string[];
}

interface Lesson {
  id: string;
  teacherId: string;
  chapterName: string;
  sections: TestSection[];
  createdAt: number;
  isActive?: boolean;
}

interface Submission {
  id: string;
  lessonId: string;
  studentName: string;
  studentClass: string;
  studentOrder: string;
  studentPin: string;
  testSection: string;
  transcript: string;
  score: number;
  feedback: string;
  missingKeywords: string[];
  matchedKeywords: string[];
  createdAt: number;
}

// --- Components ---

export default function App() {
  const [role, setRole] = useState<Role>(() => {
    return (localStorage.getItem('role') as Role) || 'student';
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  
  // Teacher State
  const [teacherId, setTeacherId] = useState(() => localStorage.getItem('teacherId') || '');
  const [loginError, setLoginError] = useState('');

  // Student State
  const [studentName, setStudentName] = useState(() => localStorage.getItem('studentName') || '');
  const [studentClass, setStudentClass] = useState(() => localStorage.getItem('studentClass') || '');
  const [studentOrder, setStudentOrder] = useState(() => localStorage.getItem('studentOrder') || '');
  const [studentPin, setStudentPin] = useState(() => localStorage.getItem('studentPin') || '');

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('role', role);
    localStorage.setItem('isLoggedIn', isLoggedIn.toString());
    localStorage.setItem('teacherId', teacherId);
    localStorage.setItem('studentName', studentName);
    localStorage.setItem('studentClass', studentClass);
    localStorage.setItem('studentOrder', studentOrder);
    localStorage.setItem('studentPin', studentPin);
  }, [role, isLoggedIn, teacherId, studentName, studentClass, studentOrder, studentPin]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (role === 'student' && studentName && studentClass && studentOrder && studentPin) {
      setIsLoggedIn(true);
    } else if (role === 'teacher') {
      if (teacherId === '7a4') {
        setIsLoggedIn(true);
      } else {
        setLoginError('Mã giáo viên không chính xác!');
      }
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setTeacherId('');
    setStudentName('');
    setStudentClass('');
    setStudentOrder('');
    setStudentPin('');
    setLoginError('');
  };

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setLoginError('');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-md bg-[#ff7b00] text-white rounded-b-3xl shadow-md p-6 flex flex-col items-center justify-center text-center relative z-10">
        <div className="bg-white/20 p-3 rounded-full mb-3">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-1">Học Toán cùng cô Hiền</h1>
        <p className="text-sm text-white/90">Hệ thống kiểm tra lý thuyết bằng giọng nói</p>
        
        {isLoggedIn && (
          <button 
            onClick={handleLogout}
            className="absolute top-4 right-4 text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
          >
            Đăng xuất
          </button>
        )}
      </header>

      <main className="w-full max-w-md flex-1 p-4 flex flex-col">
        {!isLoggedIn ? (
          <div className="flex-1 flex flex-col justify-center -mt-8">
            {/* Tab Control */}
            <div className="bg-gray-200 p-1 rounded-full flex mb-8 relative z-0">
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                  role === 'student' ? 'bg-white text-[#ff7b00] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => handleRoleChange('student')}
              >
                Học sinh
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                  role === 'teacher' ? 'bg-white text-[#ff7b00] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => handleRoleChange('teacher')}
              >
                Giáo viên
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
              {role === 'student' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 ml-1">Họ và Tên</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Nguyễn Văn A"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/50 focus:border-[#ff7b00] transition-all"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 ml-1">Lớp</label>
                      <input
                        type="text"
                        required
                        placeholder="VD: 7A1"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/50 focus:border-[#ff7b00] transition-all"
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 ml-1">STT</label>
                      <input
                        type="number"
                        required
                        placeholder="VD: 01"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/50 focus:border-[#ff7b00] transition-all"
                        value={studentOrder}
                        onChange={(e) => setStudentOrder(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 ml-1">Mã PIN Lớp</label>
                    <input
                      type="password"
                      required
                      placeholder="Nhập mã PIN..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/50 focus:border-[#ff7b00] transition-all"
                      value={studentPin}
                      onChange={(e) => setStudentPin(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 ml-1">Mã giáo viên bí mật</label>
                  <input
                    type="password"
                    required
                    placeholder="Nhập mã giáo viên..."
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-2xl focus:outline-none focus:ring-2 transition-all ${
                      loginError ? 'border-red-300 focus:ring-red-500/50 focus:border-red-500' : 'border-gray-200 focus:ring-[#ff7b00]/50 focus:border-[#ff7b00]'
                    }`}
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                  />
                  {loginError && (
                    <p className="text-red-500 text-xs mt-2 ml-1">{loginError}</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="mt-4 w-full bg-[#ff7b00] hover:bg-[#e66e00] text-white font-medium py-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              >
                {role === 'student' ? 'Vào lớp học' : 'Vào Bảng Điều Khiển'}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 py-4">
            {role === 'teacher' ? (
              <TeacherPanel teacherId={teacherId} />
            ) : (
              <StudentPanel 
                studentName={studentName}
                studentClass={studentClass}
                studentOrder={studentOrder}
                studentPin={studentPin}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// --- Teacher Panel ---
function TeacherPanel({ teacherId }: { teacherId: string }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'library' | 'dashboard'>('library');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  
  // Form state
  const [chapterName, setChapterName] = useState(() => localStorage.getItem('teacher_chapterName') || '');
  const [testSectionsInput, setTestSectionsInput] = useState(() => localStorage.getItem('teacher_testSectionsInput') || '');
  const [sectionDetails, setSectionDetails] = useState<Record<string, { standardAnswer: string, gradingCriteria: string }>>(() => {
    const saved = localStorage.getItem('teacher_sectionDetails');
    return saved ? JSON.parse(saved) : {};
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem('teacher_chapterName', chapterName);
    localStorage.setItem('teacher_testSectionsInput', testSectionsInput);
    localStorage.setItem('teacher_sectionDetails', JSON.stringify(sectionDetails));
  }, [chapterName, testSectionsInput, sectionDetails]);

  const sectionsList = testSectionsInput.split(',').map(s => s.trim()).filter(Boolean);

  const handleSectionDetailsChange = (sectionName: string, field: 'standardAnswer' | 'gradingCriteria', value: string) => {
    setSectionDetails(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        [field]: value
      }
    }));
  };

  useEffect(() => {
    const q = query(collection(db, 'lessons'), where('teacherId', '==', teacherId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedLessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
      // Sort in memory since we don't have a composite index for teacherId + createdAt
      loadedLessons.sort((a, b) => b.createdAt - a.createdAt);
      setLessons(loadedLessons);
    });
    return () => unsubscribe();
  }, [teacherId]);

  useEffect(() => {
    if (lessons.length === 0) return;
    
    // Listen to submissions for all lessons created by this teacher
    const lessonIds = lessons.map(l => l.id);
    // Firestore 'in' query supports up to 10 values. For simplicity, we'll just fetch all and filter if needed, 
    // or use a simple query if we only have a few lessons. Let's just listen to all submissions and filter in memory for prototype.
    const q = query(collection(db, 'submissions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allSubs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      const mySubs = allSubs.filter(sub => lessonIds.includes(sub.lessonId));
      mySubs.sort((a, b) => b.createdAt - a.createdAt);
      setSubmissions(mySubs);
    });
    return () => unsubscribe();
  }, [lessons]);

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sectionsList.length === 0) {
      alert("Vui lòng nhập ít nhất 1 phần kiểm tra.");
      return;
    }
    
    // Validate that all sections have answers and criteria
    for (const section of sectionsList) {
      const details = sectionDetails[section];
      if (!details || !details.standardAnswer.trim() || !details.gradingCriteria.trim()) {
        alert(`Vui lòng nhập đầy đủ Đáp án chuẩn và Từ khóa cốt lõi cho phần: ${section}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const sections: TestSection[] = sectionsList.map(name => ({
        name,
        standardAnswer: sectionDetails[name]?.standardAnswer || '',
        gradingCriteria: (sectionDetails[name]?.gradingCriteria || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      }));

      if (editingLessonId) {
        await updateDoc(doc(db, 'lessons', editingLessonId), {
          chapterName,
          sections
        });
        alert('Cập nhật bài kiểm tra thành công!');
      } else {
        await addDoc(collection(db, 'lessons'), {
          teacherId,
          chapterName,
          sections,
          createdAt: Date.now(),
          isActive: false
        });
        alert('Tạo bài kiểm tra thành công!');
      }
      
      setChapterName('');
      setTestSectionsInput('');
      setSectionDetails({});
      setEditingLessonId(null);
      localStorage.removeItem('teacher_chapterName');
      localStorage.removeItem('teacher_testSectionsInput');
      localStorage.removeItem('teacher_sectionDetails');
      setActiveTab('library');
    } catch (error) {
      console.error("Error creating/updating lesson:", error);
      alert('Có lỗi xảy ra khi lưu bài kiểm tra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setChapterName(lesson.chapterName);
    setTestSectionsInput((lesson.sections || []).map(s => s.name).join(', '));
    const details: Record<string, { standardAnswer: string, gradingCriteria: string }> = {};
    (lesson.sections || []).forEach(s => {
      details[s.name] = {
        standardAnswer: s.standardAnswer || '',
        gradingCriteria: (s.gradingCriteria || []).join(', ')
      };
    });
    setSectionDetails(details);
    setActiveTab('create');
  };

  const toggleLessonStatus = async (lesson: Lesson) => {
    try {
      await updateDoc(doc(db, 'lessons', lesson.id), { isActive: !lesson.isActive });
    } catch (error) {
      console.error("Error toggling status:", error);
      alert("Lỗi khi cập nhật trạng thái.");
    }
  };

  const deleteLesson = async (lessonId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bài tập này?")) {
      try {
        await deleteDoc(doc(db, 'lessons', lessonId));
      } catch (error) {
        console.error("Error deleting lesson:", error);
        alert("Lỗi khi xóa bài tập.");
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'library' ? 'bg-[#ff7b00]/10 text-[#ff7b00]' : 'text-gray-500 hover:bg-gray-50'}`}
          onClick={() => setActiveTab('library')}
        >
          Thư viện
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'create' ? 'bg-[#ff7b00]/10 text-[#ff7b00]' : 'text-gray-500 hover:bg-gray-50'}`}
          onClick={() => {
            setActiveTab('create');
            if (editingLessonId) {
              setEditingLessonId(null);
              setChapterName('');
              setTestSectionsInput('');
              setSectionDetails({});
            }
          }}
        >
          {editingLessonId ? 'Sửa đề bài' : 'Tạo đề bài'}
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-[#ff7b00]/10 text-[#ff7b00]' : 'text-gray-500 hover:bg-gray-50'}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Bảng điểm
        </button>
      </div>

      {activeTab === 'create' && (
        <form onSubmit={handleCreateLesson} className="flex flex-col gap-4 pb-10">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 ml-1">Tên chương/bài học</label>
              <input
                type="text"
                required
                placeholder="VD: Định lý tổng 3 góc trong tam giác"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/50 focus:border-[#ff7b00]"
                value={chapterName}
                onChange={(e) => setChapterName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 ml-1">Các phần kiểm tra (cách nhau bằng dấu phẩy)</label>
              <input
                type="text"
                required
                placeholder="VD: Lý thuyết cơ bản, Định lý, Bài tập"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/50 focus:border-[#ff7b00]"
                value={testSectionsInput}
                onChange={(e) => setTestSectionsInput(e.target.value)}
              />
            </div>
          </div>

          {sectionsList.map((section, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-orange-100 flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
              <h3 className="font-bold text-orange-800 text-sm">Phần: {section}</h3>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 ml-1">Đáp án chuẩn</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Nhập văn bản chuẩn mực để AI đối chiếu..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/50 focus:border-[#ff7b00] resize-none"
                  value={sectionDetails[section]?.standardAnswer || ''}
                  onChange={(e) => handleSectionDetailsChange(section, 'standardAnswer', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 ml-1">Từ khóa cốt lõi (cách nhau bằng dấu phẩy)</label>
                <textarea
                  required
                  rows={2}
                  placeholder="VD: tổng ba góc, bằng 180 độ, tam giác"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/50 focus:border-[#ff7b00] resize-none"
                  value={sectionDetails[section]?.gradingCriteria || ''}
                  onChange={(e) => handleSectionDetailsChange(section, 'gradingCriteria', e.target.value)}
                />
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={isSubmitting || sectionsList.length === 0}
            className="mt-2 w-full bg-[#ff7b00] hover:bg-[#e66e00] text-white font-medium py-3 rounded-xl shadow-sm transition-all disabled:opacity-70"
          >
            {isSubmitting ? 'Đang lưu...' : (editingLessonId ? 'Cập nhật đề bài' : 'Lưu cài đặt')}
          </button>
        </form>
      )}

      {activeTab === 'library' && (
        <div className="flex flex-col gap-4 overflow-y-auto pb-10">
          <h2 className="text-xl font-bold text-gray-800">Thư viện đề bài</h2>
          {lessons.length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed">
              Chưa có đề bài nào được tạo.
            </div>
          ) : (
            lessons.map(lesson => {
              return (
                <div key={lesson.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-gray-800">{lesson.chapterName}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{new Date(lesson.createdAt).toLocaleDateString()}</span>
                      <button 
                        onClick={() => toggleLessonStatus(lesson)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${lesson.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {lesson.isActive ? 'Đã mở' : 'Đang ẩn'}
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    <span className="font-semibold">Các phần: </span>
                    {(lesson.sections || []).map(s => s.name).join(', ')}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEditLesson(lesson)}
                      className="whitespace-nowrap bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => deleteLesson(lesson.id)}
                      className="whitespace-nowrap bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="flex flex-col gap-4 overflow-y-auto pb-10">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-orange-600">
                {submissions.length}
              </span>
              <span className="text-xs text-gray-500 uppercase tracking-wider mt-1 font-semibold text-center">Tổng lượt nộp</span>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-blue-600">
                {submissions.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString()).length}
              </span>
              <span className="text-xs text-gray-500 uppercase tracking-wider mt-1 font-semibold text-center">Lượt nộp hôm nay</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Thời gian</th>
                    <th className="px-4 py-3 font-semibold">Học sinh</th>
                    <th className="px-4 py-3 font-semibold">Lớp</th>
                    <th className="px-4 py-3 font-semibold">STT</th>
                    <th className="px-4 py-3 font-semibold text-center">Điểm</th>
                    <th className="px-4 py-3 font-semibold">Phần kiểm tra</th>
                    <th className="px-4 py-3 font-semibold">Bài làm</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                        Chưa có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    submissions.map((sub, index) => (
                      <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{new Date(sub.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-600">{sub.studentName}</td>
                        <td className="px-4 py-3 text-gray-600">{sub.studentClass}</td>
                        <td className="px-4 py-3 text-gray-600">{sub.studentOrder}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md font-bold ${
                            sub.score >= 8 ? 'bg-green-100 text-green-700' : 
                            sub.score >= 5 ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-red-100 text-red-700'
                          }`}>
                            {sub.score}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{sub.testSection}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={sub.transcript}>
                          {sub.transcript}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Student Panel ---
function StudentPanel({ 
  studentName, 
  studentClass, 
  studentOrder, 
  studentPin 
}: { 
  studentName: string, 
  studentClass: string, 
  studentOrder: string, 
  studentPin: string 
}) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<Submission | null>(null);
  const [motivationalQuote, setMotivationalQuote] = useState({ text: '', author: '' });
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [studentSubmissions, setStudentSubmissions] = useState<Submission[]>([]);
  const [activeTab, setActiveTab] = useState<'test' | 'history'>('test');

  useEffect(() => {
    const q = query(
      collection(db, 'submissions'), 
      where('studentName', '==', studentName),
      where('studentClass', '==', studentClass),
      where('studentOrder', '==', studentOrder),
      where('studentPin', '==', studentPin)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedSubmissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      loadedSubmissions.sort((a, b) => b.createdAt - a.createdAt);
      setStudentSubmissions(loadedSubmissions);
    });

    return () => unsubscribe();
  }, [studentName, studentClass, studentOrder, studentPin]);

  useEffect(() => {
    const q = query(collection(db, 'lessons'), where('isActive', '==', true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedLessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
      loadedLessons.sort((a, b) => b.createdAt - a.createdAt);
      
      setLessons(loadedLessons);
      
      if (loadedLessons.length === 1) {
        const activeLesson = loadedLessons[0];
        setSelectedLesson(activeLesson);
        if (activeLesson.sections && activeLesson.sections.length === 1) {
          setSelectedSection(activeLesson.sections[0].name);
        }
      } else if (loadedLessons.length === 0) {
        setSelectedLesson(null);
        setSelectedSection('');
      }
    });

    let currentStream: MediaStream | null = null;

    // Setup Camera and Audio (for noise suppression)
    navigator.mediaDevices.getUserMedia({ 
      video: true, 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    })
      .then(stream => {
        currentStream = stream;
        setMediaStream(stream);
      })
      .catch(err => console.error("Camera/Audio error:", err));

    // Setup Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'vi-VN';
      
      rec.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };
      
      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
          alert("Vui lòng cấp quyền sử dụng Micro để làm bài.");
          setIsRecording(false);
        }
      };
      
      setRecognition(rec);
    } else {
      alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói. Vui lòng sử dụng Chrome hoặc Edge.");
    }

    return () => {
      unsubscribe();
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, selectedSection, selectedLesson]);

  const toggleRecording = () => {
    if (!recognition) return;
    
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      setTranscript('');
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleSubmit = async () => {
    if (!selectedLesson || !transcript.trim()) return;
    
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    }
    
    setIsSubmitting(true);
    
    try {
      const sectionData = (selectedLesson.sections || []).find(s => s.name === selectedSection);
      if (!sectionData) {
        alert("Không tìm thấy dữ liệu phần kiểm tra.");
        setIsSubmitting(false);
        return;
      }

      // 1. Semantic Matching & Grading via Gemini
      const prompt = `
        Bạn là một giáo viên Toán học (cô Hiền) đang chấm bài kiểm tra lý thuyết bằng giọng nói của học sinh.
        Học sinh xưng hô là "con", giáo viên là "cô".
        
        Nội dung bài học: ${selectedLesson.chapterName}
        Phần kiểm tra: ${selectedSection}
        Đáp án chuẩn: "${sectionData.standardAnswer || ''}"
        Các từ khóa cốt lõi bắt buộc: ${(sectionData.gradingCriteria || []).join(', ')}
        
        Bài nói của học sinh (được chuyển từ giọng nói sang văn bản): "${transcript}"
        
        Nhiệm vụ:
        1. So sánh ý nghĩa (Semantic Matching): Không bắt lỗi chính tả, ưu tiên đúng bản chất toán học, chấp nhận cách diễn đạt tương đương.
        2. Chấm điểm (0-10) dựa trên mức độ khớp với đáp án chuẩn và việc nêu đủ các từ khóa cốt lõi.
        3. Xác định các từ khóa cốt lõi mà học sinh ĐÃ NÓI (hoặc diễn đạt tương đương).
        4. Xác định các từ khóa cốt lõi mà học sinh CÒN THIẾU.
        5. Viết nhận xét tự động theo cấu trúc 3 Khen - 2 Góp ý dựa trên thang điểm sau:
           - 9-10: 5 khen (giọng rõ, tự tin, nội dung xuất sắc, hiểu bài sâu, thuật ngữ chính xác). Chúc mừng đạt điểm tối đa.
           - 8: 3 khen (rõ, tự tin, nắm ý chính). 2 góp ý (chỉ rõ thiếu từ khóa nào, khuyên nói chậm ở từ khóa quan trọng).
           - 6-7: 3 khen (tự giác, dễ nghe, xác định đối tượng cơ bản). 2 góp ý (liệt kê ý thiếu, nhắc luyện tập thêm).
           - 5: 3 khen (nỗ lực, rõ ràng, nhận diện được bài). 2 góp ý (thiếu từ khóa quan trọng, cần ôn lại đáp án chuẩn).
           - 4: 3 khen (dũng cảm, tự tin, nỗ lực). 2 góp ý (mới đạt 40% nội dung, đọc kỹ đáp án chuẩn và thử lại).
           - 3: 3 khen (nhớ kiến thức cốt lõi, tự tin). 2 góp ý (mới nhắc được ít từ khóa, cần ôn tập thêm).
           - 2: 3 khen (có nói đến toán học, tự tin). 2 góp ý (nội dung chưa đúng, xem lại đáp án chuẩn).
           - 0-1: 3 khen (thái độ to rõ, tự tin). 2 góp ý (nội dung không liên quan/sai, nghiêm túc ôn tập).
           
        Trả về kết quả DƯỚI DẠNG JSON với cấu trúc chính xác như sau (không có markdown, chỉ JSON nguyên bản):
        {
          "score": number,
          "feedback": "string (nhận xét của cô, xuống dòng bằng \\n)",
          "matchedKeywords": ["keyword1", "keyword2"],
          "missingKeywords": ["keyword3"]
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER, description: "Điểm số từ 0 đến 10" },
              feedback: { type: Type.STRING, description: "Nhận xét của cô Hiền" },
              matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Các từ khóa học sinh đã nói đúng" },
              missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Các từ khóa học sinh còn thiếu" }
            },
            required: ["score", "feedback", "matchedKeywords", "missingKeywords"]
          }
        }
      });

      let responseText = response.text || "";
      // Remove markdown code block if present
      if (responseText.startsWith('```json')) {
        responseText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      const resultJson = JSON.parse(responseText.trim());
      
      // 2. Generate Motivational Quote
      const quotes = [
        { text: "Học tập là hạt giống của kiến thức, kiến thức là hạt giống của hạnh phúc.", author: "Ngạn ngữ Gruzia" },
        { text: "Đừng xấu hổ khi không biết, chỉ xấu hổ khi không học.", author: "Ngạn ngữ Nga" },
        { text: "Toán học là ngôn ngữ mà vũ trụ được viết ra.", author: "Galileo Galilei" },
        { text: "Thành công là kết quả của sự hoàn hảo, làm việc chăm chỉ, học hỏi từ thất bại, lòng trung thành và sự kiên trì.", author: "Colin Powell" },
        { text: "Thiên tài là 1% cảm hứng và 99% mồ hôi.", author: "Thomas Edison" }
      ];
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      setMotivationalQuote(randomQuote);

      // 3. Save to Firestore
      const submissionData = {
        lessonId: selectedLesson.id,
        studentName: String(studentName),
        studentClass: String(studentClass),
        studentOrder: String(studentOrder),
        studentPin: String(studentPin),
        testSection: String(selectedSection),
        transcript: String(transcript),
        score: Number(resultJson.score) || 0,
        feedback: String(resultJson.feedback || ""),
        matchedKeywords: Array.isArray(resultJson.matchedKeywords) ? resultJson.matchedKeywords.map(String) : [],
        missingKeywords: Array.isArray(resultJson.missingKeywords) ? resultJson.missingKeywords.map(String) : [],
        createdAt: Date.now()
      };
      
      await addDoc(collection(db, 'submissions'), submissionData);
      setResult(submissionData as Submission);

    } catch (error: any) {
      console.error("Error submitting:", error);
      alert("Có lỗi xảy ra khi chấm điểm: " + (error.message || error) + "\nVui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetTest = () => {
    setResult(null);
    setTranscript('');
    setSelectedSection('');
  };

  if (result) {
    return (
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Kết quả bài làm</h2>
          <p className="text-sm text-gray-500">{selectedLesson?.chapterName} - {selectedSection}</p>
        </div>
        
        <div className="flex justify-center">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center border-8 ${
            result.score >= 8 ? 'border-green-400 bg-green-50 text-green-600' : 
            result.score >= 5 ? 'border-yellow-400 bg-yellow-50 text-yellow-600' : 
            'border-red-400 bg-red-50 text-red-600'
          }`}>
            <span className="text-4xl font-black">{result.score}</span>
            <span className="text-xl font-bold mt-2">/10</span>
          </div>
        </div>

        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
          <h3 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Lời phê của Cô Hiền:
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {result.feedback}
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-2">Bài nói của con:</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {/* Highlight matched keywords in green */}
            {(() => {
              if (!Array.isArray(result.matchedKeywords) || result.matchedKeywords.length === 0) return result.transcript;
              
              let highlightedText = result.transcript;
              // Sort by length descending to avoid partial matches replacing parts of longer matches
              const sortedKeywords = [...result.matchedKeywords].filter(Boolean).sort((a, b) => b.length - a.length);
              if (sortedKeywords.length === 0) return result.transcript;
              
              // We need to be careful with simple string replacement. 
              // A better way is to split by regex and render parts.
              const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const escapedKeywords = sortedKeywords.map(escapeRegExp);
              const regexPattern = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');
              const parts = result.transcript.split(regexPattern);
              
              return parts.map((part, i) => {
                const isMatch = sortedKeywords.some(kw => kw.toLowerCase() === part.toLowerCase());
                if (isMatch) {
                  return <span key={i} className="bg-green-200 text-green-800 px-1 rounded font-medium">{part}</span>;
                }
                return <span key={i}>{part}</span>;
              });
            })()}
          </p>
          
          {Array.isArray(result.missingKeywords) && result.missingKeywords.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-xs font-bold text-red-600 mb-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Từ khóa con nói thiếu:
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {result.missingKeywords.map((kw, idx) => (
                  <span key={idx} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-md font-medium">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {result.score < 9 && selectedLesson && (
          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
            <h3 className="text-sm font-bold text-orange-800 mb-2">Đáp án chuẩn để con ôn lại:</h3>
            <p className="text-sm text-gray-700 leading-relaxed italic">
              "{(selectedLesson.sections || []).find(s => s.name === selectedSection)?.standardAnswer}"
            </p>
          </div>
        )}

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-2xl border border-indigo-100 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-purple-400"></div>
          <img 
            src={`https://picsum.photos/seed/motivation${result.score}/400/200`} 
            alt="Motivation" 
            className="w-full h-32 object-cover rounded-xl mb-3 shadow-sm"
            referrerPolicy="no-referrer"
          />
          <p className="text-sm font-medium text-indigo-900 italic mb-2">"{motivationalQuote.text}"</p>
          <p className="text-xs text-indigo-600 font-bold">— {motivationalQuote.author} —</p>
        </div>

        <button
          onClick={resetTest}
          className="mt-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Làm bài khác
        </button>
      </div>
    );
  }

  if (activeTab === 'history') {
    return (
      <div className="flex flex-col gap-4 h-full">
        <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100 mb-4">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'test' ? 'bg-[#ff7b00]/10 text-[#ff7b00]' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('test')}
          >
            Làm bài
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'history' ? 'bg-[#ff7b00]/10 text-[#ff7b00]' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('history')}
          >
            Lịch sử
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Lịch sử làm bài của {studentName}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 font-semibold">Thời gian</th>
                  <th className="px-4 py-3 font-semibold text-center">Điểm</th>
                  <th className="px-4 py-3 font-semibold">Phần kiểm tra</th>
                  <th className="px-4 py-3 font-semibold">Nhận xét</th>
                </tr>
              </thead>
              <tbody>
                {studentSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      Chưa có dữ liệu làm bài
                    </td>
                  </tr>
                ) : (
                  studentSubmissions.map((sub) => (
                    <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 text-xs">{new Date(sub.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md font-bold ${
                          sub.score >= 8 ? 'bg-green-100 text-green-700' : 
                          sub.score >= 5 ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-red-100 text-red-700'
                        }`}>
                          {sub.score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{sub.testSection}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate" title={sub.feedback}>
                        {sub.feedback}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedLesson) {
    return (
      <div className="flex flex-col gap-4 h-full">
        <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100 mb-4">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'test' ? 'bg-[#ff7b00]/10 text-[#ff7b00]' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('test')}
          >
            Làm bài
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'history' ? 'bg-[#ff7b00]/10 text-[#ff7b00]' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('history')}
          >
            Lịch sử
          </button>
        </div>

        {lessons.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed">
            Hiện tại chưa có bài tập nào được mở.
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-800 px-2">Chọn bài tập</h2>
            <div className="grid gap-3">
              {lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => {
                    setSelectedLesson(lesson);
                    if (lesson.sections && lesson.sections.length === 1) {
                      setSelectedSection(lesson.sections[0].name);
                    }
                  }}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-left hover:border-[#ff7b00]/50 hover:shadow-md transition-all font-medium text-gray-700"
                >
                  {lesson.chapterName}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (!selectedSection) {
    return (
      <div className="flex flex-col gap-4 h-full">
        <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100 mb-4">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'test' ? 'bg-[#ff7b00]/10 text-[#ff7b00]' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('test')}
          >
            Làm bài
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'history' ? 'bg-[#ff7b00]/10 text-[#ff7b00]' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('history')}
          >
            Lịch sử
          </button>
        </div>

        <div className="flex items-center gap-2 px-2">
          {lessons.length > 1 && (
            <button 
              onClick={() => setSelectedLesson(null)}
              className="text-sm text-gray-500 hover:text-[#ff7b00]"
            >
              ← Quay lại
            </button>
          )}
          <h2 className="text-lg font-bold text-gray-800">{selectedLesson.chapterName}</h2>
        </div>
        <p className="text-sm text-gray-600 px-2 mb-2">Con muốn kiểm tra phần nào?</p>
        
        <div className="grid gap-3">
          {(selectedLesson.sections || []).map((section, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedSection(section.name)}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-left hover:border-[#ff7b00]/50 hover:shadow-md transition-all font-medium text-gray-700"
            >
              {section.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100 mb-4">
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'test' ? 'bg-[#ff7b00]/10 text-[#ff7b00]' : 'text-gray-500 hover:bg-gray-50'}`}
          onClick={() => setActiveTab('test')}
        >
          Làm bài
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'history' ? 'bg-[#ff7b00]/10 text-[#ff7b00]' : 'text-gray-500 hover:bg-gray-50'}`}
          onClick={() => setActiveTab('history')}
        >
          Lịch sử
        </button>
      </div>

      <div className="flex justify-between items-center mb-4 px-2">
        <button 
          onClick={() => setSelectedSection('')}
          className="text-sm text-gray-500 hover:text-[#ff7b00]"
        >
          ← Quay lại
        </button>
        <span className="text-xs font-bold bg-orange-100 text-orange-800 px-3 py-1 rounded-full">
          {selectedSection}
        </span>
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center relative min-h-[300px]">
        {/* Camera Preview */}
        <div className="absolute top-4 right-4 w-24 h-32 bg-gray-200 rounded-xl overflow-hidden border-2 border-white shadow-md z-20">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>

        {/* Recording Visualizer / Button */}
        <div className="relative mb-8">
          {isRecording && (
            <>
              <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-20 scale-150"></div>
              <div className="absolute inset-0 bg-red-400 rounded-full animate-pulse opacity-30 scale-125"></div>
            </>
          )}
          <button
            onClick={toggleRecording}
            className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white scale-110' 
                : 'bg-gradient-to-br from-[#ff7b00] to-[#ff9d42] hover:from-[#e66e00] hover:to-[#ff8c21] text-white'
            }`}
          >
            {isRecording ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-10 h-10" />}
          </button>
        </div>

        <p className="text-sm font-medium text-gray-500 mb-4">
          {isRecording ? 'Đang nghe con nói...' : 'Nhấn vào Micro để bắt đầu trả lời'}
        </p>

        {/* Live Transcript */}
        <div className="w-full bg-gray-50 rounded-2xl p-4 min-h-[120px] border border-gray-100">
          {transcript ? (
            <p className="text-gray-800 text-sm leading-relaxed">{transcript}</p>
          ) : (
            <p className="text-gray-400 text-sm italic text-center mt-8">Chữ sẽ hiện ra ở đây khi con nói...</p>
          )}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!transcript.trim() || isSubmitting}
        className="mt-4 w-full bg-[#ff7b00] hover:bg-[#e66e00] text-white font-bold py-4 rounded-2xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" /> Đang chấm điểm...
          </>
        ) : (
          'Nộp bài cho Cô'
        )}
      </button>
    </div>
  );
}
