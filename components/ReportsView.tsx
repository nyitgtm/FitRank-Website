'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const reportsRef = collection(db, 'reports');
            // Default sort by timestamp desc
            const q = query(reportsRef, orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q);

            const reportsDataPromises = snapshot.docs.map(async (docSnapshot) => {
                const data = docSnapshot.data();
                const report = {
                    id: docSnapshot.id,
                    ...data
                } as Report;

                // Fetch reporter info
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

    const handleStatusUpdate = async (reportId: string, newStatus: 'pending' | 'working' | 'fixed') => {
        setUpdatingId(reportId);
        try {
            const reportRef = doc(db, 'reports', reportId);
            await updateDoc(reportRef, { status: newStatus });

            // Update local state
            setReports(prev => prev.map(r =>
                r.id === reportId ? { ...r, status: newStatus } : r
            ));
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc'); // Default to desc for new field (usually better for timestamp)
        }
    };

    const sortedReports = [...reports].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
            case 'timestamp':
                // Handle Firestore Timestamp or Date objects
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
        // Handle Firestore Timestamp
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
                        return (
                            <div
                                key={report.id}
                                className={`grid grid-cols-12 gap-4 px-6 py-4 ${isEven ? 'bg-white' : 'bg-[#f5f5f7]'
                                    } hover:bg-[#e8e8ed] transition-colors items-center`}
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
                                    <div className="text-[10px] text-[#86868b] font-mono truncate" title={report.reporterID}>
                                        {report.reporterID?.substring(0, 8)}...
                                    </div>
                                </div>

                                {/* Reason */}
                                <div className="col-span-2 text-[14px] text-[#1d1d1f]">
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
                                <div className="col-span-2 flex gap-2">
                                    {updatingId === report.id ? (
                                        <span className="text-[12px] text-[#86868b]">Updating...</span>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleStatusUpdate(report.id, 'pending')}
                                                disabled={report.status === 'pending'}
                                                className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${report.status === 'pending' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                title="Mark as Pending"
                                            >
                                                ⏳
                                            </button>
                                            <button
                                                onClick={() => handleStatusUpdate(report.id, 'working')}
                                                disabled={report.status === 'working'}
                                                className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${report.status === 'working' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                title="Mark as Working"
                                            >
                                                🚧
                                            </button>
                                            <button
                                                onClick={() => handleStatusUpdate(report.id, 'fixed')}
                                                disabled={report.status === 'fixed'}
                                                className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${report.status === 'fixed' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                title="Mark as Fixed"
                                            >
                                                ✅
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
