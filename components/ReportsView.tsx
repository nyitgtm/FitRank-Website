'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Report, User } from '@/lib/types';

type SortField = 'timestamp' | 'reason' | 'status' | 'type';
type SortDirection = 'asc' | 'desc';

interface ExtendedReport extends Report {
    reporterName?: string;
    reporterUsername?: string;
}

export default function ReportsView() {
    const [reports, setReports] = useState<ExtendedReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortField, setSortField] = useState<SortField>('timestamp');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // Expansion and Menu State
    const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
    const [activeMenuReportId, setActiveMenuReportId] = useState<string | null>(null);
    const [targetDetails, setTargetDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuReportId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const reportsRef = collection(db, 'reports');
            const q = query(reportsRef, orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q);

            const reportsDataPromises = snapshot.docs.map(async (docSnapshot) => {
                const data = docSnapshot.data();
                const report = {
                    id: docSnapshot.id,
                    ...data
                } as Report;

                let reporterName = 'Unknown';
                let reporterUsername = 'unknown';

                if (report.reporterID) {
                    try {
                        const userDocRef = doc(db, 'users', report.reporterID);
                        const userDocSnap = await getDoc(userDocRef);
                        if (userDocSnap.exists()) {
                            const userData = userDocSnap.data() as User;
                            reporterName = userData.name;
                            reporterUsername = userData.username;
                        }
                    } catch (err) {
                        console.error(`Error fetching reporter ${report.reporterID}:`, err);
                    }
                }

                return {
                    ...report,
                    reporterName,
                    reporterUsername
                } as ExtendedReport;
            });

            const reportsData = await Promise.all(reportsDataPromises);
            setReports(reportsData);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTargetDetails = async (report: ExtendedReport) => {
        setLoadingDetails(true);
        setTargetDetails(null);
        try {
            const collectionName = report.type === 'lift' ? 'workouts' : 'posts';
            const targetRef = doc(db, collectionName, report.targetID);
            const targetSnap = await getDoc(targetRef);

            if (targetSnap.exists()) {
                setTargetDetails({ id: targetSnap.id, ...targetSnap.data() });
            } else {
                setTargetDetails({ error: 'Content not found (may have been deleted)' });
            }
        } catch (error) {
            console.error('Error fetching target details:', error);
            setTargetDetails({ error: 'Failed to load details' });
        } finally {
            setLoadingDetails(false);
        }
    };

    const toggleExpand = (report: ExtendedReport) => {
        if (expandedReportId === report.id) {
            setExpandedReportId(null);
            setTargetDetails(null);
        } else {
            setExpandedReportId(report.id);
            fetchTargetDetails(report);
        }
    };

    const handleStatusUpdate = async (reportId: string, newStatus: 'pending' | 'working' | 'fixed') => {
        setUpdatingId(reportId);
        try {
            const reportRef = doc(db, 'reports', reportId);
            await updateDoc(reportRef, { status: newStatus });

            setReports(prev => prev.map(r =>
                r.id === reportId ? { ...r, status: newStatus } : r
            ));
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        } finally {
            setUpdatingId(null);
            setActiveMenuReportId(null);
        }
    };

    const handleDeleteTarget = async (report: ExtendedReport) => {
        const confirmMessage = `Are you sure you want to delete this ${report.type}? This cannot be undone.`;
        if (!confirm(confirmMessage)) return;

        setUpdatingId(report.id);
        try {
            const collectionName = report.type === 'lift' ? 'workouts' : 'posts';
            await deleteDoc(doc(db, collectionName, report.targetID));

            // Optionally mark report as fixed
            await handleStatusUpdate(report.id, 'fixed');

            alert(`${report.type === 'lift' ? 'Workout' : 'Post'} deleted successfully.`);
            if (expandedReportId === report.id) {
                setTargetDetails({ error: 'Content deleted' });
            }
        } catch (error) {
            console.error('Error deleting content:', error);
            alert('Failed to delete content');
        } finally {
            setUpdatingId(null);
            setActiveMenuReportId(null);
        }
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const sortedReports = [...reports].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
            case 'timestamp':
                aValue = a.timestamp?.seconds || 0;
                bValue = b.timestamp?.seconds || 0;
                break;
            case 'reason':
                aValue = a.reason.toLowerCase();
                bValue = b.reason.toLowerCase();
                break;
            case 'status':
                aValue = a.status;
                bValue = b.status;
                break;
            case 'type':
                aValue = a.type;
                bValue = b.type;
                break;
            default:
                return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) {
            return <span className="text-[#86868b]">↕</span>;
        }
        return sortDirection === 'asc' ? <span className="text-[#0071e3]">↑</span> : <span className="text-[#0071e3]">↓</span>;
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp.seconds * 1000);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">Reports</h2>
                <div className="text-[15px] text-[#86868b]">
                    {reports.length} {reports.length === 1 ? 'report' : 'reports'}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : reports.length === 0 ? (
                <div className="text-center py-20 text-[#86868b]">
                    <p className="text-[17px]">No reports found</p>
                </div>
            ) : (
                <div className="bg-white border border-[#d2d2d7] rounded-2xl overflow-visible">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-[#f5f5f7] border-b border-[#d2d2d7]">
                        <div className="col-span-3 text-left text-[14px] font-semibold text-[#1d1d1f]">
                            Report ID / Target
                        </div>
                        <button
                            onClick={() => handleSort('timestamp')}
                            className="col-span-2 text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
                        >
                            Timestamp <SortIcon field="timestamp" />
                        </button>
                        <div className="col-span-2 text-left text-[14px] font-semibold text-[#1d1d1f]">
                            Reporter
                        </div>
                        <button
                            onClick={() => handleSort('reason')}
                            className="col-span-2 text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
                        >
                            Reason <SortIcon field="reason" />
                        </button>
                        <button
                            onClick={() => handleSort('status')}
                            className="col-span-1 text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
                        >
                            Status <SortIcon field="status" />
                        </button>
                        <div className="col-span-2 text-left text-[14px] font-semibold text-[#1d1d1f]">
                            Actions
                        </div>
                    </div>

                    {/* Table Body */}
                    {sortedReports.map((report, index) => {
                        const isEven = index % 2 === 0;
                        const isExpanded = expandedReportId === report.id;
                        const isMenuOpen = activeMenuReportId === report.id;

                        return (
                            <div key={report.id} className="border-b border-[#d2d2d7] last:border-0">
                                <div
                                    onClick={() => toggleExpand(report)}
                                    className={`grid grid-cols-12 gap-4 px-6 py-4 ${isEven ? 'bg-white' : 'bg-[#f5f5f7]'
                                        } hover:bg-[#e8e8ed] transition-colors items-center cursor-pointer`}
                                >
                                    {/* ID / Target */}
                                    <div className="col-span-3">
                                        <div className="text-[13px] font-mono text-[#86868b] mb-1 truncate" title={report.id}>
                                            ID: {report.id}
                                        </div>
                                        <div className="text-[13px] text-[#1d1d1f]">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium mr-2 ${report.type === 'lift' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                                }`}>
                                                {report.type?.toUpperCase() || 'UNKNOWN'}
                                            </span>
                                            <span className="font-mono text-[12px] text-[#86868b]" title={report.targetID}>
                                                Target: {report.targetID?.substring(0, 8)}...
                                            </span>
                                        </div>
                                    </div>

                                    {/* Timestamp */}
                                    <div className="col-span-2 text-[14px] text-[#1d1d1f]">
                                        {formatDate(report.timestamp)}
                                    </div>

                                    {/* Reporter */}
                                    <div className="col-span-2">
                                        <div className="text-[14px] font-medium text-[#1d1d1f]">{report.reporterName}</div>
                                        <div className="text-[12px] text-[#86868b]">@{report.reporterUsername}</div>
                                    </div>

                                    {/* Reason */}
                                    <div className="col-span-2 text-[14px] text-[#1d1d1f] truncate">
                                        {report.reason}
                                    </div>

                                    {/* Status */}
                                    <div className="col-span-1">
                                        <span className={`px-2 py-1 rounded-full text-[12px] font-medium ${report.status === 'fixed' ? 'bg-green-100 text-green-800' :
                                                report.status === 'working' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                            }`}>
                                            {report.status?.toUpperCase() || 'PENDING'}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-2 relative" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuReportId(isMenuOpen ? null : report.id);
                                            }}
                                            className="px-3 py-1 text-[#1d1d1f] hover:bg-[#d2d2d7] rounded-lg transition-colors text-[20px] font-bold leading-none pb-3"
                                        >
                                            ...
                                        </button>

                                        {isMenuOpen && (
                                            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#d2d2d7] rounded-xl shadow-lg z-50 overflow-hidden">
                                                <div className="py-1">
                                                    <div className="px-4 py-2 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider">
                                                        Set Status
                                                    </div>
                                                    <button
                                                        onClick={() => handleStatusUpdate(report.id, 'pending')}
                                                        className="w-full text-left px-4 py-2 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2"
                                                    >
                                                        <span className="w-2 h-2 rounded-full bg-red-500"></span> Pending
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(report.id, 'working')}
                                                        className="w-full text-left px-4 py-2 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2"
                                                    >
                                                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span> Working
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(report.id, 'fixed')}
                                                        className="w-full text-left px-4 py-2 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center gap-2"
                                                    >
                                                        <span className="w-2 h-2 rounded-full bg-green-500"></span> Fixed
                                                    </button>

                                                    <div className="border-t border-[#d2d2d7] my-1"></div>

                                                    <button
                                                        onClick={() => handleDeleteTarget(report)}
                                                        className="w-full text-left px-4 py-2 text-[14px] text-[#ff3b30] hover:bg-[#fff0f0] font-medium"
                                                    >
                                                        Delete {report.type === 'lift' ? 'Workout' : 'Post'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className={`px-6 py-6 ${isEven ? 'bg-white' : 'bg-[#f5f5f7]'} border-t border-[#d2d2d7] shadow-inner`}>
                                        <div className="grid grid-cols-2 gap-8">
                                            {/* Report Details */}
                                            <div>
                                                <h3 className="text-[16px] font-semibold text-[#1d1d1f] mb-3">Report Details</h3>
                                                <div className="space-y-3">
                                                    <div>
                                                        <span className="text-[13px] text-[#86868b] block mb-1">Full Reason</span>
                                                        <p className="text-[15px] text-[#1d1d1f] bg-white/50 p-3 rounded-lg border border-[#d2d2d7]">
                                                            {report.reason}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[13px] text-[#86868b] block mb-1">Reporter ID</span>
                                                        <p className="text-[14px] font-mono text-[#1d1d1f]">{report.reporterID}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[13px] text-[#86868b] block mb-1">Target ID</span>
                                                        <p className="text-[14px] font-mono text-[#1d1d1f]">{report.targetID}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Target Content Details */}
                                            <div>
                                                <h3 className="text-[16px] font-semibold text-[#1d1d1f] mb-3">
                                                    Target Content ({report.type?.toUpperCase()})
                                                </h3>
                                                {loadingDetails ? (
                                                    <div className="flex items-center gap-2 text-[#86868b]">
                                                        <div className="w-4 h-4 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
                                                        Loading details...
                                                    </div>
                                                ) : targetDetails ? (
                                                    targetDetails.error ? (
                                                        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
                                                            {targetDetails.error}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4 bg-white p-4 rounded-xl border border-[#d2d2d7]">
                                                            {report.type === 'post' ? (
                                                                <>
                                                                    <div>
                                                                        <span className="text-[12px] text-[#86868b] uppercase tracking-wider font-semibold">Post Text</span>
                                                                        <p className="text-[15px] text-[#1d1d1f] mt-1">{targetDetails.text}</p>
                                                                    </div>
                                                                    {targetDetails.imageURL && (
                                                                        <div>
                                                                            <span className="text-[12px] text-[#86868b] uppercase tracking-wider font-semibold block mb-2">Image</span>
                                                                            <img
                                                                                src={targetDetails.imageURL}
                                                                                alt="Reported content"
                                                                                className="max-w-full h-auto rounded-lg border border-[#d2d2d7] max-h-64 object-contain"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    <div className="flex gap-4 text-[13px] text-[#86868b]">
                                                                        <span>Author: {targetDetails.authorName}</span>
                                                                        <span>Likes: {targetDetails.likeCount || 0}</span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div>
                                                                            <span className="text-[12px] text-[#86868b] uppercase tracking-wider font-semibold">Lift Type</span>
                                                                            <p className="text-[15px] text-[#1d1d1f] capitalize">{targetDetails.liftType}</p>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[12px] text-[#86868b] uppercase tracking-wider font-semibold">Weight</span>
                                                                            <p className="text-[15px] text-[#1d1d1f]">{targetDetails.weight} lbs</p>
                                                                        </div>
                                                                    </div>
                                                                    {targetDetails.videoUrl && (
                                                                        <div>
                                                                            <span className="text-[12px] text-[#86868b] uppercase tracking-wider font-semibold block mb-2">Video</span>
                                                                            <video
                                                                                src={targetDetails.videoUrl}
                                                                                controls
                                                                                className="w-full rounded-lg border border-[#d2d2d7] max-h-64"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    )
                                                ) : (
                                                    <p className="text-[#86868b]">No details available</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
