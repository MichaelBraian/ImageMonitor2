import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2 } from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import AddPatientModal from './AddPatientModal';
import PatientDetails from './PatientDetails';
import type { Patient } from '../types';
import toast from 'react-hot-toast';
import { useTouchFeedback } from '../hooks/useTouchFeedback';
import { useNavigate } from 'react-router-dom';

const PatientCard: React.FC<{
  patient: Patient;
  isSelected: boolean;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (e: React.MouseEvent) => void;
  onClick: () => void;
  fileCount: number;
}> = ({ patient, isSelected, onSelect, onDelete, onClick, fileCount }) => {
  const { touchProps } = useTouchFeedback({
    activeClass: 'bg-gray-100 dark:bg-gray-700'
  });

  return (
    <div
      key={patient.id}
      {...touchProps}
      className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${touchProps.className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            onClick={e => e.stopPropagation()}
            className="mr-3 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <div className="text-sm font-medium text-gray-900 dark:text-white">{patient.name}</div>
        </div>
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-900 dark:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="ml-8 text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <div>Added: {new Date(patient.createdAt).toLocaleDateString()}</div>
        <div>Files: {fileCount}</div>
      </div>
    </div>
  );
};

const DeleteSelectedButton: React.FC<{ count: number; onClick: () => void }> = ({ count, onClick }) => {
  const { touchProps } = useTouchFeedback({
    activeClass: 'bg-red-700'
  });

  return (
    <button
      {...touchProps}
      onClick={onClick}
      className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors w-full sm:w-auto"
    >
      <Trash2 className="w-4 h-4 mr-2" />
      Delete Selected ({count})
    </button>
  );
};

const AddPatientButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const { touchProps } = useTouchFeedback({
    activeClass: 'bg-blue-700'
  });

  return (
    <button
      {...touchProps}
      onClick={onClick}
      className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
    >
      <Plus className="w-4 h-4 mr-2" />
      Add Patient
    </button>
  );
};

const PatientList: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadPatients();
    }
  }, [user]);

  const loadPatients = async () => {
    try {
      const q = query(
        collection(db, 'patients'),
        where('dentistId', '==', user?.uid)
      );
      
      const snapshot = await getDocs(q);
      const patientData = snapshot.docs.map(doc => ({
        ...(doc.data() as Patient),
        id: doc.id,
      }));
      
      setPatients(patientData);
      
      // Load file counts for each patient
      const counts: Record<string, number> = {};
      await Promise.all(
        patientData.map(async (patient) => {
          const filesQuery = query(
            collection(db, 'files'),
            where('patientId', '==', patient.id)
          );
          const filesSnapshot = await getDocs(filesQuery);
          counts[patient.id] = filesSnapshot.size;
        })
      );
      setFileCounts(counts);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientAdded = (newPatient: Patient) => {
    setPatients(prev => [...prev, newPatient]);
    setFileCounts(prev => ({ ...prev, [newPatient.id]: 0 }));
    setSelectedPatient(newPatient);
  };

  const handleDeletePatient = async (patientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this patient? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'patients', patientId));
      
      const filesQuery = query(
        collection(db, 'files'),
        where('patientId', '==', patientId)
      );
      const filesSnapshot = await getDocs(filesQuery);
      const batch = writeBatch(db);
      filesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      setPatients(prev => prev.filter(p => p.id !== patientId));
      setFileCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[patientId];
        return newCounts;
      });
      
      toast.success('Patient deleted successfully');
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast.error('Failed to delete patient');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedPatients.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedPatients.size} patient(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const batch = writeBatch(db);
      
      selectedPatients.forEach(patientId => {
        batch.delete(doc(db, 'patients', patientId));
      });

      const filesQuery = query(
        collection(db, 'files'),
        where('patientId', 'in', Array.from(selectedPatients))
      );
      const filesSnapshot = await getDocs(filesQuery);
      filesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      setPatients(prev => prev.filter(p => !selectedPatients.has(p.id)));
      setFileCounts(prev => {
        const newCounts = { ...prev };
        selectedPatients.forEach(id => delete newCounts[id]);
        return newCounts;
      });
      setSelectedPatients(new Set());
      
      toast.success('Selected patients deleted successfully');
    } catch (error) {
      console.error('Error deleting patients:', error);
      toast.error('Failed to delete patients');
    }
  };

  const togglePatientSelection = (patientId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const newSelected = new Set(selectedPatients);
    if (e.target.checked) {
      newSelected.add(patientId);
    } else {
      newSelected.delete(patientId);
    }
    setSelectedPatients(newSelected);
  };

  const toggleAllPatients = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPatients(new Set(filteredPatients.map(p => p.id)));
    } else {
      setSelectedPatients(new Set());
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePatientClick = (patient: Patient) => {
    navigate(`/patients/${patient.id}`);
  };

  if (selectedPatient) {
    return (
      <PatientDetails
        patient={selectedPatient}
        onBack={() => setSelectedPatient(null)}
      />
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors">
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-2">
            {selectedPatients.size > 0 && (
              <DeleteSelectedButton 
                count={selectedPatients.size} 
                onClick={handleDeleteSelected} 
              />
            )}
            <AddPatientButton 
              onClick={() => setIsAddModalOpen(true)} 
            />
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading patients...</div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No patients found matching your search' : 'No patients added yet'}
          </div>
        ) : (
          <div className="min-w-full">
            <div className="hidden sm:block">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedPatients.size === filteredPatients.length}
                        onChange={toggleAllPatients}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-600 dark:checked:bg-blue-600"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Added</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Files</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      onClick={() => handlePatientClick(patient)}
                    >
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedPatients.has(patient.id)}
                          onChange={(e) => togglePatientSelection(patient.id, e)}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-600 dark:checked:bg-blue-600"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{patient.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(patient.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {fileCounts[patient.id] || 0} files
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={(e) => handleDeletePatient(patient.id, e)}
                          className="text-red-600 hover:text-red-900 dark:text-red-500 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden">
              {filteredPatients.map((patient) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  isSelected={selectedPatients.has(patient.id)}
                  onSelect={(e) => togglePatientSelection(patient.id, e)}
                  onDelete={(e) => handleDeletePatient(patient.id, e)}
                  onClick={() => handlePatientClick(patient)}
                  fileCount={fileCounts[patient.id] || 0}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <AddPatientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onPatientAdded={handlePatientAdded}
      />
    </div>
  );
};

const PatientListWrapper: React.FC = () => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  if (selectedPatient) {
    return (
      <PatientDetails
        patient={selectedPatient}
        onBack={() => setSelectedPatient(null)}
      />
    );
  }

  return <PatientList onSelectPatient={setSelectedPatient} />;
};

export default PatientListWrapper;