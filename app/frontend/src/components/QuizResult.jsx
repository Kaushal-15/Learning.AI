import { useNavigate } from 'react-router-dom';

export default function QuizResult() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Quiz Result</h2>
                <p className="text-gray-600 mb-6">This component is under development.</p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
                >
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
}
