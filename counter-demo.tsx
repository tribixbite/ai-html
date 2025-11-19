import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
    const [count, setCount] = useState(0);
    const [history, setHistory] = useState<number[]>([0]);

    const increment = () => {
        const newCount = count + 1;
        setCount(newCount);
        setHistory(prev => [...prev.slice(-9), newCount]);
    };

    const decrement = () => {
        const newCount = count - 1;
        setCount(newCount);
        setHistory(prev => [...prev.slice(-9), newCount]);
    };

    const reset = () => {
        setCount(0);
        setHistory([0]);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-700/50 w-full max-w-md">
                <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-8">
                    Counter Demo
                </h1>

                <div className="text-7xl font-bold text-center text-white mb-8 font-mono">
                    {count}
                </div>

                <div className="flex gap-3 mb-8">
                    <button
                        onClick={decrement}
                        className="flex-1 py-4 px-6 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-semibold text-xl transition-all hover:scale-105 active:scale-95"
                    >
                        −
                    </button>
                    <button
                        onClick={reset}
                        className="py-4 px-6 bg-gray-600/30 hover:bg-gray-600/50 text-gray-300 rounded-xl font-medium transition-all hover:scale-105 active:scale-95"
                    >
                        Reset
                    </button>
                    <button
                        onClick={increment}
                        className="flex-1 py-4 px-6 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl font-semibold text-xl transition-all hover:scale-105 active:scale-95"
                    >
                        +
                    </button>
                </div>

                <div className="bg-gray-900/50 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">History</h3>
                    <div className="flex gap-2 flex-wrap">
                        {history.map((val, i) => (
                            <span
                                key={i}
                                className={`px-3 py-1 rounded-lg text-sm font-mono ${
                                    i === history.length - 1
                                        ? 'bg-purple-500/30 text-purple-300'
                                        : 'bg-gray-700/50 text-gray-400'
                                }`}
                            >
                                {val}
                            </span>
                        ))}
                    </div>
                </div>

                <p className="text-center text-gray-500 text-sm mt-6">
                    Built with React + TSX
                </p>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
