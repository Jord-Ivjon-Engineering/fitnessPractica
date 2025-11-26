import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import VideoUploader from '../components/VideoUploader';
import AdvancedVideoEditor from '../components/AdvancedVideoEditor';
import { createPreviewClips } from '../utils/ffmpegHelper';
import { adminApi, AdminUser, AdminTransaction, DashboardStats, CreateUserData, TrainingProgram, CreateProgramData, trainingProgramApi } from '../services/api';
import '../styles/AdvancedVideoEditor.css';
import '../styles/AdminDashboard.css';
import '../styles/VideoEditorContainer.css';

const AdminDashboard = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'transactions' | 'add-user' | 'programs' | 'add-program' | 'edit-program'>('stats');
  const [editingProgramId, setEditingProgramId] = useState<number | null>(null);
  const [existingVideos, setExistingVideos] = useState<Array<{ id: number; programId: number; url: string; title: string | null; createdAt: string }>>([]);
  const [selectedExistingVideo, setSelectedExistingVideo] = useState<{ id: number; url: string; title: string | null } | null>(null);
  
  // Add user form state
  const [newUser, setNewUser] = useState<CreateUserData>({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'member',
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // Add program form state
  const [newProgram, setNewProgram] = useState<CreateProgramData>({
    name: '',
    category: '',
    description: '',
    imageUrl: '',
    videoUrl: '',
    price: undefined,
    startDate: '',
    endDate: '',
  });
  const [creatingProgram, setCreatingProgram] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Video editor state for program creation
  const [programStep, setProgramStep] = useState<'details' | 'upload'>('details');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoData, setVideoData] = useState<{ file: File; url: string; name: string; size: number } | null>(null);
  const [exercises, setExercises] = useState<Array<{ id: number; name: string; start: number; end: number }>>([]);
  const [previews, setPreviews] = useState<Array<{ exerciseId: number; url: string; showAt: number }>>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string>('');
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [overlays, setOverlays] = useState<Overlay[]>([]);

  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) {
      return;
    }

    // Check if user is authenticated and is admin
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'admin') {
      setError(t('admin.accessDenied'));
      setTimeout(() => {
        navigate('/');
      }, 2000);
      return;
    }

    loadDashboardData();
  }, [user, isAuthenticated, isLoading, navigate]);

  // Handle return from video editor - go to upload step
  useEffect(() => {
    if (location.state?.returnToUpload && location.state?.programId) {
      const programId = location.state.programId;
      setEditingProgramId(programId);
      setActiveTab('edit-program');
      setProgramStep('upload');
      
      // Fetch existing videos for this program
      const fetchVideos = async () => {
        try {
          const videosResponse = await trainingProgramApi.getVideos(programId);
          if (videosResponse.data.success) {
            setExistingVideos(videosResponse.data.data || []);
          }
        } catch (err) {
          console.error('Error fetching videos:', err);
        }
      };
      fetchVideos();
      
      // Clear location state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [usersRes, transactionsRes, statsRes, programsRes] = await Promise.all([
        adminApi.getAllUsers(),
        adminApi.getAllTransactions(),
        adminApi.getDashboardStats(),
        adminApi.getAllPrograms(),
      ]);

      if (usersRes.data.success) {
        setUsers(usersRes.data.data);
      }
      if (transactionsRes.data.success) {
        setTransactions(transactionsRes.data.data);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      if (programsRes.data.success) {
        setPrograms(programsRes.data.data);
      }
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUser.email || !newUser.password || !newUser.name) {
      setError(t('admin.emailPasswordNameRequired'));
      return;
    }

    try {
      setCreatingUser(true);
      setError('');
      
      const response = await adminApi.createUser(newUser);
      
      if (response.data.success) {
        // Reset form
        setNewUser({
          email: '',
          password: '',
          name: '',
          phone: '',
          role: 'member',
        });
        
        // Reload users list
        await loadDashboardData();
        
        // Switch to users tab
        setActiveTab('users');
        
        alert(t('admin.userCreated'));
      }
    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.response?.data?.error || t('admin.failedToCreateUser'));
    } finally {
      setCreatingUser(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Video editor functions
  const handleVideoLoad = (videoData: { file: File; url: string; name: string; size: number }) => {
    // Store video data locally first
    setVideoData(videoData);
    setVideoFile(videoData.file);
    setExercises([]);
    setPreviews([]);
    setShowPreview(false);
    setVideoError('');
    setSelectedExistingVideo(null);
    
    // Navigate to editor page with blob URL (blob URLs work fine for video display)
    navigate('/admin/program-video-editor', {
      state: {
        url: videoData.url, // Blob URL from URL.createObjectURL
        name: videoData.name,
        isExisting: false,
        programId: editingProgramId,
        fileSize: videoData.size,
        fileName: videoData.name
      }
    });
  };

  const handleExercisesUpdate = (updatedExercises: Array<{ id: number; name: string; start: number; end: number }>) => {
    setExercises(updatedExercises);
  };

  const generatePreview = async () => {
    if (!videoData && !selectedExistingVideo) {
      setVideoError(t('admin.uploadVideoOrSelect'));
      return;
    }

    if (exercises.length === 0) {
      setVideoError(t('admin.markExercise'));
      return;
    }

    setVideoError('');

    // Show preview immediately with overlays (preview clips are optional)
    setShowPreview(true);
    setPreviews([]); // Clear old previews

    // Try to generate preview clips if we have a video file
    if (videoData && videoData.file) {
      setIsProcessingVideo(true);
      try {
        const previewClips = await createPreviewClips(videoData.file, exercises);
        setPreviews(previewClips);
        console.log('Preview clips generated:', previewClips);
        setVideoError(''); // Clear any previous errors
      } catch (error: any) {
        console.error('Error generating preview clips:', error);
        // Show a non-blocking warning - preview will work without clips
        const errorMessage = error?.message || 'Preview clips could not be generated';
        setVideoError(`Note: ${errorMessage}. Timer overlays will still work, but preview clips during breaks may not be available.`);
        // Continue anyway - overlays will work
        setPreviews([]);
      } finally {
        setIsProcessingVideo(false);
      }
    } else if (selectedExistingVideo) {
      // For existing videos, we can't generate preview clips, but we can still show overlays
      setShowPreview(true);
    }
  };

  const processVideo = async () => {
    if (!videoFile && !selectedExistingVideo) {
      setVideoError(t('admin.uploadVideoOrSelect'));
      return;
    }

    // Allow processing with either exercises or overlays
    if (exercises.length === 0 && overlays.length === 0) {
      setVideoError(t('admin.addExerciseOrOverlay'));
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setVideoError(t('admin.authTokenNotFound'));
      return;
    }

    // Convert exercises format for backend (start, duration instead of start, end)
    const backendExercises = exercises.length > 0 ? exercises.map(ex => ({
      name: ex.name,
      start: ex.start,
      duration: ex.end - ex.start
    })) : [];

    const formData = new FormData();
    
    // If we have a selected existing video, send its URL instead of uploading
    if (selectedExistingVideo && !videoFile) {
      formData.append('videoUrl', selectedExistingVideo.url);
    } else if (videoFile) {
      formData.append('video', videoFile);
    }
    
    // Add exercises if any
    if (backendExercises.length > 0) {
      formData.append('exercises', JSON.stringify(backendExercises));
    }
    
    // Add overlays if any
    if (overlays.length > 0) {
      formData.append('overlays', JSON.stringify(overlays));
    }

    setIsProcessingVideo(true);
    setVideoError('');
    setProcessedVideoUrl('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const baseUrl = API_URL.replace('/api', '');
      const response = await fetch(`${baseUrl}/video/edit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let errMsg = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson && errJson.error) errMsg = `Error: ${errJson.error}`;
        } catch (e) {
          // ignore JSON parse error
        }
        setVideoError(errMsg);
        return;
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data && data.fileUrl) {
          // Store the relative URL path (like standalone editor does)
          // data.fileUrl is already like "/uploads/edited/edited_123.mp4"
          setProcessedVideoUrl(data.fileUrl);
          setVideoError('');
          
          // If we're updating an existing video, update it immediately
          if (selectedExistingVideo && editingProgramId) {
            try {
              await trainingProgramApi.updateVideo(editingProgramId, selectedExistingVideo.id, data.fileUrl);
              // Reload videos to show updated video
              const videosResponse = await trainingProgramApi.getVideos(editingProgramId);
              if (videosResponse.data.success) {
                setExistingVideos(videosResponse.data.data);
              }
              // Clear selection and reset form
              setSelectedExistingVideo(null);
              setExercises([]);
              setPreviews([]);
              setShowPreview(false);
              setVideoData(null);
              setVideoFile(null);
              setProcessedVideoUrl('');
              alert(t('admin.videoUpdated'));
            } catch (updateErr: any) {
              console.error('Error updating video:', updateErr);
              setVideoError(t('admin.videoProcessedUpdateFailed'));
            }
          }
        } else {
          setVideoError(t('admin.processingFinishedUnexpected'));
        }
      } else {
        // Server returned the file directly
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        // For blob URLs, we can't attach them - this case might need different handling
        setProcessedVideoUrl(url);
        setVideoError('');
      }
    } catch (error) {
      console.error(error);
      setVideoError(t('admin.errorConnecting'));
    } finally {
      setIsProcessingVideo(false);
    }
  };

  const handleNextStep = () => {
    if (!newProgram.name || !newProgram.category) {
      setError(t('admin.nameCategoryRequired'));
      return;
    }
    setProgramStep('upload');
    setError('');
  };

  const handleBackToDetails = () => {
    setProgramStep('details');
    setError('');
    // Optionally clear video data when going back
    // setVideoData(null);
    // setVideoFile(null);
    // setExercises([]);
  };

  const handleCreateProgram = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!newProgram.name || !newProgram.category) {
      setError(t('admin.nameCategoryRequired'));
      return;
    }

    try {
      setCreatingProgram(true);
      setError('');
      
      let imageUrl = newProgram.imageUrl;

      // Upload image if a file is selected
      if (selectedImage) {
        try {
          setUploadingImage(true);
          const uploadResponse = await adminApi.uploadProgramImage(selectedImage);
          
          if (uploadResponse.data.success) {
            // Use the uploaded image URL (it's already a full path from server)
            // The server returns /uploads/images/filename, which is served statically
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            // Remove /api from the base URL if present, since /uploads is at root level
            const baseUrl = API_BASE.replace('/api', '');
            imageUrl = `${baseUrl}${uploadResponse.data.data.imageUrl}`;
          }
        } catch (uploadErr: any) {
          console.error('Error uploading image:', uploadErr);
          setError(uploadErr.response?.data?.error || t('admin.failedToUploadImage'));
          setUploadingImage(false);
          setCreatingProgram(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      // Create program WITHOUT videoUrl (video will be attached separately)
      const response = await adminApi.createProgram({
        ...newProgram,
        imageUrl: imageUrl || undefined,
      });
      
      if (response.data.success) {
        const createdProgramId = response.data.data.id;
        
        // Attach video to program using program_videos table (like standalone editor)
        if (processedVideoUrl && processedVideoUrl.startsWith('/')) {
          // Only attach if we have a relative URL path (not blob URL)
          try {
            await trainingProgramApi.attachVideo(createdProgramId, processedVideoUrl);
          } catch (attachErr: any) {
            console.error('Error attaching video to program:', attachErr);
            // Don't fail the whole operation, just log the error
            setError(t('admin.programCreatedVideoFailed'));
          }
        }
        
        // Reset form
        setNewProgram({
          name: '',
          category: '',
          description: '',
          imageUrl: '',
          videoUrl: '',
          price: undefined,
          startDate: '',
          endDate: '',
        });
        setSelectedImage(null);
        setImagePreview(null);
        setVideoFile(null);
        setExercises([]);
        setExerciseName('');
        setStartTime('');
        setDuration('');
        setProcessedVideoUrl('');
        setProgramStep('details');
        
        // Reload programs list
        await loadDashboardData();
        
        // Switch to programs tab
        setActiveTab('programs');
        
        alert(t('admin.programCreated'));
      }
    } catch (err: any) {
      console.error('Error creating program:', err);
      setError(err.response?.data?.error || t('admin.failedToCreateProgram'));
    } finally {
      setCreatingProgram(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'all') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const handleEditProgram = async (programId: number) => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch program details
      const programResponse = await trainingProgramApi.getById(programId);
      if (!programResponse.data.success) {
        setError(t('admin.failedToLoadDetails'));
        return;
      }

      const program = programResponse.data.data;
      
      // Fetch existing videos
      const videosResponse = await trainingProgramApi.getVideos(programId);
      if (videosResponse.data.success) {
        setExistingVideos(videosResponse.data.data);
      }

      // Populate form with program data
      setNewProgram({
        name: program.name,
        category: program.category,
        description: program.description || '',
        imageUrl: program.imageUrl || '',
        videoUrl: '',
        price: program.price ? Number(program.price) : undefined,
        startDate: program.startDate ? new Date(program.startDate).toISOString().split('T')[0] : '',
        endDate: program.endDate ? new Date(program.endDate).toISOString().split('T')[0] : '',
      });

      setEditingProgramId(programId);
      setProgramStep('details');
      setActiveTab('edit-program');
    } catch (err: any) {
      console.error('Error loading program:', err);
      setError(err.response?.data?.error || t('admin.failedToLoadProgram'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProgram = async (programId: number) => {
    if (!confirm(t('admin.deleteConfirm'))) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await adminApi.deleteProgram(programId);
      
      if (response.data.success) {
        await loadDashboardData();
        alert(t('admin.programDeleted'));
      }
    } catch (err: any) {
      console.error('Error deleting program:', err);
      setError(err.response?.data?.error || t('admin.failedToDeleteProgram'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgram = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!editingProgramId) {
      setError(t('admin.noProgramSelected'));
      return;
    }
    
    if (!newProgram.name || !newProgram.category) {
      setError(t('admin.nameCategoryRequired'));
      return;
    }

    try {
      setCreatingProgram(true);
      setError('');
      
      let imageUrl = newProgram.imageUrl;

      // Upload image if a file is selected
      if (selectedImage) {
        try {
          setUploadingImage(true);
          const uploadResponse = await adminApi.uploadProgramImage(selectedImage);
          
          if (uploadResponse.data.success) {
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const baseUrl = API_BASE.replace('/api', '');
            imageUrl = `${baseUrl}${uploadResponse.data.data.imageUrl}`;
          }
        } catch (uploadErr: any) {
          console.error('Error uploading image:', uploadErr);
          setError(uploadErr.response?.data?.error || t('admin.failedToUploadImage'));
          setUploadingImage(false);
          setCreatingProgram(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      // Update program
      const response = await adminApi.updateProgram(editingProgramId, {
        ...newProgram,
        imageUrl: imageUrl || undefined,
      });
      
      if (response.data.success) {
        // Only attach new video if we have a processed video and it's NOT an existing video update
        // (existing videos are updated immediately after processing in processVideo function)
        if (processedVideoUrl && processedVideoUrl.startsWith('/') && !selectedExistingVideo) {
          try {
            // Attach new video
            await trainingProgramApi.attachVideo(editingProgramId, processedVideoUrl);
          } catch (attachErr: any) {
            console.error('Error attaching video to program:', attachErr);
            setError('Program updated but video attachment failed. You can attach it later.');
          }
        }

        // Reset form
        setNewProgram({
          name: '',
          category: '',
          description: '',
          imageUrl: '',
          videoUrl: '',
          price: undefined,
          startDate: '',
          endDate: '',
        });
        setSelectedImage(null);
        setImagePreview(null);
        setVideoFile(null);
        setExercises([]);
        setExerciseName('');
        setStartTime('');
        setDuration('');
        setProcessedVideoUrl('');
        setProgramStep('details');
        setEditingProgramId(null);
        setExistingVideos([]);
        
        // Reload programs list
        await loadDashboardData();
        
        // Switch to programs tab
        setActiveTab('programs');
        
        alert(t('admin.programUpdated'));
      }
    } catch (err: any) {
      console.error('Error updating program:', err);
      setError(err.response?.data?.error || t('admin.failedToUpdateProgram'));
    } finally {
      setCreatingProgram(false);
    }
  };

  // Show loading while auth is initializing
  if (isLoading) {
    return (
      <div className="admin-dashboard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // Don't render if not admin
  if (!isAuthenticated || !user || user.role !== 'admin') {
    return (
      <div className="admin-dashboard-container">
        <div className="error-message">
          {error || t('admin.accessDenied')}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-dashboard-container">
        <div className="loading">{t('admin.loading')}</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <div className="admin-dashboard-content">
        <h1>{t('admin.dashboard')}</h1>
        
        {error && <div className="error-message">{error}</div>}

        {programStep !== 'upload' && (
          <>
            <div className="dashboard-tabs">
          <button
            className={activeTab === 'stats' ? 'active' : ''}
            onClick={() => setActiveTab('stats')}
          >
            {t('admin.stats')}
          </button>
          <button
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            {t('admin.users')} ({users.length})
          </button>
          <button
            className={activeTab === 'transactions' ? 'active' : ''}
            onClick={() => setActiveTab('transactions')}
          >
            {t('admin.transactions')} ({transactions.length})
          </button>
          <button
            className={activeTab === 'programs' ? 'active' : ''}
            onClick={() => setActiveTab('programs')}
          >
            {t('admin.programs')} ({programs.length})
          </button>
          <button
            className={activeTab === 'add-user' ? 'active' : ''}
            onClick={() => setActiveTab('add-user')}
          >
            {t('admin.addUser')}
          </button>
          <button
            className={activeTab === 'add-program' ? 'active' : ''}
            onClick={() => {
              setActiveTab('add-program');
              setProgramStep('details');
            }}
          >
            {t('admin.addProgram')}
          </button>
        </div>

        <div className="dashboard-content">
          {activeTab === 'stats' && stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <h3>{t('admin.totalUsers')}</h3>
                <p className="stat-value">{stats.totalUsers}</p>
              </div>
              <div className="stat-card">
                <h3>{t('admin.totalTransactions')}</h3>
                <p className="stat-value">{stats.totalTransactions}</p>
              </div>
              <div className="stat-card">
                <h3>{t('admin.totalRevenue')}</h3>
                <p className="stat-value">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="stat-card">
                <h3>{t('admin.recentTransactions')}</h3>
                <p className="stat-value">{stats.recentTransactions}</p>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('admin.id')}</th>
                    <th>{t('admin.name')}</th>
                    <th>{t('admin.email')}</th>
                    <th>{t('admin.phone')}</th>
                    <th>{t('admin.role')}</th>
                    <th>{t('admin.payments')}</th>
                    <th>{t('admin.programs')}</th>
                    <th>{t('admin.created')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.phone || t('admin.na')}</td>
                      <td>
                        <span className={`role-badge ${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>{user._count.payments}</td>
                      <td>{user._count.programs}</td>
                      <td>{formatDate(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="empty-message">{t('admin.noUsers')}</p>
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('admin.id')}</th>
                    <th>{t('admin.userName')}</th>
                    <th>{t('admin.userEmail')}</th>
                    <th>{t('admin.itemName')}</th>
                    <th>{t('admin.itemType')}</th>
                    <th>{t('admin.amount')}</th>
                    <th>{t('admin.status')}</th>
                    <th>{t('admin.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{transaction.id}</td>
                      <td>{transaction.userName}</td>
                      <td>{transaction.userEmail}</td>
                      <td>{transaction.itemName}</td>
                      <td>{transaction.itemType}</td>
                      <td>{formatCurrency(transaction.amount, transaction.currency)}</td>
                      <td>
                        <span className={`status-badge ${transaction.status}`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td>{formatDate(transaction.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length === 0 && (
                <p className="empty-message">{t('admin.noTransactions')}</p>
              )}
            </div>
          )}

          {activeTab === 'programs' && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('admin.id')}</th>
                    <th>{t('admin.name')}</th>
                    <th>{t('admin.category')}</th>
                    <th>{t('admin.description')}</th>
                    <th>{t('admin.price')}</th>
                    <th>{t('admin.startDate')}</th>
                    <th>{t('admin.endDate')}</th>
                    <th>{t('admin.imageUrl')}</th>
                    <th>{t('admin.created')}</th>
                    <th>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((program) => (
                    <tr key={program.id}>
                      <td>{program.id}</td>
                      <td>{program.name}</td>
                      <td>{program.category}</td>
                      <td>{program.description || t('admin.na')}</td>
                      <td>{program.price ? formatCurrency(program.price) : t('admin.free')}</td>
                      <td>{program.startDate ? formatDate(program.startDate) : t('admin.na')}</td>
                      <td>{program.endDate ? formatDate(program.endDate) : t('admin.na')}</td>
                      <td>
                        {program.imageUrl ? (
                          <a href={program.imageUrl} target="_blank" rel="noopener noreferrer" className="link">
                            {t('admin.viewImage')}
                          </a>
                        ) : (
                          t('admin.na')
                        )}
                      </td>
                      <td>{formatDate(program.createdAt)}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleEditProgram(program.id)}
                            className="btn-edit"
                            title={t('admin.editProgram')}
                          >
                            {t('admin.edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteProgram(program.id)}
                            className="btn-delete"
                            title={t('admin.deleteProgram')}
                          >
                            {t('admin.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {programs.length === 0 && (
                <p className="empty-message">{t('admin.noPrograms')}</p>
              )}
            </div>
          )}

          {activeTab === 'add-user' && (
            <div className="add-user-form-container">
              <h2>{t('admin.createUserTitle')}</h2>
              <form onSubmit={handleCreateUser} className="add-user-form">
                <div className="form-group">
                  <label htmlFor="name">{t('admin.nameRequired')}</label>
                  <input
                    id="name"
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    required
                    disabled={creatingUser}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">{t('admin.emailRequired')}</label>
                  <input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                    disabled={creatingUser}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">{t('admin.passwordRequired')}</label>
                  <input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                    disabled={creatingUser}
                    minLength={6}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">{t('admin.phone')}</label>
                  <input
                    id="phone"
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    disabled={creatingUser}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="role">{t('admin.role')}</label>
                    <select
                    id="role"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    disabled={creatingUser}
                  >
                    <option value="member">{t('admin.member')}</option>
                    <option value="admin">{t('admin.admin')}</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="btn-submit"
                >
                  {creatingUser ? t('admin.creating') : t('admin.createUser')}
                </button>
              </form>
            </div>
          )}

          {(activeTab === 'add-program' || activeTab === 'edit-program') && (
            <div className="add-user-form-container">
              <h2>{editingProgramId ? t('admin.editProgramTitle') : t('admin.createProgramTitle')}</h2>
              
              {/* Step indicator */}
              <div className="step-indicator">
                <div className={`step ${programStep === 'details' ? 'active' : programStep === 'upload' ? 'completed' : ''}`}>
                  <span className="step-number">1</span>
                  <span className="step-label">Program Details</span>
                </div>
                <div className="step-connector"></div>
                <div className={`step ${programStep === 'upload' ? 'active' : ''}`}>
                  <span className="step-number">2</span>
                  <span className="step-label">{t('admin.uploadVideo')}</span>
                </div>
              </div>

              {programStep === 'details' && (
                <form onSubmit={(e) => { e.preventDefault(); if (editingProgramId) handleUpdateProgram(e); else handleNextStep(); }} className="add-user-form">
                <div className="form-group">
                  <label htmlFor="programName">{t('admin.programName')} *</label>
                  <input
                    id="programName"
                    type="text"
                    value={newProgram.name}
                    onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                    required
                    disabled={creatingProgram}
                    placeholder={t('admin.programNamePlaceholder')}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="category">{t('admin.programCategory')} *</label>
                  <input
                    id="category"
                    type="text"
                    value={newProgram.category}
                    onChange={(e) => setNewProgram({ ...newProgram, category: e.target.value })}
                    required
                    disabled={creatingProgram}
                    placeholder={t('admin.programCategoryPlaceholder')}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="description">{t('admin.programDescription')}</label>
                  <textarea
                    id="description"
                    value={newProgram.description}
                    onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                    disabled={creatingProgram}
                    rows={4}
                    placeholder={t('admin.programDescriptionPlaceholder')}
                    className="form-textarea"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="imageFile">{t('admin.programImage')}</label>
                  <input
                    id="imageFile"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    disabled={creatingProgram || uploadingImage}
                    className="file-input"
                  />
                  {imagePreview && (
                    <div className="image-preview-container">
                      <img src={imagePreview} alt="Preview" className="image-preview" />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                        className="remove-image-btn"
                        disabled={creatingProgram || uploadingImage}
                      >
                        {t('common.remove')}
                      </button>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="price">{t('admin.programPrice')}</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', color: '#999', pointerEvents: 'none' }}>ALL</span>
                    <input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newProgram.price || ''}
                      onChange={(e) => setNewProgram({ ...newProgram, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                      disabled={creatingProgram || uploadingImage}
                      placeholder={t('admin.programPricePlaceholder')}
                      style={{ paddingLeft: '50px' }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="startDate">{t('admin.programStartDate')}</label>
                  <input
                    id="startDate"
                    type="date"
                    value={newProgram.startDate || ''}
                    onChange={(e) => setNewProgram({ ...newProgram, startDate: e.target.value })}
                    disabled={creatingProgram || uploadingImage}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endDate">{t('admin.programEndDate')}</label>
                  <input
                    id="endDate"
                    type="date"
                    value={newProgram.endDate || ''}
                    onChange={(e) => setNewProgram({ ...newProgram, endDate: e.target.value })}
                    disabled={creatingProgram || uploadingImage}
                    min={newProgram.startDate || undefined}
                  />
                  {newProgram.startDate && newProgram.endDate && new Date(newProgram.endDate) <= new Date(newProgram.startDate) && (
                    <p className="form-error">End date must be after start date</p>
                  )}
                </div>
                {editingProgramId ? (
                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setProgramStep('upload');
                        setError('');
                      }}
                      disabled={creatingProgram || uploadingImage || (newProgram.startDate && newProgram.endDate && new Date(newProgram.endDate) <= new Date(newProgram.startDate))}
                      className="btn-submit"
                    >
                      {t('admin.next')}: {t('admin.uploadVideo')}
                    </button>
                    <button
                      type="submit"
                      disabled={creatingProgram || uploadingImage || (newProgram.startDate && newProgram.endDate && new Date(newProgram.endDate) <= new Date(newProgram.startDate))}
                      className="btn-secondary"
                    >
                      {creatingProgram ? t('admin.updating') : t('admin.updateProgram')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProgramId(null);
                        setExistingVideos([]);
                        setActiveTab('programs');
                        setNewProgram({
                          name: '',
                          category: '',
                          description: '',
                          imageUrl: '',
                          videoUrl: '',
                          price: undefined,
                          startDate: '',
                          endDate: '',
                        });
                        setSelectedImage(null);
                        setImagePreview(null);
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={creatingProgram || uploadingImage || (newProgram.startDate && newProgram.endDate && new Date(newProgram.endDate) <= new Date(newProgram.startDate))}
                    className="btn-submit"
                  >
                    {t('admin.next')}: {t('admin.uploadVideo')}
                  </button>
                )}
              </form>
              )}
            </div>
          )}
        </div>
        </>
        )}

        {/* Upload Screen - Separate from editor */}
        {programStep === 'upload' && (
          <div className="video-editor-container">
            {editingProgramId && existingVideos.length > 0 && (
              <div className="existing-videos-section">
                <h3>Existing Videos</h3>
                <div className="videos-list">
                  {existingVideos.map((video) => (
                    <div key={video.id} className={`video-item ${selectedExistingVideo?.id === video.id ? 'selected' : ''}`}>
                      <video 
                        controls 
                        src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}${video.url}`}
                        className="existing-video"
                      />
                      <div className="video-info">
                        <p><strong>Title:</strong> {video.title || 'Untitled'}</p>
                        <p><strong>Added:</strong> {formatDate(video.createdAt)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          // Navigate to editor page
                          navigate('/admin/program-video-editor', {
                            state: {
                              url: video.url,
                              name: video.title || 'Existing Video',
                              isExisting: true,
                              existingVideoId: video.id,
                              programId: editingProgramId
                            }
                          });
                        }}
                        className="btn-select-video"
                        disabled={isProcessingVideo}
                      >
                        Edit This Video
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!videoData && !selectedExistingVideo && (
              <div className="video-upload-section">
                <VideoUploader onVideoLoad={handleVideoLoad} />
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setProgramStep('details')}
                className="btn-secondary"
              >
                {t('admin.back')} {t('common.details')}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;

