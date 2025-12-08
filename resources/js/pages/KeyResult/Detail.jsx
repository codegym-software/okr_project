import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { format } from 'date-fns';
import { PlayIcon, ArrowTrendingUpIcon, TrophyIcon, TagIcon } from '@heroicons/react/24/outline';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

// --- Reusable Tabs Component ---
const Tabs = ({ tabs }) => {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <div>
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map((tab, index) => (
                        <button
                            key={tab.name}
                            onClick={() => setActiveTab(index)}
                            className={`${
                                index === activeTab
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="py-6">
                {tabs[activeTab]?.content}
            </div>
        </div>
    );
};


// --- Helper Functions ---
const getStatusClass = (status) => {
    // This function can be customized based on the actual status values
    switch (status?.toLowerCase()) {
        case 'on track':
        case 'on_track':
            return 'bg-green-100 text-green-800';
        case 'at risk':
        case 'at_risk':
            return 'bg-yellow-100 text-yellow-800';
        case 'behind':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

// --- Section Components ---

const KrOverviewSection = ({ keyResult }) => {
    const {
        progress_percent = 0,
        status = 'N/A',
        objective,
        assigned_user,
    } = keyResult;

    const ownerName = assigned_user?.full_name || 'N/A';
    const parentObjectiveUrl = objective ? `/company-okrs/detail/${objective.objective_id}` : '#';

    const circumference = 2 * Math.PI * 20; // Radius is 20

    return (
        <div>
            {objective && (
                <div className="mb-4">
                    <a href={parentObjectiveUrl} className="text-sm text-blue-600 hover:underline flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        {objective.obj_title}
                    </a>
                </div>
            )}

            <div className="flex items-center justify-center my-6">
                <div className="relative h-32 w-32">
                    <svg className="h-full w-full" viewBox="0 0 50 50">
                        <circle
                            className="text-gray-200"
                            strokeWidth="5"
                            stroke="currentColor"
                            fill="transparent"
                            r="20"
                            cx="25"
                            cy="25"
                        />
                        <circle
                            className="text-blue-600"
                            strokeWidth="5"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference - (progress_percent / 100) * circumference}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="20"
                            cx="25"
                            cy="25"
                            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                        />
                    </svg>
                    <div className="absolute top-0 left-0 h-full w-full flex items-center justify-center">
                        <span className="text-2xl font-bold text-blue-600">
                            {Math.round(progress_percent)}%
                        </span>
                    </div>
                </div>
            </div>

            <dl className="space-y-2 text-sm">
                <div className="flex items-center">
                    <dt className="font-semibold w-24">Trạng thái:</dt>
                    <dd>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(status)}`}>
                            {status.replace('_', ' ').toUpperCase()}
                        </span>
                    </dd>
                </div>
                <div className="flex items-center">
                    <dt className="font-semibold w-24">Chủ sở hữu:</dt>
                    <dd className="text-gray-800">{ownerName}</dd>
                </div>
            </dl>
        </div>
    );
};

const KrMetricDetailsSection = ({ keyResult }) => {
    const {
        target_value = 0,
        current_value = 0,
        unit = 'N/A',
    } = keyResult;
    
    const start_value = keyResult.start_value || 0;

    const formatValue = (value) => {
        return new Intl.NumberFormat('en-US').format(value);
    }

    return (
        <div>
            <dl className="space-y-4">
                <div className="flex items-center">
                    <div className="flex-shrink-0 bg-gray-100 rounded-lg p-2">
                        <PlayIcon className="h-6 w-6 text-gray-500" />
                    </div>
                    <div className="ml-4">
                        <dt className="text-sm font-medium text-gray-500">Giá trị Bắt đầu</dt>
                        <dd className="text-lg font-semibold text-gray-900">{formatValue(start_value)}</dd>
                    </div>
                </div>
                <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-100 rounded-lg p-2">
                        <ArrowTrendingUpIcon className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="ml-4">
                        <dt className="text-sm font-medium text-gray-500">Giá trị Hiện tại</dt>
                        <dd className="text-lg font-semibold text-blue-600">{formatValue(current_value)}</dd>
                    </div>
                </div>
                <div className="flex items-center">
                    <div className="flex-shrink-0 bg-green-100 rounded-lg p-2">
                        <TrophyIcon className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="ml-4">
                        <dt className="text-sm font-medium text-gray-500">Giá trị Mục tiêu</dt>
                        <dd className="text-lg font-semibold text-green-600">{formatValue(target_value)}</dd>
                    </div>
                </div>
                <div className="flex items-center">
                    <div className="flex-shrink-0 bg-gray-100 rounded-lg p-2">
                        <TagIcon className="h-6 w-6 text-gray-500" />
                    </div>
                    <div className="ml-4">
                        <dt className="text-sm font-medium text-gray-500">Đơn vị</dt>
                        <dd className="text-lg font-semibold text-gray-900">{unit}</dd>
                    </div>
                </div>
            </dl>
        </div>
    );
};

const KrProgressVisualizationSection = ({ keyResult }) => {
    const { check_ins = [], start_value = 0, created_at, target_value } = keyResult;

    const chartData = {
        labels: [format(new Date(created_at), 'dd/MM/yyyy'), ...check_ins.map(ci => format(new Date(ci.created_at), 'dd/MM/yyyy'))],
        datasets: [
            {
                label: 'Giá trị Hiện tại',
                data: [start_value, ...check_ins.map(ci => ci.progress_value)],
                fill: false,
                borderColor: 'rgb(59, 130, 246)',
                tension: 0.1,
                pointBackgroundColor: 'rgb(59, 130, 246)',
            },
            {
                label: 'Giá trị Mục tiêu',
                data: Array(check_ins.length + 1).fill(target_value),
                fill: false,
                borderColor: 'rgb(22, 163, 74)',
                borderDash: [5, 5],
                pointRadius: 0,
            }
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Biểu đồ Tiến độ theo Thời gian',
            },
        },
        scales: {
            y: {
                beginAtZero: true,
            }
        }
    };
    
    return (
        <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">Trực quan hóa Tiến độ</h3>
            {check_ins.length > 0 ? (
                <Line options={chartOptions} data={chartData} />
            ) : (
                <div className="text-center text-gray-500 py-8">
                    Chưa có đủ dữ liệu check-in để vẽ biểu đồ.
                </div>
            )}
        </div>
    );
};

