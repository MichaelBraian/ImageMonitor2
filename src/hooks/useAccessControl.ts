import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface AccessPermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  isAdmin: boolean;
}

export function useAccessControl(patientId?: string) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<AccessPermissions>({
    canRead: false,
    canWrite: false,
    canDelete: false,
    isAdmin: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkPermissions();
    }
  }, [user, patientId]);

  const checkPermissions = async () => {
    if (!user) {
      setPermissions({
        canRead: false,
        canWrite: false,
        canDelete: false,
        isAdmin: false,
      });
      setLoading(false);
      return;
    }

    try {
      // Check if user is admin
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const isAdmin = userDoc.exists() && userDoc.data().role === 'admin';

      if (isAdmin) {
        setPermissions({
          canRead: true,
          canWrite: true,
          canDelete: true,
          isAdmin: true,
        });
        setLoading(false);
        return;
      }

      // For specific patient access
      if (patientId) {
        const patientDoc = await getDoc(doc(db, 'patients', patientId));
        
        if (!patientDoc.exists()) {
          throw new Error('Patient not found');
        }

        const patientData = patientDoc.data();
        const hasDentistAccess = patientData.dentistId === user.uid;

        setPermissions({
          canRead: hasDentistAccess,
          canWrite: hasDentistAccess,
          canDelete: hasDentistAccess,
          isAdmin: false,
        });
      } else {
        // Default permissions for authenticated dentist
        setPermissions({
          canRead: true,
          canWrite: true,
          canDelete: true,
          isAdmin: false,
        });
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      toast.error('Failed to verify access permissions');
      setPermissions({
        canRead: false,
        canWrite: false,
        canDelete: false,
        isAdmin: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyAccess = async (requiredPermission: keyof AccessPermissions): Promise<boolean> => {
    if (loading) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return verifyAccess(requiredPermission);
    }

    if (!permissions[requiredPermission]) {
      toast.error('You do not have permission to perform this action');
      return false;
    }

    return true;
  };

  return {
    permissions,
    loading,
    verifyAccess,
  };
}