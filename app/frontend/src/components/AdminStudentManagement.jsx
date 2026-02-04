import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Plus, Trash2, Users, CheckCircle,
    XCircle, AlertCircle, Upload, Download
} from 'lucide-react';
import "../styles/DevvoraStyles.css";

export default function AdminStudentManagement() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [requireVerification, setRequireVerification] = useState(false);
    const [newStudent, setNewStudent] = useState({ registerNumber: '', name: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
    const API_BASE = `${BASE_URL}/api`;

    useEffect(() => {
        fetchExamAndStudents();
    }, [examId]);

    const fetchExamAndStudents = async () => {
        try {
            // Fetch exam details
            const examRes = await fetch(`${API_BASE}/exams/admin/list`, {
                credentials: 'include'
            });
            const examData = await examRes.json();
            if (examData.success) {
                const currentExam = examData.data.find(e => e._id === examId);
                setExam(currentExam);
                setRequireVerification(currentExam?.requireStudentVerification || false);
            }

            // Fetch students
            const studentsRes = await fetch(`${API_BASE}/exams/admin/${examId}/students`, {
                credentials: 'include'
            });
            const studentsData = await studentsRes.json();
            if (studentsData.success) {
                setStudents(studentsData.data);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
            setError("Failed to load exam data");
        } finally {
            setLoading(false);
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!newStudent.registerNumber || !newStudent.name) {
            setError('Both register number and name are required');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/exams/admin/${examId}/students`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newStudent),
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success) {
                setStudents(data.data);
                setNewStudent({ registerNumber: '', name: '' });
                setSuccess('Student added successfully');
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.message || 'Failed to add student');
            }
        } catch (error) {
            console.error("Failed to add student:", error);
            setError('Failed to add student');
        }
    };

    const handleRemoveStudent = async (registerNumber) => {
        if (!confirm('Are you sure you want to remove this student?')) return;

        try {
            const res = await fetch(`${API_BASE}/exams/admin/${examId}/students/${registerNumber}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success) {
                setStudents(data.data);
                setSuccess('Student removed successfully');
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (error) {
            console.error("Failed to remove student:", error);
            setError('Failed to remove student');
        }
    };

    const handleToggleVerification = async () => {
        try {
            const res = await fetch(`${API_BASE}/exams/admin/${examId}/student-verification`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requireStudentVerification: !requireVerification }),
                credentials: 'include'
            });

            if (res.ok) {
                setRequireVerification(!requireVerification);
                setSuccess('Verification setting updated');
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (error) {
            console.error("Failed to update verification:", error);
            setError('Failed to update verification setting');
        }
    };

    if (loading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-content">
                    <button className="back-btn" onClick={() => navigate('/admin/exams')}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1>Manage Students</h1>
                        <p>{exam?.title}</p>
                    </div>
                </div>
            </header>

            {/* Verification Toggle */}
            <div className="verification-toggle-card">
                <div className="toggle-info">
                    <div className="toggle-icon">
                        <Users size={24} />
                    </div>
                    <div>
                        <h3>Student Verification</h3>
                        <p>
                            {requireVerification
                                ? 'Only pre-registered students can take this exam'
                                : 'Any student with the access code can take this exam'}
                        </p>
                    </div>
                </div>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={requireVerification}
                        onChange={handleToggleVerification}
                    />
                    <span className="toggle-slider"></span>
                </label>
            </div>

            {/* Messages */}
            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}
            {success && (
                <div className="alert alert-success">
                    <CheckCircle size={20} />
                    <span>{success}</span>
                </div>
            )}

            {/* Add Student Form */}
            <div className="add-student-card">
                <h3>Add Student</h3>
                <form onSubmit={handleAddStudent} className="add-student-form">
                    <div className="form-row">
                        <input
                            type="text"
                            placeholder="Register Number (e.g., REG001)"
                            value={newStudent.registerNumber}
                            onChange={(e) => setNewStudent({ ...newStudent, registerNumber: e.target.value })}
                            className="form-input"
                        />
                        <input
                            type="text"
                            placeholder="Student Name"
                            value={newStudent.name}
                            onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                            className="form-input"
                        />
                        <button type="submit" className="btn-primary">
                            <Plus size={20} />
                            Add
                        </button>
                    </div>
                </form>
            </div>

            {/* Students List */}
            <div className="students-list-card">
                <div className="card-header">
                    <h3>
                        <Users size={20} />
                        Registered Students ({students.length})
                    </h3>
                </div>

                {students.length === 0 ? (
                    <div className="empty-state-small">
                        <Users size={32} />
                        <p>No students added yet</p>
                        <span>Add students using the form above</span>
                    </div>
                ) : (
                    <div className="students-table-container">
                        <table className="students-table">
                            <thead>
                                <tr>
                                    <th>Register Number</th>
                                    <th>Name</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student) => (
                                    <tr key={student.registerNumber}>
                                        <td>
                                            <code className="register-number">{student.registerNumber}</code>
                                        </td>
                                        <td>{student.name}</td>
                                        <td>
                                            {student.hasCompleted ? (
                                                <span className="status-badge completed">
                                                    <CheckCircle size={14} />
                                                    Completed
                                                </span>
                                            ) : student.hasAttempted ? (
                                                <span className="status-badge in-progress">
                                                    <AlertCircle size={14} />
                                                    In Progress
                                                </span>
                                            ) : (
                                                <span className="status-badge pending">
                                                    <XCircle size={14} />
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className="btn-icon-danger"
                                                onClick={() => handleRemoveStudent(student.registerNumber)}
                                                title="Remove Student"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
