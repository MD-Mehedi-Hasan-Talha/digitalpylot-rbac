'use client';

import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('List');

  const tasks = [
    { id: 1, title: 'Call about proposal', client: 'Bluestone', priority: 'Urgent', date: '18th Jun', due: '20th Jun', service: 'Visa Processing', tags: ['Check later'], status: 'Ongoing' },
    { id: 2, title: 'Send onboarding docs', client: 'Tech Ltd.', priority: 'High', date: '17th Jun', due: '26th Jun', service: 'Legal Advisory', tags: ['Personal'], status: 'On hold' },
    { id: 3, title: 'Follow up with Mira', client: 'Omar Rahman', priority: 'Low', date: '17th Jun', due: '5th Jul', service: 'Compliance', tags: ['Check later'], status: 'Done' },
    { id: 4, title: 'Prepare pitch deck', client: 'Jabed Ali', priority: 'Medium', date: '14th Jun', due: '8th Aug', service: 'Visa Processing', tags: ['Personal'], status: 'Not started' },
  ];

  return (
    <div className={styles.container}>
      {/* Top Controls Area */}
      <div className={styles.controlsArea}>
        <div className={styles.searchTable}>
          <span>🔍</span>
          <input type="text" placeholder="Search table" />
        </div>
        
        <div className={styles.viewTabs}>
          {['List', 'Kanban', 'Calendar'].map(tab => (
            <button 
              key={tab} 
              className={`${styles.tabBtn} ${activeView === tab ? styles.tabActive : ''}`}
              onClick={() => setActiveView(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className={styles.actionButtons}>
          <button className={styles.addBtn}>
            <span>+ Add</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 10l5 5 5-5"/></svg>
          </button>
        </div>
      </div>

      {/* Group Header */}
      <div className={styles.groupHeader}>
        <div className={styles.groupTitle}>
           <div className={styles.blueBox}></div>
           <span>Group 1</span>
        </div>
        <div className={styles.groupActions}>
           <span className={styles.dateInfo}>📅 19/8/25</span>
           <button className={styles.iconBtn}>⇅ Sort</button>
           <button className={styles.iconBtn}>∇ Filter</button>
        </div>
      </div>

      {/* Main Table */}
      <div className={`${styles.tableWrapper} card`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}><input type="checkbox" /></th>
              <th>Title</th>
              <th>Client name</th>
              <th>Priority</th>
              <th>Date</th>
              <th>Due date</th>
              <th>Service type</th>
              <th>Tags</th>
              <th>Assigned to</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td><input type="checkbox" /></td>
                <td className={styles.titleCell}>{task.title}</td>
                <td>{task.client}</td>
                <td>
                  <span className={`${styles.priority} ${styles[task.priority.toLowerCase()]}`}>
                    🚩 {task.priority}
                  </span>
                </td>
                <td>{task.date}</td>
                <td>{task.due}</td>
                <td>{task.service}</td>
                <td>
                  {task.tags.map(tag => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </td>
                <td>
                   <div className={styles.avatars}>
                      <div className={styles.miniAvatar}>👤</div>
                      <div className={styles.miniAvatar}>👤</div>
                   </div>
                </td>
                <td>
                  <span className={`${styles.status} ${styles[task.status.replace(' ', '').toLowerCase()]}`}>
                    • {task.status}
                  </span>
                </td>
                <td><button className={styles.moreBtn}>•••</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
