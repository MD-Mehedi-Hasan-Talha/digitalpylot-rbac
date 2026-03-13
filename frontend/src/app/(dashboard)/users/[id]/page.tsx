'use client';

import PermissionGate from '@/components/PermissionGate';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { use, useEffect, useState } from 'react';
import styles from './user-detail.module.css';

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user: currentUser, hasPermission } = useAuth();
  const [targetUser, setTargetUser] = useState<any>(null);
  const [resolvedPermissions, setResolvedPermissions] = useState<string[]>([]);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, resolvedRes, allPermsRes]: any = await Promise.all([
          api.get(`/users/${id}`),
          api.get(`/permissions/users/${id}`),
          api.get('/permissions')
        ]);
        
        setTargetUser(userRes.data);
        setResolvedPermissions(resolvedRes.data);
        setAllPermissions(allPermsRes.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleTogglePermission = async (atom: string, isGranted: boolean) => {
    setIsUpdating(true);
    try {
      if (isGranted) {
        await api.delete(`/permissions/users/${id}/${atom}`);
      } else {
        await api.post(`/permissions/users/${id}`, { atom });
      }
      
      // Refresh resolved permissions
      const res: any = await api.get(`/permissions/users/${id}`);
      setResolvedPermissions(res.data);
    } catch (err: any) {
      alert(err.message || 'Failed to update permission');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    setIsUpdating(true);
    try {
      await api.patch(`/users/${id}/status`, { status });
      setTargetUser({ ...targetUser, status });
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className={styles.loading}>Loading profile...</div>;
  if (!targetUser) return <div className={styles.error}>User not found.</div>;

  const canManage = hasPermission('action:manage_permissions');
  const isHigherRole = currentUser && (currentUser.level > targetUser.role.level || currentUser.id === targetUser.id);

  return (
    <div className={styles.container}>
      <div className={styles.profileHeader}>
        <div className={styles.avatarLarge}>{targetUser.name.charAt(0)}</div>
        <div className={styles.profileInfo}>
          <h1 className={styles.userName}>{targetUser.name}</h1>
          <p className={styles.userMeta}>{targetUser.email} • {targetUser.role.name} Level {targetUser.role.level}</p>
        </div>
        <div className={styles.headerActions}>
          <PermissionGate permission="action:suspend_user">
            {targetUser.status === 'active' ? (
              <button 
                onClick={() => handleUpdateStatus('suspended')}
                className={styles.suspendBtn}
                disabled={isUpdating || !isHigherRole}
              >
                Suspend Account
              </button>
            ) : (
              <button 
                onClick={() => handleUpdateStatus('active')}
                className={styles.activateBtn}
                disabled={isUpdating || !isHigherRole}
              >
                Activate Account
              </button>
            )}
          </PermissionGate>
        </div>
      </div>

      <div className={styles.sections}>
        <div className={`${styles.permSection} card`}>
          <div className={styles.sectionHeader}>
            <h3>Permission Explorer</h3>
            <p>Resolved permissions including role defaults and individual overrides.</p>
          </div>
          
          <div className={styles.permCategories}>
            {['page', 'action'].map(cat => (
              <div key={cat} className={styles.category}>
                <h4 className={styles.catTitle}>{cat}s</h4>
                <div className={styles.permList}>
                  {allPermissions.filter(p => p.category === cat).map(perm => {
                    const isGranted = resolvedPermissions.includes(perm.atom);
                    const canToggle = canManage && isHigherRole && (currentUser.permissions.includes(perm.atom) || currentUser.role === 'admin');
                    
                    return (
                      <div key={perm.id} className={`${styles.permItem} ${isGranted ? styles.isGranted : ''}`}>
                        <div className={styles.permText}>
                          <span className={styles.permLabel}>{perm.label}</span>
                          <code className={styles.permAtom}>{perm.atom}</code>
                        </div>
                        <label className={styles.switch}>
                          <input 
                            type="checkbox" 
                            checked={isGranted} 
                            disabled={!canToggle || isUpdating}
                            onChange={() => handleTogglePermission(perm.atom, isGranted)}
                          />
                          <span className={styles.slider}></span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${styles.sideSection} card`}>
           <h3 className={styles.sideTitle}>Role Defaults</h3>
           <p className={styles.sideDesc}>Automatically granted by the <strong>{targetUser.role.name}</strong> role.</p>
           <div className={styles.placeholderList}>
              <div className={styles.dotItem}>System access granted</div>
              <div className={styles.dotItem}>Profile management granted</div>
              <div className={styles.dotItem}>Default portal access</div>
           </div>
        </div>
      </div>
    </div>
  );
}
