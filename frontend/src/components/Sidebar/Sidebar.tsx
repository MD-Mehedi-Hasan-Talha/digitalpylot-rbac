'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import PermissionGate from '../PermissionGate';
import styles from './sidebar.module.css';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊', permission: 'page:dashboard' },
  { name: 'Users', href: '/users', icon: '👥', permission: 'page:users' },
  { name: 'Leads', href: '/leads', icon: '🎯', permission: 'page:leads' },
  { name: 'Tasks', href: '/tasks', icon: '📝', permission: 'page:tasks' },
  { name: 'Reports', href: '/reports', icon: '📈', permission: 'page:reports' },
  { name: 'Audit Log', href: '/audit-log', icon: '📜', permission: 'page:audit_log' },
  { name: 'Settings', href: '/settings', icon: '⚙️', permission: 'page:settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className={styles.sidebar}>
      {/* Top Header / Logo Area */}
      <div className={styles.topArea}>
        <div className={styles.overlayBrand}>
          <div className={styles.logoBox}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="6" fill="var(--primary)"/>
              <circle cx="12" cy="12" r="5" fill="white" fillOpacity="0.3"/>
            </svg>
          </div>
          <span className={styles.brandName}>Overlay</span>
          <button className={styles.collapseBtn}>
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        </div>

        {/* Workspace Switcher */}
        <div className={styles.workspaceSwitcher}>
          <div className={styles.wsAvatar}>W</div>
          <div className={styles.wsInfo}>
            <span className={styles.wsName}>{user?.name}'s workspace</span>
            <span className={styles.wsId}>#WID12446875</span>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 10l5 5 5-5"/></svg>
        </div>
      </div>

      <div className={styles.scrollArea}>
        <nav className={styles.navSection}>
          <PermissionGate permission="page:dashboard">
            <Link href="/dashboard" className={`${styles.navItem} ${pathname === '/dashboard' ? styles.active : ''}`}>
              <span className={styles.navIcon}>📊</span>
              <span className={styles.navText}>Dashboard</span>
            </Link>
          </PermissionGate>
          <PermissionGate permission="page:leads">
            <Link href="/leads" className={`${styles.navItem} ${pathname === '/leads' ? styles.active : ''}`}>
              <span className={styles.navIcon}>🎯</span>
              <span className={styles.navText}>Leads</span>
            </Link>
          </PermissionGate>
          
          <div className={styles.navGroup}>
            <div className={`${styles.navItem} ${styles.hasSub}`}>
               <span className={styles.navIcon}>📝</span>
               <span className={styles.navText}>Tasks</span>
               <svg className={styles.chevron} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
            </div>
            <div className={styles.subNav}>
               <a className={styles.subItem}>Assignments</a>
               <a className={styles.subItem}>Calendar</a>
               <a className={styles.subItem}>Reminders</a>
            </div>
          </div>

          <div className={`${styles.navItem} ${styles.hasSub}`}>
             <span className={styles.navIcon}>📈</span>
             <span className={styles.navText}>Reports</span>
             <svg className={styles.chevron} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
          </div>
        </nav>

        <div className={styles.sectionLabel}>Users</div>
        <nav className={styles.navSection}>
          <PermissionGate permission="page:users">
            <Link href="/users" className={`${styles.navItem} ${pathname.startsWith('/users') ? styles.active : ''}`}>
              <span className={styles.navIcon}>👥</span>
              <span className={styles.navText}>Users</span>
            </Link>
          </PermissionGate>
          <PermissionGate permission="page:audit_log">
            <Link href="/audit-log" className={`${styles.navItem} ${pathname === '/audit-log' ? styles.active : ''}`}>
              <span className={styles.navIcon}>📜</span>
              <span className={styles.navText}>Audit Log</span>
            </Link>
          </PermissionGate>
        </nav>

        <div className={styles.sectionLabel}>Other</div>
        <nav className={styles.navSection}>
          <a className={styles.navItem}>
             <span className={styles.navIcon}>⚙️</span>
             <span className={styles.navText}>Configuration</span>
          </a>
          <a className={styles.navItem}>
             <span className={styles.navIcon}>📄</span>
             <span className={styles.navText}>Invoice</span>
          </a>
        </nav>
      </div>

      <div className={styles.sidebarFooter}>
        <a className={styles.navItem}>
           <span className={styles.navIcon}>❓</span>
           <span className={styles.navText}>Help center</span>
        </a>
        <a className={styles.navItem} onClick={logout}>
           <span className={styles.navIcon}>🚪</span>
           <span className={styles.navText}>Settings / Logout</span>
        </a>
      </div>
    </aside>
  );
}
