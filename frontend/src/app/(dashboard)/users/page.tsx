'use client';

import { api } from '@/lib/api';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './users.module.css';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response: any = await api.get('/users');
        setUsers(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch users');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (isLoading) return <div className={styles.loading}>Loading users...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.pageTitle}>User Management</h2>
          <p className={styles.pageSubtitle}>View and manage access levels for your team.</p>
        </div>
        <button className="btn-primary">+ Add New User</button>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      <div className={`${styles.tableWrapper} card`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className={styles.userCell}>
                  <div className={styles.avatar}>{user.name.charAt(0)}</div>
                  <div className={styles.userInfo}>
                    <span className={styles.name}>{user.name}</span>
                    <span className={styles.email}>{user.email}</span>
                  </div>
                </td>
                <td>
                  <span className={`${styles.badge} ${styles[user.role.name.toLowerCase()]}`}>
                    {user.role.name}
                  </span>
                </td>
                <td>
                  <span className={`${styles.statusBadge} ${styles[user.status.toLowerCase()]}`}>
                    {user.status}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <Link href={`/users/${user.id}`} className={styles.manageBtn}>
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
