import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import VideoUploader from '../components/VideoUploader';
import AdvancedVideoEditor from '../components/AdvancedVideoEditor';
import { createPreviewClips } from '../utils/ffmpegHelper';
import { adminApi, AdminUser, AdminTransaction, DashboardStats, CreateUserData, TrainingProgram, CreateProgramData, trainingProgramApi } from '../services/api';
import '../styles/AdvancedVideoEditor.css';
import '../styles/AdminDashboard.css';
import '../styles/VideoEditorContainer.css';

const AdminDashboard = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
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
      setError('Access denied. Admin privileges required.');
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
      setError('Email, password, and name are required');
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
        
        alert('User created successfully!');
      }
    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.response?.data?.error || 'Failed to create user');
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
      setVideoError('Please upload a video or select an existing video first!');
      return;
    }

    if (exercises.length === 0) {
      setVideoError('Please mark at least one exercise first!');
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
      setVideoError('Please upload a video or select an existing video.');
      return;
    }

    // Allow processing with either exercises or overlays
    if (exercises.length === 0 && overlays.length === 0) {
      setVideoError('Please add at least one exercise or overlay.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setVideoError('Authentication token not found. Please log in again.');
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
              alert('Video updated successfully with new exercises!');
            } catch (updateErr: any) {
              console.error('Error updating video:', updateErr);
              setVideoError('Video processed but update failed. Please try updating the program.');
            }
          }
        } else {
          setVideoError('Processing finished but server returned unexpected JSON.');
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
      setVideoError('Error connecting to server.');
    } finally {
      setIsProcessingVideo(false);
    }
  };

  const handleNextStep = () => {
    if (!newProgram.name || !newProgram.category) {
      setError('Name and category are required');
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
      setError('Name and category are required');
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
          setError(uploadErr.response?.data?.error || 'Failed to upload image');
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
            setError('Program created but video attachment failed. You can attach it later.');
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
        
        alert('Program created successfully!');
      }
    } catch (err: any) {
      console.error('Error creating program:', err);
      setError(err.response?.data?.error || 'Failed to create program');
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

  const formatCurrency = (amount: number, currency: string = 'usd') => {
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
        setError('Failed to load program details');
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
      setError(err.response?.data?.error || 'Failed to load program');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProgram = async (programId: number) => {
    if (!confirm('Are you sure you want to delete this program? This will also delete all associated videos. This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await adminApi.deleteProgram(programId);
      
      if (response.data.success) {
        await loadDashboardData();
        alert('Program deleted successfully!');
      }
    } catch (err: any) {
      console.error('Error deleting program:', err);
      setError(err.response?.data?.error || 'Failed to delete program');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgram = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!editingProgramId) {
      setError('No program selected for editing');
      return;
    }
    
    if (!newProgram.name || !newProgram.category) {
      setError('Name and category are required');
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
          setError(uploadErr.response?.data?.error || 'Failed to upload image');
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
        
        alert('Program updated successfully!');
      }
    } catch (err: any) {
      console.error('Error updating program:', err);
      setError(err.response?.data?.error || 'Failed to update program');
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
          {error || 'Access denied. Admin privileges required.'}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-dashboard-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <div className="admin-dashboard-content">
        <h1>Admin Dashboard</h1>
        
        {error && <div className="error-message">{error}</div>}

        {programStep !== 'upload' && (
          <>
            <div className="dashboard-tabs">
          <button
            className={activeTab === 'stats' ? 'active' : ''}
            onClick={() => setActiveTab('stats')}
          >
            Statistics
          </button>
          <button
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            Users ({users.length})
          </button>
          <button
            className={activeTab === 'transactions' ? 'active' : ''}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions ({transactions.length})
          </button>
          <button
            className={activeTab === 'programs' ? 'active' : ''}
            onClick={() => setActiveTab('programs')}
          >
            Programs ({programs.length})
          </button>
          <button
            className={activeTab === 'add-user' ? 'active' : ''}
            onClick={() => setActiveTab('add-user')}
          >
            Add User
          </button>
          <button
            className={activeTab === 'add-program' ? 'active' : ''}
            onClick={() => {
              setActiveTab('add-program');
              setProgramStep('details');
            }}
          >
            Add Program
          </button>
        </div>

        <div className="dashboard-content">
          {activeTab === 'stats' && stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Users</h3>
                <p className="stat-value">{stats.totalUsers}</p>
              </div>
              <div className="stat-card">
                <h3>Total Transactions</h3>
                <p className="stat-value">{stats.totalTransactions}</p>
              </div>
              <div className="stat-card">
                <h3>Total Revenue</h3>
                <p className="stat-value">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="stat-card">
                <h3>Recent Transactions (30 days)</h3>
                <p className="stat-value">{stats.recentTransactions}</p>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Payments</th>
                    <th>Programs</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.phone || 'N/A'}</td>
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
                <p className="empty-message">No users found</p>
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>User Name</th>
                    <th>User Email</th>
                    <th>Item Name</th>
                    <th>Item Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
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
                <p className="empty-message">No transactions found</p>
              )}
            </div>
          )}

          {activeTab === 'programs' && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Price</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Image URL</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((program) => (
                    <tr key={program.id}>
                      <td>{program.id}</td>
                      <td>{program.name}</td>
                      <td>{program.category}</td>
                      <td>{program.description || 'N/A'}</td>
                      <td>{program.price ? formatCurrency(program.price) : 'Free'}</td>
                      <td>{program.startDate ? formatDate(program.startDate) : 'N/A'}</td>
                      <td>{program.endDate ? formatDate(program.endDate) : 'N/A'}</td>
                      <td>
                        {program.imageUrl ? (
                          <a href={program.imageUrl} target="_blank" rel="noopener noreferrer" className="link">
                            View Image
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td>{formatDate(program.createdAt)}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleEditProgram(program.id)}
                            className="btn-edit"
                            title="Edit Program"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProgram(program.id)}
                            className="btn-delete"
                            title="Delete Program"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {programs.length === 0 && (
                <p className="empty-message">No programs found</p>
              )}
            </div>
          )}

          {activeTab === 'add-user' && (
            <div className="add-user-form-container">
              <h2>Create New User</h2>
              <form onSubmit={handleCreateUser} className="add-user-form">
                <div className="form-group">
                  <label htmlFor="name">Name *</label>
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
                  <label htmlFor="email">Email *</label>
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
                  <label htmlFor="password">Password *</label>
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
                  <label htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    disabled={creatingUser}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="role">Role</label>
                  <select
                    id="role"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    disabled={creatingUser}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="btn-submit"
                >
                  {creatingUser ? 'Creating...' : 'Create User'}
                </button>
              </form>
            </div>
          )}

          {(activeTab === 'add-program' || activeTab === 'edit-program') && (
            <div className="add-user-form-container">
              <h2>{editingProgramId ? 'Edit Training Program' : 'Create New Training Program'}</h2>
              
              {/* Step indicator */}
              <div className="step-indicator">
                <div className={`step ${programStep === 'details' ? 'active' : programStep === 'upload' ? 'completed' : ''}`}>
                  <span className="step-number">1</span>
                  <span className="step-label">Program Details</span>
                </div>
                <div className="step-connector"></div>
                <div className={`step ${programStep === 'upload' ? 'active' : ''}`}>
                  <span className="step-number">2</span>
                  <span className="step-label">Upload Video</span>
                </div>
              </div>

              {programStep === 'details' && (
                <form onSubmit={(e) => { e.preventDefault(); if (editingProgramId) handleUpdateProgram(e); else handleNextStep(); }} className="add-user-form">
                <div className="form-group">
                  <label htmlFor="programName">Name *</label>
                  <input
                    id="programName"
                    type="text"
                    value={newProgram.name}
                    onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                    required
                    disabled={creatingProgram}
                    placeholder="e.g., Fat Burn Program"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="category">Category *</label>
                  <input
                    id="category"
                    type="text"
                    value={newProgram.category}
                    onChange={(e) => setNewProgram({ ...newProgram, category: e.target.value })}
                    required
                    disabled={creatingProgram}
                    placeholder="e.g., Weight Loss, Muscle Growth"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={newProgram.description}
                    onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                    disabled={creatingProgram}
                    rows={4}
                    placeholder="Program description..."
                    className="form-textarea"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="imageFile">Program Image</label>
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
                        Remove
                      </button>
                    </div>
                  )}
                  <p className="form-hint">Upload an image from your computer, or enter a URL below</p>
                </div>
                <div className="form-group">
                  <label htmlFor="imageUrl">Image URL (Alternative)</label>
                  <input
                    id="imageUrl"
                    type="url"
                    value={newProgram.imageUrl}
                    onChange={(e) => setNewProgram({ ...newProgram, imageUrl: e.target.value })}
                    disabled={creatingProgram || uploadingImage || !!selectedImage}
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="form-hint">Only used if no image is uploaded above</p>
                </div>
                <div className="form-group">
                  <label htmlFor="price">Price</label>
                  <input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newProgram.price || ''}
                    onChange={(e) => setNewProgram({ ...newProgram, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                    disabled={creatingProgram || uploadingImage}
                    placeholder="49.99"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="startDate">Start Date</label>
                  <input
                    id="startDate"
                    type="date"
                    value={newProgram.startDate || ''}
                    onChange={(e) => setNewProgram({ ...newProgram, startDate: e.target.value })}
                    disabled={creatingProgram || uploadingImage}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endDate">End Date</label>
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
                      Next: Manage Videos
                    </button>
                    <button
                      type="submit"
                      disabled={creatingProgram || uploadingImage || (newProgram.startDate && newProgram.endDate && new Date(newProgram.endDate) <= new Date(newProgram.startDate))}
                      className="btn-secondary"
                    >
                      {creatingProgram ? 'Updating...' : 'Update Program'}
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
                    Next: Add Video
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
                Back to Details
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;

