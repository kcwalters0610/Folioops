import React, { useState, useEffect } from 'react';
import { Clock, Camera, CheckCircle, AlertCircle, Calendar, User, MapPin, FileText, Play, Pause, Square } from 'lucide-react';
import { supabase, WorkOrder, Customer } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface WorkOrderWithCustomer extends WorkOrder {
  customers: Customer;
}

// Utility functions moved to top level for shared access
const getStatusColor = (status: string) => {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-800';
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const TechJobList: React.FC = () => {
  const { profile } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrderWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<WorkOrderWithCustomer | null>(null);

  useEffect(() => {
    if (profile?.id) {
      fetchMyJobs();
    }
  }, [profile]);

  const fetchMyJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          customers (*)
        `)
        .eq('assigned_to', profile?.id)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setWorkOrders(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = workOrders.filter(job => {
    if (statusFilter === 'all') return true;
    return job.status === statusFilter;
  });

  const handleJobClick = (job: WorkOrderWithCustomer) => {
    setSelectedJob(job);
    setShowJobModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-primary">My Jobs</h1>
          <p className="text-text-secondary mt-1">Manage your assigned work orders</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="all">All Jobs</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Job Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredJobs.map((job) => (
          <div 
            key={job.id} 
            className="card p-6 cursor-pointer hover:shadow-folioops-hover transition-all duration-200"
            onClick={() => handleJobClick(job)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-primary">
                    {job.wo_number || 'No WO#'}
                  </h3>
                  <span className="text-sm text-text-secondary">•</span>
                  <span className="text-sm text-text-secondary">{job.title}</span>
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                    {job.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(job.priority)}`}>
                    {job.priority.toUpperCase()} PRIORITY
                  </span>
                </div>
              </div>
              <div className="text-right">
                {job.status === 'in_progress' && (
                  <div className="flex items-center space-x-1 text-yellow-600">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Active</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-text-primary">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {job.customers.first_name} {job.customers.last_name}
                </span>
              </div>

              {job.scheduled_date && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    {format(new Date(job.scheduled_date), 'MMM dd, yyyy h:mm a')}
                  </span>
                </div>
              )}

              {job.customers.address && (
                <div className="flex items-start space-x-3 text-text-primary">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span className="text-sm">
                    {job.customers.address}
                    {job.customers.city &&`, ${job.customers.city}`}
                    {job.customers.state && `, ${job.customers.state}`}
                  </span>
                </div>
              )}
            </div>

            {job.description && (
              <div className="mt-4 p-3 bg-gray-50 rounded-folioops">
                <p className="text-sm text-text-secondary">{job.description}</p>
              </div>
            )}

            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-text-secondary">
                {job.estimated_hours && `Est: ${job.estimated_hours}h`}
                {job.actual_hours && ` | Actual: ${job.actual_hours}h`}
              </div>
              <div className="text-sm font-medium text-primary">
                Click to manage →
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-primary">No jobs found</h3>
          <p className="mt-2 text-sm text-text-secondary">
            {statusFilter !== 'all' 
              ? `No ${statusFilter.replace('_', ' ')} jobs at the moment.`
              : 'No jobs assigned to you at the moment.'
            }
          </p>
        </div>
      )}

      {showJobModal && selectedJob && (
        <JobManagementModal
          job={selectedJob}
          onClose={() => {
            setShowJobModal(false);
            setSelectedJob(null);
          }}
          onUpdate={() => {
            fetchMyJobs();
            setShowJobModal(false);
            setSelectedJob(null);
          }}
        />
      )}
    </div>
  );
};

// Job Management Modal Component
interface JobManagementModalProps {
  job: WorkOrderWithCustomer;
  onClose: () => void;
  onUpdate: () => void;
}

