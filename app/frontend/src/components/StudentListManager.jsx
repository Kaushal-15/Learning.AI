import { useState, useEffect } from 'react';
import {
    Users, Plus, Trash2, Save, Download, FileText,
    AlertCircle, CheckCircle, Edit2, X, UploadCloud
} from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_BASE = `${BASE_URL}/api`;

export default function StudentListManager({ students = [], onStudentsChange, isDarkMode }) {
    const [savedLists, setSavedLists] = useState([]);
    const [loadingLists, setLoadingLists] = useState(false);
    const [selectedListId, setSelectedListId] = useState('');

    // Single student input
    const [newReg, setNewReg] = useState('');
    const [newName, setNewName] = useState('');
    const [inputError, setInputError] = useState('');

    // Save as list modal
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveListName, setSaveListName] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Manage lists modal
    const [showManageModal, setShowManageModal] = useState(false);
    const [editingListId, setEditingListId] = useState(null);
    const [editingListName, setEditingListName] = useState('');

    // CSV Import modal
    const [showCsvModal, setShowCsvModal] = useState(false);
    const [csvText, setCsvText] = useState('');
    const [csvError, setCsvError] = useState('');

    useEffect(() => {
        fetchSavedLists();
    }, []);

    const fetchSavedLists = async () => {
        setLoadingLists(true);
        try {
            const res = await fetch(`${API_BASE}/student-lists`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setSavedLists(data.data || []);
                }
            }
        } catch (err) {
            console.warn('Failed to fetch student lists:', err.message);
        } finally {
            setLoadingLists(false);
        }
    };

    // Add single student
    const handleAddStudent = () => {
        setInputError('');
        const reg = newReg.trim().toUpperCase();
        const name = newName.trim();

        if (!reg || !name) {
            setInputError('Both Register Number and Student Name are required');
            return;
        }

        if (students.some(s => (s.registerNumber || '').trim().toUpperCase() === reg)) {
            setInputError(`Student with register number "${reg}" already exists in this exam`);
            return;
        }

        if (students.length >= 2000) {
            setInputError('Cannot add more than 2,000 students to an exam');
            return;
        }

        onStudentsChange([...students, { registerNumber: reg, name, hasAttempted: false }]);
        setNewReg('');
        setNewName('');
    };

    // Remove single student
    const handleRemoveStudent = (reg) => {
        onStudentsChange(students.filter(s => (s.registerNumber || '').trim().toUpperCase() !== reg.trim().toUpperCase()));
    };

    // Save current students as a reusable list
    const handleSaveList = async (e) => {
        e.preventDefault();
        setSaveError('');
        setSaveSuccess('');

        const name = saveListName.trim();
        if (!name) {
            setSaveError('List name is required');
            return;
        }

        if (students.length === 0) {
            setSaveError('No students to save');
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch(`${API_BASE}/student-lists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name,
                    students: students.map(s => ({
                        registerNumber: (s.registerNumber || '').trim().toUpperCase(),
                        name: (s.name || '').trim()
                    }))
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setSaveSuccess(`List "${name}" saved successfully!`);
                setSaveListName('');
                fetchSavedLists();
                setTimeout(() => setShowSaveModal(false), 1200);
            } else {
                setSaveError(data.message || 'Failed to save list');
            }
        } catch (err) {
            setSaveError('Error saving student list: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Load saved list and copy students into the exam
    const handleLoadList = async (listId) => {
        if (!listId) return;
        try {
            const res = await fetch(`${API_BASE}/student-lists/${listId}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.data?.students) {
                    const loadedStudents = data.data.students;

                    // Deduplicate loaded students against existing students
                    const seen = new Set(students.map(s => (s.registerNumber || '').trim().toUpperCase()));
                    const newEntries = [];

                    for (const s of loadedStudents) {
                        const reg = (s.registerNumber || '').trim().toUpperCase();
                        if (!seen.has(reg)) {
                            seen.add(reg);
                            newEntries.push({
                                registerNumber: reg,
                                name: (s.name || '').trim(),
                                hasAttempted: false
                            });
                        }
                    }

                    const combined = [...students, ...newEntries].slice(0, 2000);
                    onStudentsChange(combined);
                    setSelectedListId('');
                }
            }
        } catch (err) {
            alert('Failed to load list: ' + err.message);
        }
    };

    // Rename a saved list
    const handleRenameList = async (listId) => {
        const name = editingListName.trim();
        if (!name) return;

        try {
            const res = await fetch(`${API_BASE}/student-lists/${listId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                setEditingListId(null);
                setEditingListName('');
                fetchSavedLists();
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to rename list');
            }
        } catch (err) {
            alert('Error renaming list: ' + err.message);
        }
    };

    // Delete a saved list
    const handleDeleteList = async (listId, listName) => {
        if (!window.confirm(`Are you sure you want to delete saved list "${listName}"? Existing exams using this list will NOT be affected.`)) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/student-lists/${listId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (res.ok) {
                fetchSavedLists();
            }
        } catch (err) {
            alert('Error deleting list: ' + err.message);
        }
    };

    // CSV Parse & Import
    const handleImportCsv = () => {
        setCsvError('');
        if (!csvText.trim()) {
            setCsvError('Please paste CSV data');
            return;
        }

        const lines = csvText.trim().split(/\r?\n/);
        const parsed = [];
        const seen = new Set(students.map(s => (s.registerNumber || '').trim().toUpperCase()));

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Handle comma or tab separated
            const parts = line.split(/[,\t]/);
            if (parts.length >= 2) {
                const reg = parts[0].trim().replace(/^["']|["']$/g, '').toUpperCase();
                const name = parts[1].trim().replace(/^["']|["']$/g, '');

                // Skip header line if detected
                if (i === 0 && (reg.includes('REGISTER') || reg.includes('REG') || reg.includes('ID'))) {
                    continue;
                }

                if (reg && name && !seen.has(reg)) {
                    seen.add(reg);
                    parsed.push({ registerNumber: reg, name, hasAttempted: false });
                }
            }
        }

        if (parsed.length === 0) {
            setCsvError('No valid student records found. Expected format: registerNumber,name');
            return;
        }

        const combined = [...students, ...parsed].slice(0, 2000);
        onStudentsChange(combined);
        setCsvText('');
        setShowCsvModal(false);
    };

    return (
        <div className="space-y-6">
            {/* Action Bar: Live Count, Save as List, Load List, Import CSV */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#131d33] border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                                {students.length} {students.length === 1 ? 'student' : 'students'}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold">
                                Live Count
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Registered candidates for this exam
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Load Saved List Dropdown */}
                    <div className="flex items-center gap-1.5">
                        <select
                            value={selectedListId}
                            onChange={(e) => {
                                setSelectedListId(e.target.value);
                                handleLoadList(e.target.value);
                            }}
                            className="text-xs font-semibold px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">📂 Load Saved List ({savedLists.length})</option>
                            {savedLists.map(list => (
                                <option key={list._id} value={list._id}>
                                    {list.name} ({list.studentCount} students)
                                </option>
                            ))}
                        </select>

                        {savedLists.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowManageModal(true)}
                                className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
                                title="Manage Saved Lists"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Save as List Button */}
                    <button
                        type="button"
                        onClick={() => {
                            setSaveError('');
                            setSaveSuccess('');
                            setShowSaveModal(true);
                        }}
                        disabled={students.length === 0}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-all disabled:opacity-40 shadow-sm"
                    >
                        <Save className="w-3.5 h-3.5" />
                        Save as List
                    </button>

                    {/* Import CSV Button */}
                    <button
                        type="button"
                        onClick={() => setShowCsvModal(true)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 transition-all"
                    >
                        <UploadCloud className="w-3.5 h-3.5" />
                        Import CSV
                    </button>
                </div>
            </div>

            {/* Quick Add Form */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#131d33] border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Add Individual Student</h4>
                {inputError && (
                    <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{inputError}</span>
                    </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        placeholder="Register Number (e.g. 21CS045)"
                        value={newReg}
                        onChange={(e) => setNewReg(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                        className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-wider font-mono"
                    />
                    <input
                        type="text"
                        placeholder="Full Student Name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                        className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="button"
                        onClick={handleAddStudent}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Add Student
                    </button>
                </div>
            </div>

            {/* Students Table */}
            <div className="rounded-2xl bg-white dark:bg-[#131d33] border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 sticky top-0 border-b border-gray-100 dark:border-gray-800">
                            <tr>
                                <th className="py-3 px-4 font-semibold w-12 text-center">#</th>
                                <th className="py-3 px-4 font-semibold">Register Number</th>
                                <th className="py-3 px-4 font-semibold">Student Name</th>
                                <th className="py-3 px-4 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {students.map((student, idx) => (
                                <tr key={student.registerNumber} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                                    <td className="py-2.5 px-4 text-center text-gray-400">{idx + 1}</td>
                                    <td className="py-2.5 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">
                                        {student.registerNumber}
                                    </td>
                                    <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-200">
                                        {student.name}
                                    </td>
                                    <td className="py-2.5 px-4 text-right">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveStudent(student.registerNumber)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                            title="Remove student"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {students.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-gray-400 text-xs">
                                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        <span>No students registered yet. Add individually, load a saved list, or import CSV.</span>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SAVE AS LIST MODAL */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 mb-4">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <Save className="w-4 h-4 text-emerald-500" />
                                Save as Reusable Student List
                            </h3>
                            <button onClick={() => setShowSaveModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {saveError && (
                            <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 text-xs">
                                {saveError}
                            </div>
                        )}
                        {saveSuccess && (
                            <div className="p-3 mb-4 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-600 text-xs">
                                {saveSuccess}
                            </div>
                        )}

                        <form onSubmit={handleSaveList} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    List Name *
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Computer Science Class 2026"
                                    value={saveListName}
                                    onChange={(e) => setSaveListName(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Saves {students.length} students to your personal list library for reuse across any exam.
                                </p>
                            </div>

                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowSaveModal(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving || !saveListName.trim()}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
                                >
                                    {isSaving ? 'Saving...' : 'Save Student List'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MANAGE SAVED LISTS MODAL */}
            {showManageModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 mb-4">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-500" />
                                Manage Saved Student Lists
                            </h3>
                            <button onClick={() => setShowManageModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {savedLists.map(list => (
                                <div key={list._id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 text-xs">
                                    {editingListId === list._id ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <input
                                                type="text"
                                                value={editingListName}
                                                onChange={(e) => setEditingListName(e.target.value)}
                                                className="flex-1 px-2 py-1 rounded-lg border border-blue-500 bg-white dark:bg-gray-900 text-xs"
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRenameList(list._id)}
                                                className="px-2 py-1 bg-blue-600 text-white rounded-lg text-xs"
                                            >
                                                Save
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditingListId(null)}
                                                className="px-2 py-1 border rounded-lg text-xs"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <div className="font-bold text-gray-900 dark:text-white">{list.name}</div>
                                                <div className="text-gray-500 text-[11px]">{list.studentCount} students</div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingListId(list._id);
                                                        setEditingListName(list.name);
                                                    }}
                                                    className="p-1.5 rounded-lg border hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                                                    title="Rename"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteList(list._id, list.name)}
                                                    className="p-1.5 rounded-lg border hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {savedLists.length === 0 && (
                                <p className="text-center text-gray-400 py-6 text-xs">No saved lists found.</p>
                            )}
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-right mt-4">
                            <button
                                type="button"
                                onClick={() => setShowManageModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CSV IMPORT MODAL */}
            {showCsvModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 mb-4">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <UploadCloud className="w-4 h-4 text-blue-500" />
                                Import / Paste Student CSV
                            </h3>
                            <button onClick={() => setShowCsvModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {csvError && (
                            <div className="p-3 mb-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 text-red-600 text-xs">
                                {csvError}
                            </div>
                        )}

                        <div className="space-y-3">
                            <p className="text-xs text-gray-500">
                                Paste rows formatted as: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded font-mono">registerNumber,name</code>
                            </p>
                            <textarea
                                rows={7}
                                placeholder="REG001,John Doe&#10;REG002,Jane Smith&#10;REG003,Alex Kumar"
                                value={csvText}
                                onChange={(e) => setCsvText(e.target.value)}
                                className="w-full p-3 rounded-xl text-xs font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex justify-between items-center text-[11px] text-gray-400">
                                <span>Duplicates by register number are automatically skipped.</span>
                            </div>

                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCsvModal(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleImportCsv}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    Add Students to Exam
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
