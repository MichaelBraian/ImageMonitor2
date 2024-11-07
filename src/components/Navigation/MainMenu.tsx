import { useNavigate } from 'react-router-dom';

function MainMenu() {
    const navigate = useNavigate();

    const handlePatientsClick = () => {
        navigate('/patients');
    };

    return (
        <button 
            onClick={handlePatientsClick}
            className="flex items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100 group"
        >
            <span className="material-symbols-outlined">groups</span>
            <span className="ml-3">Patients</span>
        </button>
    );
} 