const KrCheckInHistory = ({ checkIns }) => {
    if (!checkIns || checkIns.length === 0) {
        return <p className="text-gray-500 text-sm">Chưa có lịch sử check-in.</p>;
    }

    return (
        <div className="space-y-4">
            {checkIns.slice().reverse().map(ci => (
                <div key={ci.check_in_id} className="text-sm p-3 border-l-4 border-gray-200 bg-gray-50 rounded-r-lg">
                    <p>
                        <strong>{ci.user?.full_name || '...'}</strong> đã check-in
                        với giá trị <strong>{ci.current_value}</strong>.
                    </p>
                    {ci.notes && <p className="text-gray-700 mt-1 italic">"{ci.notes}"</p>}
                    <div className="text-xs text-gray-500 mt-1">
                        <span>{format(new Date(ci.created_at), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

const KrCommentSection = ({ comments, krId, onCommentPosted }) => {
    const handleSubmitted = () => {
        if (onCommentPosted) onCommentPosted();
    };

    return (
        <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">Thảo luận</h3>
            <div className="space-y-4">
                <CommentForm krId={krId} onSubmitted={handleSubmitted} />
                {comments?.length > 0 ? (
                    comments.map(comment => (
                        <Comment key={comment.id} comment={comment} krId={krId} />
                    ))
                ) : (
                    <p className="text-gray-500 text-sm text-center py-4">Chưa có bình luận nào.</p>
                )}
            </div>
        </div>
    );
};

const Comment = ({ comment, krId }) => {
    const [showReplyForm, setShowReplyForm] = useState(false);
    return (
        <div className="py-2">
            <div className="flex items-start">
                <img src={comment.user?.avatar_url || '/images/default.png'} alt={comment.user?.full_name} className="w-8 h-8 rounded-full mr-3" />
                <div className="flex-1 bg-gray-100 rounded-lg px-3 py-2">
                    <div className="font-semibold text-sm">{comment.user?.full_name}</div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment.content}</p>
                </div>
            </div>
            <div className="ml-11 text-xs text-gray-500 mt-1 flex items-center">
                <span>{format(new Date(comment.created_at), 'dd/MM/yyyy')}</span>
                <button onClick={() => setShowReplyForm(!showReplyForm)} className="ml-4 font-semibold hover:underline">Trả lời</button>
            </div>
            {showReplyForm && <CommentForm krId={krId} parentId={comment.id} onSubmitted={() => setShowReplyForm(false)} />}
            {comment.replies && comment.replies.length > 0 && (
                <div className="ml-8 mt-2 pl-4 border-l-2">
                    {comment.replies.map(reply => <Comment key={reply.id} comment={reply} krId={krId} />)}
                </div>
            )}
        </div>
    );
};

const CommentForm = ({ krId, parentId = null, onSubmitted }) => {
    const [content, setContent] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});

    const submit = async (e) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const response = await fetch(`/api/company-okrs/detail/kr/${krId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': token,
                },
                body: JSON.stringify({
                    content: content,
                    parent_id: parentId,
                }),
            });

            if (response.status === 422) {
                const errorData = await response.json();
                setErrors(errorData.errors);
                return;
            }

            if (!response.ok) {
                throw new Error('Something went wrong');
            }

            setContent('');
            if (onSubmitted) onSubmitted();
        } catch (error) {
            setErrors({ form: 'Could not submit your comment. Please try again.' });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <form onSubmit={submit} className={`mt-2 ${parentId ? 'ml-8' : ''}`}>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm text-sm"
                placeholder={parentId ? "Viết trả lời..." : "Viết bình luận..."}
                rows={parentId ? 2 : 3}
            ></textarea>
            {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content[0]}</p>}
            {errors.form && <p className="text-red-500 text-xs mt-1">{errors.form}</p>}
            <div className="flex justify-end mt-2">
                <button type="submit" disabled={processing} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-300">
                    {processing ? 'Đang gửi...' : 'Gửi'}
                </button>
            </div>
        </form>
    );
};

const KrHistoryAndInteractionSection = ({ keyResult, onCommentPosted }) => {
    return (
        <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">Lịch sử & Tương tác</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Lịch sử Check-in</h3>
                    <KrCheckInHistory checkIns={keyResult.check_ins} />
                </div>
                <div>
                    <KrCommentSection comments={keyResult.comments} krId={keyResult.kr_id} onCommentPosted={onCommentPosted} />
                </div>
            </div>
        </div>
    );
};


const KrDetailsSection = ({ keyResult }) => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar (now on the left) */}
        <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">Tổng quan</h3>
                <KrOverviewSection keyResult={keyResult} />
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <KrMetricDetailsSection keyResult={keyResult} />
            </div>
        </div>

        {/* Main Content (now on the right) */}
        <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <KrProgressVisualizationSection keyResult={keyResult} />
            </div>
        </div>
    </div>
);

// --- Main Page Component ---
const KeyResultDetailPage = () => {
    const [keyResult, setKeyResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getKeyResultIdFromUrl = () => {
        const pathParts = window.location.pathname.split('/');
        // Assuming URL is /key-results/detail/{id}
        return pathParts[pathParts.length - 1];
    };

    const fetchData = async () => {
        const krId = getKeyResultIdFromUrl();
        if (!krId) {
            setError("Không tìm thấy ID của Key Result trong URL.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`/api/company-okrs/detail/kr/${krId}?_t=${new Date().getTime()}`, {
                headers: { 
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                }
            });

            if (!response.ok) {
                const errorJson = await response.json();
                throw new Error(errorJson.message || 'Network response was not ok');
            }
            
            const json = await response.json();

            if (json.success) {
                setKeyResult(json.data);
            } else {
                throw new Error(json.message || 'Không thể tải dữ liệu Key Result.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [window.location.pathname]);

    if (loading) return <div className="p-8 text-center">Đang tải dữ liệu Key Result...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Lỗi: {error}</div>;
    if (!keyResult) return <div className="p-8 text-center">Không tìm thấy Key Result.</div>;
    
    const handleCommentPosted = () => fetchData();

    const krTabs = [
        { name: 'Chi tiết', content: <KrDetailsSection keyResult={keyResult} /> },
        { name: 'Lịch sử & Tương tác', content: <KrHistoryAndInteractionSection keyResult={keyResult} onCommentPosted={handleCommentPosted} /> },
    ];

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="mb-6">
                    <p className="text-sm text-gray-500">Key Result Detail</p>
                    <h1 className="text-2xl font-bold text-gray-800">{keyResult.kr_title}</h1>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md">
                   <Tabs tabs={krTabs} />
                </div>
            </div>
        </div>
    );
};

export default KeyResultDetailPage;
