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

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);


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
        kr_title,
        progress_percent = 0,
        status = 'N/A',
        objective,
        assigned_user,
    } = keyResult;

    const ownerName = assigned_user?.full_name || 'N/A';
    const parentObjectiveUrl = objective ? `/company-okrs/detail/${objective.objective_id}` : '#';

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            {/* Parent Objective Link */}
            {objective && (
                <div className="mb-4">
                    <a href={parentObjectiveUrl} className="text-sm text-blue-600 hover:underline">
                        &larr; {objective.obj_title}
                    </a>
                </div>
            )}

            {/* KR Title */}
            <h1 className="text-2xl font-bold text-gray-800 mb-4">{kr_title}</h1>

            {/* Progress Bar and Status */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">Tiến độ</span>
                    <span className="text-lg font-bold text-blue-600">{Math.round(progress_percent)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                        className="bg-blue-600 h-4 rounded-full"
                        style={{ width: `${progress_percent}%` }}
                    ></div>
                </div>
            </div>

            {/* Status and Owner */}
            <div className="flex items-center justify-between text-sm">
                <div>
                    <span className="font-semibold">Trạng thái: </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(status)}`}>
                        {status.replace('_', ' ').toUpperCase()}
                    </span>
                </div>
                <div>
                    <span className="font-semibold">Chủ sở hữu: </span>
                    <span>{ownerName}</span>
                </div>
            </div>
        </div>
    );
};

const KrMetricDetailsSection = ({ keyResult }) => {
    const {
        target_value = 0,
        current_value = 0,
        unit = 'N/A',
    } = keyResult;
    
    // Assuming start_value is 0 if not provided, as is common.
    const start_value = keyResult.start_value || 0;

    const formatValue = (value) => {
        // You might want to add more sophisticated formatting based on the unit
        return new Intl.NumberFormat('en-US').format(value);
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mt-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Chi tiết Số liệu</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                    <p className="text-sm text-gray-500">Giá trị Bắt đầu</p>
                    <p className="text-2xl font-bold text-gray-800">{formatValue(start_value)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Giá trị Hiện tại</p>
                    <p className="text-2xl font-bold text-blue-600">{formatValue(current_value)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Giá trị Mục tiêu</p>
                    <p className="text-2xl font-bold text-green-600">{formatValue(target_value)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500">Đơn vị</p>
                    <p className="text-2xl font-bold text-gray-800">{unit}</p>
                </div>
            </div>
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
        <div className="bg-white p-6 rounded-lg shadow-md mt-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Trực quan hóa Tiến độ</h2>
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
            <h3 className="font-semibold text-md mb-3">Thảo luận</h3>
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
        <div className="bg-white p-6 rounded-lg shadow-md mt-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Lịch sử & Tương tác</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="font-semibold text-md mb-3">Lịch sử Check-in</h3>
                    <KrCheckInHistory checkIns={keyResult.check_ins} />
                </div>
                <div>
                    <KrCommentSection comments={keyResult.comments} krId={keyResult.kr_id} onCommentPosted={onCommentPosted} />
                </div>
            </div>
        </div>
    );
};


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

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <KrOverviewSection keyResult={keyResult} />
                <KrMetricDetailsSection keyResult={keyResult} />
                <KrProgressVisualizationSection keyResult={keyResult} />
                <KrHistoryAndInteractionSection keyResult={keyResult} onCommentPosted={handleCommentPosted} />
            </div>
        </div>
    );
};

export default KeyResultDetailPage;
