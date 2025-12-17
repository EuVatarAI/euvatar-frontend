import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const AvatarSettings = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to unified edit page
    navigate(`/avatar/${id}?tab=edit`, { replace: true });
  }, [id, navigate]);

  return null;
};

export default AvatarSettings;
