import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Save, User, Mail, Bell, Moon, Sun, Loader, Settings as SettingsIcon } from 'lucide-react';
import Sidebar from './Sidebar';
export default function Settings() {
    <Sidebar />
    const { isDarkMode, toggleTheme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        settings: {
            theme: 'light',
            notifications: true
        }
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/users/me', {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setFormData({
                    name: data.user.name,
                    email: data.user.email,
                    learnerId: data.user.learnerId,
                    settings: data.user.settings || { theme: 'light', notifications: true }
                });
                // Sync local theme state if needed, though ThemeContext handles the actual toggle
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            setMessage({ type: 'error', text: 'Failed to load profile' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name.startsWith('settings.')) {
            const settingName = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                settings: {
                    ...prev.settings,
                    [settingName]: type === 'checkbox' ? checked : value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('http://localhost:3000/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    name: formData.name,
                    settings: formData.settings
                })
            });

            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Settings updated successfully!' });
                // If theme changed in settings, ensure it reflects in context
                if ((data.user.settings.theme === 'dark') !== isDarkMode) {
                    toggleTheme();
                }
            } else {
                // Handle specific error messages
                if (data.message && data.message.includes('duplicate key error')) {
                    setMessage({ type: 'error', text: 'This name is already taken. Please choose another.' });
                } else {
                    setMessage({ type: 'error', text: data.message || 'Failed to update settings' });
                }
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            setMessage({ type: 'error', text: 'An error occurred while saving' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8 pt-24 bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-300">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                    Settings
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8">Manage your account settings and preferences</p>

                {message.text && (
                    <div className={`p-4 mb-6 rounded-xl border backdrop-blur-md ${message.type === 'success'
                        ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                        }`}>
                        {message.text}
                    </div>
                )}

                <div className="backdrop-blur-xl bg-white/80 dark:bg-gray-900/60 border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        {/* Profile Section */}
                        <section>
                            <div>
                                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <User className="w-5 h-5" /> Profile Information
                                </h2>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                value={formData.email}
                                                disabled
                                                className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                            />
                                            <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Learner ID
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={formData.learnerId || ''}
                                                disabled
                                                className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 cursor-not-allowed font-mono"
                                            />
                                            <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Unique identifier for support</p>
                                    </div>
                                </div>
                            </div>    </section>

                        <div className="h-px bg-gray-200 dark:bg-white/10" />

                        {/* Preferences Section */}
                        <section>
                            <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                                    <SettingsIcon className="w-5 h-5" />
                                </div>
                                Preferences
                            </h2>

                            <div className="grid gap-4">
                                <div className="flex items-center justify-between p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-indigo-500/30 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl transition-colors ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-orange-100 text-orange-500'}`}>
                                            {isDarkMode ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">Appearance</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {isDarkMode ? 'Dark mode is active' : 'Light mode is active'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            toggleTheme();
                                            setFormData(prev => ({
                                                ...prev,
                                                settings: { ...prev.settings, theme: !isDarkMode ? 'dark' : 'light' }
                                            }));
                                        }}
                                        className="px-5 py-2.5 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/20 transition-all shadow-sm"
                                    >
                                        Toggle Theme
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-indigo-500/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                                            <Bell className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">Notifications</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Receive updates about your progress
                                            </p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="settings.notifications"
                                            checked={formData.settings.notifications}
                                            onChange={handleChange}
                                            className="sr-only peer"
                                        />
                                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300/30 dark:peer-focus:ring-indigo-800/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        </section>

                        <div className="pt-6 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                            >
                                {saving ? (
                                    <>
                                        <Loader className="w-5 h-5 animate-spin" />
                                        Saving Changes...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
