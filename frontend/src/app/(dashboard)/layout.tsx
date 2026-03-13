'use client';

import Sidebar from '@/components/Sidebar/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import styles from './dashboard-layout.module.css';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading DigitalPylot...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <main className={styles.content}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button className={styles.backBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m0-7l-7 7 7 7"/></svg>
            </button>
            <h1 className={styles.pageTitle}>{pathname.split('/').pop()?.replace(/^\w/, (c: string) => c.toUpperCase()) || 'Dashboard'}</h1>
          </div>

          <div className={styles.headerCenter}>
            <div className={styles.searchBox}>
              <span className={styles.searchIcon}>🔍</span>
              <input type="text" placeholder="Search" />
              <span className={styles.kbd}>⌘K</span>
            </div>
          </div>

          <div className={styles.headerRight}>
            <button className={styles.notificationBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            </button>
            <div className={styles.categorySwitcher}>
               <span className={styles.catLabel}>Category</span>
               <span className={styles.catValue}>Client unit</span>
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            <div className={styles.userAvatar}>
               {user?.name.charAt(0)}
            </div>
          </div>
        </header>
        <div className={styles.innerContent}>
          {children}
        </div>
      </main>
    </div>
  );
}
