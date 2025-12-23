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
import { format, isToday, isYesterday, differenceInMinutes, differenceInHours } from 'date-fns';
import { PlayIcon, ArrowTrendingUpIcon, TrophyIcon, TagIcon, InformationCircleIcon, UserCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

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
const Tabs = ({ tabs, activeTab: controlledActiveTab, onTabChange }) => {
    const [internalActiveTab, setInternalActiveTab] = useState(0);
    const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
    
    const handleTabChange = (index) => {
        if (onTabChange) {
            onTabChange(index);
        } else {
            setInternalActiveTab(index);
        }
    };

    return (
        <div>
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map((tab, index) => (
                        <button
                            key={tab.name}
                            onClick={() => handleTabChange(index)}
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

import { FaBullseye } from 'react-icons/fa';

const KrOverviewSection = ({ keyResult }) => {
    const {
        progress_percent = 0,
        status = 'N/A',
        objective,
        assigned_user,
    } = keyResult;

    const ownerName = assigned_user?.full_name || 'N/A';
    const isMyKeyResult = window.location.pathname.includes('/my-objectives/key-result-details/');
    const parentObjectiveUrl = objective 
        ? (objective.level === "person" 
            ? `/my-objectives/details/${objective.objective_id}`
            : `/company-okrs/detail/${objective.objective_id}`)
        : '#';

    const circumference = 2 * Math.PI * 20; // Radius is 20

    return (
        <div>
            {objective && (
                <div className="mb-4">
                    <a href={parentObjectiveUrl} className="text-sm text-blue-600 hover:underline flex items-center">
                        <ArrowLeftIcon className="h-4 w-4 mr-1" />
                        <FaBullseye className="h-4 w-4 mr-2 text-indigo-600" />
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
                    <dt className="font-semibold w-32 flex items-center">
                        <InformationCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
                        Trạng thái:
                    </dt>
                    <dd>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(status)}`}>
                            {typeof status === 'string' ? status.replace('_', ' ').toUpperCase() : 'N/A'}
                        </span>
                    </dd>
                </div>
                <div className="flex items-center">
                    <dt className="font-semibold w-32 flex items-center">
                        <UserCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
                        Chủ sở hữu:
                    </dt>
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

    // Sort theo thời gian mới nhất trước
    const sortedCheckIns = checkIns.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return (
        <div className="space-y-3 max-h-60 overflow-y-auto p-1">
            {sortedCheckIns.map((ci, index) => {
                // Lấy progress_percent của check-in trước đó (theo thời gian, tức là check-in sau trong mảng đã sort mới nhất trước)
                const previousProgress = index < sortedCheckIns.length - 1 
                    ? sortedCheckIns[index + 1].progress_percent 
                    : null;
                const progressText = previousProgress !== null 
                    ? `${previousProgress}% → ${ci.progress_percent}%`
                    : `${ci.progress_percent}%`;
                
                return (
                    <div key={ci.check_in_id} className="text-sm p-2 border-l-4 border-gray-200">
                        <p><strong>{ci.user?.full_name || '...'}</strong> đã check-in cho KR <strong>"{ci.kr_title || 'KR'}"</strong></p>
                        <div className="text-xs text-gray-500 mt-1">
                            <span className="font-semibold">{progressText}</span>
                        </div>
                        <p className="text-gray-700 mt-1">"{ci.notes || 'Không có ghi chú'}"</p>
                        <div className="text-xs text-gray-500 mt-1">
                            <span>{format(new Date(ci.created_at), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- Helper function to format comment time ---
const formatCommentTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = differenceInMinutes(now, date);
    const diffHours = differenceInHours(now, date);
    
    // Vừa xong (< 1 phút)
    if (diffMinutes < 1) {
        return 'Vừa xong';
    }
    
    // Gần đây (< 1 giờ): "X phút trước"
    if (diffMinutes < 60) {
        return `${diffMinutes} phút trước`;
    }
    
    // Gần đây (< 24 giờ): "X giờ trước"
    if (diffHours < 24) {
        return `${diffHours} giờ trước`;
    }
    
    // Hôm nay: "Hôm nay HH:mm"
    if (isToday(date)) {
        return `Hôm nay ${format(date, 'HH:mm')}`;
    }
    
    // Hôm qua: "Hôm qua HH:mm"
    if (isYesterday(date)) {
        return `Hôm qua ${format(date, 'HH:mm')}`;
    }
    
    // Cũ hơn: chỉ ngày tháng năm
    return format(date, 'dd/MM/yyyy');
};

const KrCommentSection = ({ comments: initialComments, krId, onCommentPosted }) => {
    const [comments, setComments] = useState(initialComments || []);

    // Cập nhật comments khi initialComments thay đổi (từ parent)
    // Sort comments từ mới nhất đến cũ nhất
    useEffect(() => {
        const sortedComments = (initialComments || []).map(comment => ({
            ...comment,
            replies: (comment.replies || []).sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)
            )
        })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setComments(sortedComments);
    }, [initialComments]);

    const handleSubmitted = (newComment) => {
        if (newComment) {
            // Nếu là reply, thêm vào replies của parent
            if (newComment.parent_id) {
                setComments(prevComments => 
                    prevComments.map(comment => {
                        if (comment.id === newComment.parent_id) {
                            return {
                                ...comment,
                                replies: [...(comment.replies || []), newComment].sort((a, b) => 
                                    new Date(b.created_at) - new Date(a.created_at)
                                )
                            };
                        }
                        // Tìm trong replies
                        const updateReplies = (replies) => {
                            return replies.map(reply => {
                                if (reply.id === newComment.parent_id) {
                                    return {
                                        ...reply,
                                        replies: [...(reply.replies || []), newComment].sort((a, b) => 
                                            new Date(b.created_at) - new Date(a.created_at)
                                        )
                                    };
                                }
                                if (reply.replies && reply.replies.length > 0) {
                                    return {
                                        ...reply,
                                        replies: updateReplies(reply.replies)
                                    };
                                }
                                return reply;
                            });
                        };
                        if (comment.replies && comment.replies.length > 0) {
                            return {
                                ...comment,
                                replies: updateReplies(comment.replies)
                            };
                        }
                        return comment;
                    })
                );
            } else {
                // Nếu là comment mới, thêm vào đầu danh sách và sort lại
                setComments(prevComments => {
                    const updated = [newComment, ...prevComments];
                    return updated.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                });
            }
        }
        if (onCommentPosted) onCommentPosted();
    };

    return (
        <div className="mt-4">
            <h4 className="font-semibold text-md mb-2">Thảo luận (Comment)</h4>
            <div className="space-y-4">
                <CommentForm krId={krId} onSubmitted={handleSubmitted} />
                {comments?.length > 0 ? (
                    comments.map(comment => (
                        <Comment key={comment.id} comment={comment} krId={krId} onReplyPosted={handleSubmitted} />
                    ))
                ) : (
                    <p className="text-gray-500 text-sm text-center py-4">Chưa có bình luận nào.</p>
                )}
            </div>
        </div>
    );
};

const Comment = ({ comment, krId, depth = 0, onReplyPosted }) => {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const canReply = depth < 2; // Chỉ cho phép trả lời đến độ sâu 2 (0, 1, 2)
    
    const handleReplySubmitted = (newReply) => {
        setShowReplyForm(false);
        if (onReplyPosted) {
            onReplyPosted(newReply);
        }
    };
    
    return (
        <div className="py-3">
            <div className="flex items-start gap-3">
                <img 
                    src={comment.user?.avatar_url || '/images/default.png'} 
                    alt={comment.user?.full_name} 
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200 flex-shrink-0" 
                />
                <div className="flex-1 bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
                    <div className="font-semibold text-sm text-slate-900 mb-1">{comment.user?.full_name}</div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                </div>
            </div>
            <div className="ml-11 text-xs text-slate-500 mt-2 flex items-center gap-3">
                <span>{formatCommentTime(comment.created_at)}</span>
                {canReply && (
                    <button 
                        onClick={() => setShowReplyForm(!showReplyForm)} 
                        className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                    >
                        Trả lời
                    </button>
                )}
            </div>
            {showReplyForm && canReply && <CommentForm krId={krId} parentId={comment.id} onSubmitted={handleReplySubmitted} />}
            {comment.replies && comment.replies.length > 0 && (
                <div className="ml-11 mt-3 pl-4 border-l-2 border-slate-200">
                    {comment.replies.map(reply => (
                        <Comment 
                            key={reply.id} 
                            comment={reply} 
                            krId={krId} 
                            depth={depth + 1} 
                            onReplyPosted={onReplyPosted}
                        />
                    ))}
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

            const newComment = await response.json();
            setContent('');
            if (onSubmitted) onSubmitted(newComment);
        } catch (error) {
            setErrors({ form: 'Could not submit your comment. Please try again.' });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <form onSubmit={submit} className={`mt-2 ${parentId ? 'ml-8' : ''}`}>
            <div className="relative">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm text-sm 
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                               transition-all duration-200 resize-y
                               placeholder:text-slate-400 text-slate-700
                               bg-white hover:border-slate-400"
                    placeholder={parentId ? "Viết trả lời..." : "Viết bình luận..."}
                    rows={parentId ? 2 : 3}
                ></textarea>
            </div>
            {errors.content && <p className="text-red-500 text-xs mt-1 ml-1">{errors.content[0]}</p>}
            {errors.form && <p className="text-red-500 text-xs mt-1 ml-1">{errors.form}</p>}
            <div className="flex justify-end mt-3">
                <button 
                    type="submit" 
                    disabled={processing || !content.trim()} 
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold 
                               hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed 
                               transition-all duration-200 shadow-sm hover:shadow-md
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    {processing ? 'Đang gửi...' : 'Gửi'}
                </button>
            </div>
        </form>
    );
};

const KrHistoryAndInteractionSection = ({ keyResult, onCommentPosted }) => {
    return (
        <div>
            <div className="mb-6">
                <h4 className="font-semibold text-md mb-2">Lịch sử Check-in</h4>
                <KrCheckInHistory checkIns={keyResult.check_ins} />
            </div>
            
            <KrCommentSection comments={keyResult.comments} krId={keyResult.kr_id} onCommentPosted={onCommentPosted} />
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
    const [activeTabIndex, setActiveTabIndex] = useState(0);

    // Map tab names to indices
    const tabMap = {
        'details': 0,
        'history': 1
    };

    const getTabIndexFromUrl = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        return tabParam && tabMap[tabParam] !== undefined ? tabMap[tabParam] : 0;
    };

    const updateUrlForTab = (tabIndex) => {
        const tabNames = ['details', 'history'];
        const tabName = tabNames[tabIndex] || 'details';
        const url = new URL(window.location);
        url.searchParams.set('tab', tabName);
        window.history.pushState({}, '', url);
    };

    const handleTabChange = (newTabIndex) => {
        setActiveTabIndex(newTabIndex);
        updateUrlForTab(newTabIndex);
    };

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

        // Kiểm tra xem URL có phải là my-objectives không
        const isMyKeyResult = window.location.pathname.includes('/my-objectives/key-result-details/');
        const apiUrl = isMyKeyResult
            ? `/api/my-objectives/key-result-details/${krId}?_t=${new Date().getTime()}`
            : `/api/company-okrs/detail/kr/${krId}?_t=${new Date().getTime()}`;

        try {
            setLoading(true);
            const response = await fetch(apiUrl, {
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
        
        // Check query parameter để tự động mở tab tương ứng
        const tabIndex = getTabIndexFromUrl();
        setActiveTabIndex(tabIndex);
    }, [window.location.pathname, window.location.search]);

    if (loading) return <div className="p-8 text-center">Đang tải dữ liệu Key Result...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Lỗi: {error}</div>;
    if (!keyResult) return <div className="p-8 text-center">Không tìm thấy Key Result.</div>;
    
    const handleCommentPosted = () => {
        // Không cần reload vì comment đã được cập nhật realtime
        // Chỉ cần để callback này để tương thích với component
    };

    const krTabs = [
        { name: 'Chi tiết', content: <KrDetailsSection keyResult={keyResult} /> },
        { name: 'Lịch sử & Tương tác', content: <KrHistoryAndInteractionSection keyResult={keyResult} onCommentPosted={handleCommentPosted} /> },
    ];

    // Xác định trang quay lại dựa trên URL hiện tại
    const getBackUrl = () => {
        const isMyKeyResult = window.location.pathname.includes('/my-objectives/key-result-details/');
        return isMyKeyResult ? '/my-objectives' : '/company-okrs';
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <a 
                            href={getBackUrl()}
                            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="font-medium">Quay lại</span>
                        </a>
                    </div>
                    <p className="text-sm text-gray-500">Key Result Detail</p>
                    <h1 className="text-2xl font-bold text-gray-800">{keyResult.kr_title}</h1>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md">
                   <Tabs tabs={krTabs} activeTab={activeTabIndex} onTabChange={handleTabChange} />
                </div>
            </div>
        </div>
    );
};

export default KeyResultDetailPage;