const JobManagementModal: React.FC<JobManagementModalProps> = ({ job, onClose, onUpdate }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  const [formData, setFormData] = useState({
    status: job.status,
    actual_hours: job.actual_hours || 0,
    notes: job.notes || '',
    resolution: '',
  });

  const [photoData, setPhotoData] = useState({
    caption: '',
    file: null as File | null,
  });

  useEffect(() => {
    fetchJobPhotos();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const fetchJobPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('work_order_photos')
        .select('*')
        .eq('work_order_id', job.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
    }
  };

  const handleStatusUpdate = async () => {
    setLoading(true);
    try {
      const updateData: any = {
        status: formData.status,
        actual_hours: Number(formData.actual_hours),
        notes: formData.notes,
      };

      if (formData.status === 'completed') {
        updateData.completed_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', job.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error updating job:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoData.file) return;

    setLoading(true);
    try {
      // Upload file to Supabase Storage
      const fileExt = photoData.file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${profile?.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('work-order-photos')
        .upload(filePath, photoData.file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('work-order-photos')
        .getPublicUrl(filePath);

      // Insert record into work_order_photos table
      const { error: dbError } = await supabase
        .from('work_order_photos')
        .insert({
          work_order_id: job.id,
          company_id: profile?.company_id,
          photo_url: publicUrl,
          caption: photoData.caption,
          uploaded_by: profile?.id,
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }
      
      setPhotoData({ caption: '', file: null });
      await fetchJobPhotos();
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    setIsTimerRunning(true);
    if (formData.status === 'scheduled') {
      setFormData({ ...formData, status: 'in_progress' });
    }
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    const additionalHours = currentTime / 3600;
    setFormData({ 
      ...formData, 
      actual_hours: Number(formData.actual_hours) + additionalHours 
    });
    setCurrentTime(0);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const tabs = [
    { id: 'details', label: 'Job Details', icon: FileText },
    { id: 'timer', label: 'Time Tracking', icon: Clock },
    { id: 'photos', label: 'Photos', icon: Camera },
    { id: 'resolution', label: 'Resolution', icon: CheckCircle },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-folioops-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-h2 text-primary">{job.wo_number || 'No WO#'}</h2>
              <p className="text-text-secondary">{job.title}</p>
              <p className="text-sm text-text-muted">
                {job.customers.first_name} {job.customers.last_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4">Job Information</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">WO Number:</span>
                      <span className="ml-2 text-sm font-mono">{job.wo_number || 'Not assigned'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Priority:</span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getPriorityColor(job.priority)}`}>
                        {job.priority.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Scheduled:</span>
                      <span className="ml-2 text-sm">
                        {job.scheduled_date ? format(new Date(job.scheduled_date), 'MMM dd, yyyy h:mm a') : 'Not scheduled'}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Estimated Hours:</span>
                      <span className="ml-2 text-sm">{job.estimated_hours || 'Not specified'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4">Customer Details</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Email:</span>
                      <span className="ml-2 text-sm">{job.customers.email || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Phone:</span>
                      <span className="ml-2 text-sm">{job.customers.phone || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Address:</span>
                      <span className="ml-2 text-sm">
                        {job.customers.address && `${job.customers.address}, ${job.customers.city}, ${job.customers.state}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {job.description && (
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4">Description</h3>
                  <p className="text-text-secondary bg-gray-50 p-4 rounded-folioops">{job.description}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timer' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-primary mb-4">Time Tracking</h3>
                <div className="bg-gray-50 rounded-folioops-lg p-8 mb-6">
                  <div className="text-6xl font-mono font-bold text-primary mb-4">
                    {formatTime(currentTime)}
                  </div>
                  <div className="flex justify-center space-x-4">
                    {!isTimerRunning ? (
                      <button
                        onClick={startTimer}
                        className="btn-primary flex items-center space-x-2"
                      >
                        <Play className="h-4 w-4" />
                        <span>Start Work</span>
                      </button>
                    ) : (
                      <button
                        onClick={stopTimer}
                        className="btn-secondary flex items-center space-x-2"
                      >
                        <Square className="h-4 w-4" />
                        <span>Stop Work</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Total Hours Worked
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={formData.actual_hours}
                  onChange={(e) => setFormData({ ...formData, actual_hours: Number(e.target.value) })}
                  className="input-field"
                />
              </div>
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Job Photos</h3>
                
                {/* Photo Upload */}
                <div className="bg-gray-50 rounded-folioops p-4 mb-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Add Photo
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPhotoData({ ...photoData, file: e.target.files?.[0] || null })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Caption
                      </label>
                      <input
                        type="text"
                        value={photoData.caption}
                        onChange={(e) => setPhotoData({ ...photoData, caption: e.target.value })}
                        className="input-field"
                        placeholder="Describe this photo..."
                      />
                    </div>
                    <button
                      onClick={handlePhotoUpload}
                      disabled={!photoData.file || loading}
                      className="btn-primary disabled:opacity-50"
                    >
                      {loading ? 'Uploading...' : 'Upload Photo'}
                    </button>
                  </div>
                </div>

                {/* Photo Gallery */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="bg-white border rounded-folioops overflow-hidden">
                      <img
                        src={photo.photo_url}
                        alt={photo.caption}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-3">
                        <p className="text-sm text-text-secondary">{photo.caption}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(photo.created_at), 'MMM dd, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {photos.length === 0 && (
                  <div className="text-center py-8 text-text-secondary">
                    No photos uploaded yet
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'resolution' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Job Status & Resolution</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Job Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="input-field"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Hours Worked
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      value={formData.actual_hours}
                      onChange={(e) => setFormData({ ...formData, actual_hours: Number(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Work Notes
                  </label>
                  <textarea
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input-field"
                    placeholder="Add notes about the work performed..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Resolution Summary
                  </label>
                  <textarea
                    rows={4}
                    value={formData.resolution}
                    onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                    className="input-field"
                    placeholder="Describe how the issue was resolved..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={onClose}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStatusUpdate}
                    disabled={loading}
                    className="btn-primary disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Job'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechJobList;