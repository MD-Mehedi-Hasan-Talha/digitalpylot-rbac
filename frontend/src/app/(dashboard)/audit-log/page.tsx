'use client';

import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import styles from './audit.module.css';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response: any = await api.get(`/audit-logs?page=${page}&limit=15`);
        setLogs(response.data);
        setPagination(response.pagination);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch audit logs');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [page]);

  if (isLoading) return <div className={styles.loading}>Accessing system records...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.pageTitle}>System Audit Log</h2>
          <p className={styles.pageSubtitle}>Immutable record of all sensitive actions performed in the system.</p>
        </div>
      </header>

      {error ? (
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>🚫</div>
          <h3>Access Denied</h3>
          <p>{error}</p>
          <p className={styles.dim}>Only authorized administrators can view the full system audit trail.</p>
        </div>
      ) : (
        <>
          <div className={`${styles.logWrapper} card`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className={styles.timeCell}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className={styles.actorCell}>
                       <div className={styles.actorAvatar}>
                         {log.actor?.name.charAt(0) || 'S'}
                       </div>
                       <div className={styles.actorInfo}>
                         <strong>{log.actor?.name || 'System'}</strong>
                         <span>{log.actor?.email || 'system@internal'}</span>
                       </div>
                    </td>
                    <td>
                      <span className={`${styles.actionBadge} ${styles[log.action.split(':')[0].toLowerCase()] || styles.default}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <div className={styles.targetInfo}>
                        <span className={styles.type}>{log.targetType}</span>
                        <code className={styles.id}>#{log.targetId?.substring(0, 8)}</code>
                      </div>
                    </td>
                    <td>
                      {log.metadata ? (
                        <pre className={styles.json}>{JSON.stringify(log.metadata)}</pre>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button 
              disabled={page === 1} 
              onClick={() => setPage(page - 1)}
              className={styles.pageBtn}
            >
              Previous
            </button>
            <span className={styles.pageInfo}>Page {page} of {pagination?.totalPages || 1}</span>
            <button 
              disabled={page === pagination?.totalPages} 
              onClick={() => setPage(page + 1)}
              className={styles.pageBtn}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
